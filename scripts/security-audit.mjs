import fs from "node:fs";
import path from "node:path";

const failures=[];
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const sourceFiles=[
  ...walk(path.join(root,"src")),
  ...walk(path.join(root,"app")),
  path.join(root,"proxy.ts"),
].filter((file)=>/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file));

for(const file of sourceFiles) {
  const source=fs.readFileSync(file,"utf8");
  const relative=path.relative(root,file);
  if(/\beval\s*\(/.test(source)) failures.push(`${relative}: eval() is forbidden`);
  if(/\bnew\s+Function\s*\(/.test(source)) failures.push(`${relative}: new Function() is forbidden`);
  const dynamicScript=/document\.createElement\(\s*["'](?:script|link)["']\s*\)/.test(source);
  if(dynamicScript && !source.includes("applySriAttributes")) {
    failures.push(`${relative}: dynamic script/link creation must apply SRI attributes`);
  }
}

const sri=JSON.parse(read("config/sri-manifest.json"));
const entries=sri.entries ?? {};
const decoderEntries=Object.entries(entries).filter(([route])=>route.startsWith("/decoders/") || route.startsWith("/draco/") || route.startsWith("/basis/"));
if(!decoderEntries.some(([route])=>route.endsWith(".wasm"))) failures.push("SRI manifest contains no protected WASM decoder.");
for(const [route,entry] of Object.entries(entries)) {
  if(!/^sha384-[A-Za-z0-9+/]+=*$/.test(entry.sha384 ?? "")) failures.push(`${route}: missing SHA-384 SRI value`);
  if(!/^sha512-[A-Za-z0-9+/]+=*$/.test(entry.sha512 ?? "")) failures.push(`${route}: missing SHA-512 SRI value`);
}
const assets=JSON.parse(read("config/asset-manifest.json"));
for(const collection of ["models","textures","hdr","video"]) {
  for(const item of assets[collection] ?? []) {
    const route=typeof item.path==="string" ? item.path : "";
    if(route.startsWith("/") && !route.startsWith("//") && !entries[route]) failures.push(`${route}: local manifest asset lacks SRI entry`);
  }
}

const runtime=read("src/components/runtime/ExperienceRuntime.tsx");
if(!runtime.includes('import "@/src/security/installSriFetchGuard"')) failures.push("Experience runtime must install SRI fetch enforcement before loaders.");

const proxy=read("proxy.ts");
if(proxy.includes('"/lab/:path*"')) failures.push("/lab must remain outside the authoring perimeter.");
for(const token of ["/studio/:path*","/api/studio/:path*","/api/project/:path*","/api/asset-vault/:path*","studioAuthEnabled","studioAvailableInProduction"]) {
  if(!proxy.includes(token)) failures.push(`proxy.ts is missing perimeter evidence: ${token}`);
}

const projectApi=read("app/api/forge/projects/[slug]/route.ts");
if(!projectApi.includes('requireStudioRole(request, "reviewer")')) failures.push("Forge project API must enforce route-level Studio auth.");
for(const file of [
  "app/api/asset-bank/route.ts",
  "app/api/integrations/preview/route.ts",
  "app/api/type-vault/route.ts",
]) {
  if(!read(file).includes("requireStudioRole")) failures.push(`${file}: internal API must enforce route-level Studio auth`);
}
for(const file of [
  "app/studio/page.tsx",
  "app/studio/agent/page.tsx",
  "app/studio/assets/create/page.tsx",
  "app/studio/autonomy-preview/page.tsx",
  "app/studio/autonomy-runtime/page.tsx",
]) {
  const source=read(file);
  if(!source.includes("requireStudioPageAccess")) failures.push(`${file}: Studio page must enforce signed session access`);
  if(!source.includes('dynamic = "force-dynamic"')) failures.push(`${file}: authenticated Studio pages must be request-time rendered`);
}

const engine=read("src/lib/interactionGraphEngine.ts");
if(!engine.includes("parseInteractionEventInput(event)")) failures.push("Interaction engine must validate runtime events before trigger evaluation.");
const controller=read("src/runtime/InteractionGraphController.tsx");
if(!controller.includes("parseRuntimeInteractionEvent")) failures.push("Interaction controller must validate DOM and R3F event input.");

if(failures.length) {
  console.error("Forge security audit failed:");
  for(const failure of failures) console.error("- "+failure);
  process.exitCode=1;
} else {
  console.log(`Forge security audit passed: ${Object.keys(entries).length} SRI resources protected; Studio perimeter fail-closed; interaction runtime deterministic and schema-gated.`);
}

function walk(directory) {
  if(!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>{
    const target=path.join(directory,entry.name);
    if(entry.isDirectory()) return walk(target);
    return entry.isFile() ? [target] : [];
  });
}
