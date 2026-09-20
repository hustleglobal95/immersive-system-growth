import fs from "node:fs";

const failures=[];
const read=(path)=>fs.readFileSync(path,"utf8");
const requireText=(path,text,message)=>{
  const source=read(path);
  if(!source.includes(text)) failures.push(message+" ("+path+")");
};
const forbidText=(path,text,message)=>{
  const source=read(path);
  if(source.includes(text)) failures.push(message+" ("+path+")");
};

requireText("src/studio/ProductionStudioWorkbench.tsx",'const primarySurfaces = ["Build", "Review", "Ship"] as const',"Studio primary navigation changed");
requireText("src/studio/ProductionStudioWorkbench.tsx","openSimpleAnimate","Build must expose simple targeted Animate");
requireText("src/studio/ControlPlaneSurfaces.tsx",'aria-label="Camera path"',"Camera inspector must author camera state directly");
requireText("src/studio/ControlPlaneSurfaces.tsx",'ariaLabel="Environment exposure"',"Environment inspector must author environment state directly");
requireText("src/studio/ControlPlaneSurfaces.tsx",'aria-label="Media transition"',"Media inspector must author presentation directly");
requireText("src/studio/ControlPlaneSurfaces.tsx",'openAnimate(`rig:${node}:position`)',"Rig inspector must target simple Animate");
requireText("src/studio/CinematicSystemsPanel.tsx","LIVE DRAFT","Visual Effects must identify itself as live draft authoring");
requireText("src/studio/CinematicSystemsPanel.tsx","manifest:CinematicSystemsManifest","Visual Effects must be controlled by Studio project state");
forbidText("src/studio/CinematicSystemsPanel.tsx",'rawCinematic from "@/config/cinematic-systems.json"',"Visual Effects must not maintain a private production manifest");
forbidText("src/studio/CinematicSystemsPanel.tsx",'rawExperience from "@/config/experience.json"',"Visual Effects must not use a static scene list");
requireText("src/studio/useStudioDraft.ts","cinematicSystems","Studio draft must persist cinematic systems");
requireText("src/studio/StudioLivePreview.tsx","CinematicSystemsLayer contained","Studio preview must render the production cinematic compositor");
requireText("src/platform/studioPublish.ts",'path: "config/cinematic-systems.json"',"Publishing must carry cinematic systems");
requireText("src/platform/studioPublish.ts",'path: "config/interaction-graph.json"',"Publishing must carry authored interactions");
requireText("src/studio/ProjectPanels.tsx","interactionGraph","PublishPanel must send authored interactions");
requireText("src/platform/studioVault.ts","cinematicSystems","Project Vault must carry cinematic systems");
requireText("src/platform/control-plane/projectState.ts","cinematicSystems","Proposal fingerprints must include cinematic systems");
requireText("src/studio/LoopEnginePanel.tsx",'fetch("/api/studio/loops/run"',"Loop Engine must dispatch through Studio instead of requiring a terminal");
requireText("src/studio/LoopEnginePanel.tsx","Run improvement","Loop Engine must expose a direct primary action");
forbidText("src/studio/LoopEnginePanel.tsx",'ready ? "Copy run command"',"Copying a CLI command must not be the primary Loop workflow");
requireText("app/api/studio/loops/run/route.ts",'requireStudioRole(request,"director")',"Remote Loop dispatch must be role protected");
requireText("app/api/studio/loops/run/route.ts","projectStateFingerprint","Remote Loop dispatch must validate source parity");
requireText("app/api/studio/loops/run/route.ts",'FORGE_LOOP_REMOTE_ENABLED!=="true"',"Remote Loop execution must fail closed unless explicitly enabled");
requireText(".github/workflows/forge-loop.yml","workflow_dispatch","Forge Loop must have a remote execution workflow");
requireText(".github/workflows/forge-loop.yml","FORGE_VISUAL_CRITIC_URL","Remote Loop workflow must fail closed without critic evidence");

const actionEditors=[
  ["src/studio/SequencerEditor.tsx","commitTracks","Sequencer must mutate motion tracks"],
  ["src/studio/InteractionGraphEditor.tsx","setGraph","Interaction Graph must mutate graph state"],
  ["src/studio/AssetManager.tsx","setExperience","Asset tools must mutate project state"],
  ["src/studio/AssetBankPanel.tsx","setExperience","Asset Bank must insert into project state"],
  ["src/studio/StudioVaultPanel.tsx",'method: "POST"',"Project Vault must expose durable save actions"],
  ["src/studio/ProjectPanels.tsx",'fetch("/api/studio/publish"',"Ship must call the protected publish backend"],
];
for(const [path,text,message] of actionEditors) requireText(path,text,message);

if(failures.length){
  console.error("Studio actionability audit failed:");
  for(const failure of failures) console.error("- "+failure);
  process.exitCode=1;
}else{
  console.log("Studio actionability audit passed: direct Build authoring, live Visual Effects, durable project state, protected Ship and executable Loop paths are wired.");
}
