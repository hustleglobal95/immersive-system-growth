import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  STUDIO_ACTIONABILITY_TARGET,
  studioActionabilityContracts,
  studioActionabilityPercent,
} from "../src/platform/studioActionability.ts";

const failures=[];
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const exists=(file)=>fs.existsSync(path.join(root,file));
const browserDir=path.join(root,"tests/browser");
const browserCorpus=fs.readdirSync(browserDir)
  .filter((name)=>name.endsWith(".spec.ts"))
  .map((name)=>fs.readFileSync(path.join(browserDir,name),"utf8"))
  .join("\n");

const ids=new Set();
let covered=0;
for(const contract of studioActionabilityContracts){
  if(ids.has(contract.id)) failures.push(`Duplicate Studio actionability contract: ${contract.id}`);
  ids.add(contract.id);
  if(!exists(contract.source)){
    failures.push(`${contract.id}: source does not exist: ${contract.source}`);
    continue;
  }
  const source=read(contract.source);
  let contractOk=true;
  for(const token of contract.evidence){
    if(!source.includes(token)){
      failures.push(`${contract.id}: missing implementation evidence "${token}" in ${contract.source}`);
      contractOk=false;
    }
  }
  if(!browserCorpus.includes(contract.browserEvidence)){
    failures.push(`${contract.id}: missing browser evidence test "${contract.browserEvidence}"`);
    contractOk=false;
  }
  if(contract.mode==="review-only" && !/review/i.test(contract.label)){
    failures.push(`${contract.id}: review-only surfaces must be explicitly labeled as review surfaces`);
    contractOk=false;
  }
  if(contractOk) covered++;
}

const percent=studioActionabilityPercent(covered);
if(percent!==STUDIO_ACTIONABILITY_TARGET){
  failures.push(`Studio actionability coverage is ${percent}%, expected ${STUDIO_ACTIONABILITY_TARGET}% (${covered}/${studioActionabilityContracts.length} contracts)`);
}

const route=read("app/studio/page.tsx");
if(!route.includes("ProductionStudioWorkbench")) failures.push("The /studio route must render ProductionStudioWorkbench.");
if(/import\s*\{\s*StudioWorkbench\s*\}/.test(route)) failures.push("Legacy StudioWorkbench must never be reachable from /studio.");

const activeFiles=[
  "src/studio/ProductionStudioWorkbench.tsx",
  "src/studio/ControlPlaneSurfaces.tsx",
  "src/studio/OperatorMissionControl.tsx",
  "src/studio/AnimatePanel.tsx",
  "src/studio/SequencerEditor.tsx",
  "src/studio/InteractionGraphEditor.tsx",
  "src/studio/AssetManager.tsx",
  "src/studio/AssetBankPanel.tsx",
  "src/studio/GlbInspectorPanel.tsx",
  "src/studio/CinematicSystemsPanel.tsx",
  "src/studio/ProjectPanels.tsx",
  "src/studio/DiscoverabilityPanel.tsx",
  "src/studio/StudioVaultPanel.tsx",
  "src/studio/LoopEnginePanel.tsx",
  "src/studio/ControlPlaneReview.tsx",
  "src/studio/StudioWorkflowGuide.tsx",
];

for(const file of activeFiles){
  auditInteractiveControls(file,read(file));
}

const requiredChecks=[
  ["src/studio/ProductionStudioWorkbench.tsx",'const primarySurfaces = ["Build", "Review", "Ship"] as const',"Studio primary navigation changed"],
  ["src/studio/ProductionStudioWorkbench.tsx","openSimpleAnimate","Build must expose simple targeted Animate"],
  ["src/studio/CinematicSystemsPanel.tsx","LIVE DRAFT","Visual Effects must identify itself as live draft authoring"],
  ["src/studio/useStudioDraft.ts","cinematicSystems","Studio draft must persist cinematic systems"],
  ["src/studio/StudioLivePreview.tsx","CinematicSystemsLayer contained","Studio preview must render the production cinematic compositor"],
  ["src/platform/studioVault.ts","cinematicSystems","Project Vault must carry cinematic systems"],
  ["src/platform/control-plane/projectState.ts","cinematicSystems","Proposal fingerprints must include cinematic systems"],
  ["src/studio/LoopEnginePanel.tsx",'fetch("/api/studio/loops/run"',"Loop Engine must dispatch through Studio"],
  ["app/api/studio/loops/run/route.ts",'FORGE_LOOP_REMOTE_ENABLED!=="true"',"Remote Loop execution must fail closed unless explicitly enabled"],
  [".github/workflows/forge-loop.yml","workflow_dispatch","Forge Loop must have a remote execution workflow"],
];
for(const [file,token,message] of requiredChecks){
  if(!read(file).includes(token)) failures.push(`${message} (${file})`);
}

if(failures.length){
  console.error("Studio actionability audit failed:");
  for(const failure of failures) console.error("- "+failure);
  process.exitCode=1;
}else{
  console.log(`Studio actionability audit passed: ${covered}/${studioActionabilityContracts.length} contracted surfaces = ${percent}% · no dead interactive controls in ${activeFiles.length} reachable Studio components.`);
}

function auditInteractiveControls(file,source){
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit=(node)=>{
    if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
      const tag=node.tagName.getText(ast);
      if(tag==="button") auditButton(node);
      if(tag==="input"||tag==="select"||tag==="textarea") auditField(node,tag);
      if(tag==="a") auditAnchor(node);
    }
    ts.forEachChild(node,visit);
  };
  visit(ast);

  function attrs(node){
    return new Map(node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attr)=>[attr.name.getText(ast),attr]));
  }
  function hasEvent(map,names){
    return names.some((name)=>map.has(name));
  }
  function literal(map,name){
    const attr=map.get(name);
    if(!attr?.initializer || !ts.isStringLiteral(attr.initializer)) return "";
    return attr.initializer.text;
  }
  function location(node){
    const pos=ast.getLineAndCharacterOfPosition(node.getStart(ast));
    return `${file}:${pos.line+1}`;
  }
  function ancestorForm(node){
    let parent=node.parent;
    while(parent){
      if((ts.isJsxElement(parent)||ts.isJsxSelfClosingElement(parent))){
        const opening=ts.isJsxElement(parent)?parent.openingElement:parent;
        if(opening.tagName.getText(ast)==="form") return true;
      }
      parent=parent.parent;
    }
    return false;
  }
  function auditButton(node){
    const map=attrs(node);
    const actionable=hasEvent(map,["onClick","onPointerDown","onMouseDown","onKeyDown","formAction"]);
    const submit=literal(map,"type")==="submit" || (!map.has("type")&&ancestorForm(node));
    if(!actionable&&!submit) failures.push(`Dead button: no action handler or submit behavior at ${location(node)}`);
  }
  function auditField(node,tag){
    const map=attrs(node);
    const type=literal(map,"type");
    if(map.has("readOnly")||map.has("disabled")||type==="hidden"||["submit","button","reset"].includes(type)) return;
    const uncontrolled=map.has("defaultValue")||map.has("defaultChecked");
    const actionable=hasEvent(map,["onChange","onInput","onBlur"]);
    if(!actionable&&!uncontrolled){
      failures.push(`Dead ${tag}: editable control has no mutation/input handler at ${location(node)}`);
    }
  }
  function auditAnchor(node){
    const map=attrs(node);
    if(!map.has("href")&&!hasEvent(map,["onClick","onPointerDown"])){
      failures.push(`Dead link: no href or action handler at ${location(node)}`);
    }
  }
}
