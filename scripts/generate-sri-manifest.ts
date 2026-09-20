import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

type AssetEntry={path?:unknown};
type AssetManifest={
  models?:AssetEntry[];
  textures?:AssetEntry[];
  hdr?:AssetEntry[];
  video?:AssetEntry[];
};

type SriEntry={
  bytes:number;
  sha384:string;
  sha512:string;
  kind:"decoder"|"model"|"texture"|"hdr"|"video";
};

type SriManifest={
  version:1;
  entries:Record<string,SriEntry>;
};

const root=process.cwd();
const assetManifest=JSON.parse(fs.readFileSync(path.join(root,"config/asset-manifest.json"),"utf8")) as AssetManifest;
const entries=new Map<string,SriEntry>();

for(const decoderRoot of ["public/decoders/draco","public/decoders/basis","public/draco","public/basis"]) {
  const absolute=path.join(root,decoderRoot);
  if(!fs.existsSync(absolute)) continue;
  for(const file of walk(absolute)) {
    if(file.endsWith("README.md")) continue;
    addFile(file,"decoder");
  }
}

for(const kind of ["models","textures","hdr","video"] as const) {
  for(const item of assetManifest[kind] ?? []) {
    const route=typeof item.path==="string" ? item.path : "";
    if(!route.startsWith("/") || route.startsWith("//")) continue;
    const file=path.join(root,"public",route.slice(1));
    if(!fs.existsSync(file)) throw new Error(`SRI source is missing for ${route}`);
    if(!fs.statSync(file).isFile()) throw new Error(`SRI source is not a file: ${route}`);
    addFile(file,kind==="models"?"model":kind==="textures"?"texture":kind);
  }
}

if(![...entries.keys()].some((key)=>key.endsWith(".wasm"))) {
  throw new Error("SRI manifest generation found no local WASM decoders. Run decoder preparation first.");
}

const manifest:SriManifest={
  version:1,
  entries:Object.fromEntries([...entries.entries()].sort(([a],[b])=>a.localeCompare(b))),
};
const destination=path.join(root,"config/sri-manifest.json");
fs.writeFileSync(destination,JSON.stringify(manifest,null,2)+"\n");
console.log(`Generated ${path.relative(root,destination)} with ${entries.size} protected resources.`);

function addFile(file:string,kind:SriEntry["kind"]) {
  const publicRoot=path.join(root,"public")+path.sep;
  if(!file.startsWith(publicRoot)) throw new Error(`SRI file is outside public/: ${file}`);
  const route="/"+path.relative(path.join(root,"public"),file).split(path.sep).join("/");
  const bytes=fs.readFileSync(file);
  entries.set(route,{
    bytes:bytes.byteLength,
    sha384:"sha384-"+createHash("sha384").update(bytes).digest("base64"),
    sha512:"sha512-"+createHash("sha512").update(bytes).digest("base64"),
    kind,
  });
}

function walk(directory:string):string[] {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>{
    const target=path.join(directory,entry.name);
    if(entry.isDirectory()) return walk(target);
    return entry.isFile() ? [target] : [];
  });
}
