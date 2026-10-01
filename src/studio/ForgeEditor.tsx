"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import { emptyInteractionGraph } from "@/src/platform/emptyInteractionGraph";
import { discoverabilityDefaults } from "@/src/platform/discoverability";
import { evaluateProjectHealth } from "@/src/platform/control-plane/projectHealth";
import { parseCinematicSystems } from "@/src/lib/cinematic/schema";
import { cinematicSystems as initialCinematicSystems } from "@/src/lib/cinematic/config";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { SequencerEditor } from "@/src/studio/SequencerEditor";
import { InteractionGraphEditor } from "@/src/studio/InteractionGraphEditor";
import { AssetManager } from "@/src/studio/AssetManager";
import { AssetBankPanel } from "@/src/studio/AssetBankPanel";
import { GlbInspectorPanel } from "@/src/studio/GlbInspectorPanel";
import { CinematicSystemsPanel } from "@/src/studio/CinematicSystemsPanel";
import { DiscoverabilityPanel } from "@/src/studio/DiscoverabilityPanel";
import { PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { ReferenceWorkbench } from "@/src/studio/ReferenceWorkbench";
import { Interactive3DBuildDock } from "@/src/studio/Interactive3DBuildDock";
import { StudioVaultPanel } from "@/src/studio/StudioVaultPanel";
import { StudioIdentityBadge } from "@/src/studio/StudioIdentityBadge";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

const initialExperience=parseExperience(rawExperience);
const initialProject=parseStudioProject(rawProject);
const initialManifest=rawAssetManifest as AssetManifest;
const initialGraph=parseInteractionGraph(rawInteractionGraph);

type Mode="design"|"references"|"motion"|"interactions"|"assets"|"effects"|"quality"|"publish";
type ProjectKind="real-estate"|"product"|"hospitality"|"automotive"|"fashion"|"custom";

const modes:Array<{id:Mode;label:string;short:string}>= [
  {id:"design",label:"Design",short:"D"},
  {id:"references",label:"References",short:"R"},
  {id:"motion",label:"Motion",short:"M"},
  {id:"interactions",label:"Interact",short:"I"},
  {id:"assets",label:"Assets",short:"A"},
  {id:"effects",label:"Effects",short:"E"},
];

export function ForgeEditor(){
  const draft=useStudioDraft(initialExperience,initialProject,initialManifest,initialGraph);
  const [mode,setMode]=useState<Mode>("design");
  const [activeScene,setActiveScene]=useState(0);
  const [layersOpen,setLayersOpen]=useState(true);
  const [inspectorOpen,setInspectorOpen]=useState(true);
  const [aiOpen,setAiOpen]=useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [qualityTab,setQualityTab]=useState<"health"|"performance"|"search">("health");
  const [vaultOpen,setVaultOpen]=useState(false);
  const [newProjectOpen,setNewProjectOpen]=useState(false);
  const [newName,setNewName]=useState("Untitled Experience");
  const [newKind,setNewKind]=useState<ProjectKind>("custom");
  const [candidate,setCandidate]=useState<ExperienceConfig|null>(null);
  const [previewCandidate,setPreviewCandidate]=useState(false);
  const [notice,setNotice]=useState("");
  const [canvasProgress,setCanvasProgress]=useState(0);
  const commandInput=useRef<HTMLInputElement>(null);
  const bootHandled=useRef(false);

  const sceneIndex=Math.min(activeScene,Math.max(0,draft.experience.scenes.length-1));
  const scene=draft.experience.scenes[sceneIndex];
  const previewExperience=previewCandidate && candidate ? candidate : draft.experience;
  const projectHealth=useMemo(()=>evaluateProjectHealth({
    experience:draft.experience,
    manifest:draft.assetManifest,
    graph:draft.interactionGraph,
    validationIssues:draft.validation,
    project:draft.project,
  }),[draft.assetManifest,draft.experience,draft.interactionGraph,draft.project,draft.validation]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){
        event.preventDefault();
        setCommandOpen((value)=>!value);
      }
      if(event.key==="Escape"){
        setCommandOpen(false);
        setAiOpen(false);
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  useEffect(()=>{
    if(commandOpen) queueMicrotask(()=>commandInput.current?.focus());
  },[commandOpen]);

  useEffect(()=>{
    if(!draft.hydrated || bootHandled.current) return;
    bootHandled.current=true;
    const params=new URLSearchParams(window.location.search);
    const open=params.get("open");
    const requestedName=params.get("new")?.trim();
    const requestedKind=params.get("kind") as ProjectKind|null;
    const clear=()=>window.history.replaceState(null,"","/studio");
    if(requestedName){
      startProject(requestedName.slice(0,80),validKind(requestedKind)?requestedKind:"custom");
      clear();
      return;
    }
    if(open && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(open)){
      void fetch(`/api/forge/projects/${open}`,{cache:"no-store"})
        .then(async(response)=>{
          const payload=await response.json();
          if(!response.ok) throw new Error(payload.error??"Project could not be opened.");
          draft.setExperience(parseExperience(payload.experience));
          draft.setProject(parseStudioProject(payload.project));
          draft.setAssetManifest(parseAssetManifest(payload.assetManifest));
          draft.setInteractionGraph(parseInteractionGraph(payload.interactionGraph));
          draft.setCinematicSystems(parseCinematicSystems(payload.cinematicSystems));
          setActiveScene(0);
          setCandidate(null);
          setPreviewCandidate(false);
          clear();
        })
        .catch((error)=>setNotice(error instanceof Error?error.message:"Project could not be opened."));
    }
  },[draft.hydrated]);

  function selectScene(index:number){
    setActiveScene(index);
    const next=draft.experience.scenes[index];
    if(next) setCanvasProgress(midpoint(next.range));
    setPreviewCandidate(false);
  }

  function setSceneCopy(key:"eyebrow"|"headline"|"body",value:string){
    draft.setExperience((current)=>({
      ...current,
      scenes:current.scenes.map((item,index)=>index===sceneIndex?{...item,copy:{...item.copy,[key]:value}}:item),
    }));
  }

  function addScene(){
    const base=structuredClone(scene??draft.experience.scenes[0]);
    const id=uniqueSceneId(draft.experience,"scene");
    const next:SceneDefinition={
      ...base,
      id,
      label:`Scene ${draft.experience.scenes.length+1}`,
      copy:{...base.copy,eyebrow:`${String(draft.experience.scenes.length+1).padStart(2,"0")} / SCENE`,headline:"New scene"},
      range:[0,1],
      motionTracks:[],
      blocks:[],
    };
    const scenes=normalizeRanges([...draft.experience.scenes,next]);
    draft.setExperience((current)=>({...current,scenes}));
    setActiveScene(scenes.length-1);
    setCanvasProgress(midpoint(scenes[scenes.length-1].range));
  }

  function removeScene(){
    if(draft.experience.scenes.length<=1) return;
    const scenes=normalizeRanges(draft.experience.scenes.filter((_,index)=>index!==sceneIndex));
    draft.setExperience((current)=>({...current,scenes}));
    setActiveScene(Math.max(0,sceneIndex-1));
  }

  function startProject(name:string,kind:ProjectKind){
    const id=slug(name)||"untitled-experience";
    const starter=makeStarterExperience(initialExperience,name,kind);
    const projectRoot=`clients/${id}`;
    draft.setExperience(starter);
    draft.setProject(parseStudioProject({
      ...structuredClone(initialProject),
      id,
      name,
      experiencePath:`${projectRoot}/experience.json`,
      directorTreatmentPath:`${projectRoot}/director-treatment.json`,
      directorEvidencePath:`${projectRoot}/director/evidence.json`,
      directorDecisionsPath:`${projectRoot}/director/decisions.json`,
      directorFingerprintPath:`${projectRoot}/director/fingerprint.json`,
      directorCritiquePath:`${projectRoot}/director/critique.json`,
      directorReviewHistoryPath:`${projectRoot}/director/review-history.json`,
      creativeDirectionPath:`${projectRoot}/creative-direction.json`,
      visualSystemsPath:`${projectRoot}/visual-systems.json`,
      experienceModesPath:`${projectRoot}/experience-modes.json`,
      deployment:{...initialProject.deployment,projectName:id},
      discoverability:discoverabilityDefaults(name),
      references:[],
    }));
    draft.setAssetManifest(parseAssetManifest({models:[],textures:[],hdr:[],video:[],budgets:structuredClone(initialManifest.budgets)}));
    draft.setInteractionGraph(emptyInteractionGraph(id));
    draft.setCinematicSystems(parseCinematicSystems({version:1,defaults:initialCinematicSystems.defaults,scenes:[]}));
    setMode("design");
    setActiveScene(0);
    setCandidate(null);
    setPreviewCandidate(false);
    setAiOpen(true);
    setNewProjectOpen(false);
    setNotice(`${name} created.`);
  }

  function runCommand(raw:string){
    const value=raw.trim().toLowerCase();
    const match=modes.find((item)=>value===item.id || value===item.label.toLowerCase());
    if(match) setMode(match.id);
    else if(value.includes("reference")) setMode("references");
    else if(value.includes("motion")||value.includes("animate")||value.includes("timeline")) setMode("motion");
    else if(value.includes("interact")) setMode("interactions");
    else if(value.includes("asset")) setMode("assets");
    else if(value.includes("effect")||value.includes("visual")) setMode("effects");
    else if(value.includes("quality")||value.includes("health")) setMode("quality");
    else if(value.includes("publish")||value.includes("ship")) setMode("publish");
    else if(value.includes("ai")||value.includes("build")||value.includes("generate")){setMode("design");setAiOpen(true);}
    else if(value.includes("new")) setNewProjectOpen(true);
    setCommandOpen(false);
  }

  if(!draft.hydrated){
    return <main className="forge-next forge-next--loading"><div className="forge-next__mark">F</div><p>Opening Forge</p></main>;
  }

  return <main className="forge-next">
    <header className="forge-next__topbar">
      <div className="forge-next__brand">
        <button type="button" className="forge-next__mark" onClick={()=>setMode("design")} aria-label="Forge home">F</button>
        <div><strong>{draft.project.name}</strong><span>{scene?.label??"Website"}</span></div>
      </div>
      <nav className="forge-next__modes" aria-label="Editor modes">
        {modes.map((item)=><button key={item.id} type="button" aria-current={mode===item.id?"page":undefined} onClick={()=>setMode(item.id)}>{item.label}</button>)}
      </nav>
      <div className="forge-next__top-actions">
        <button type="button" aria-label="Undo" disabled={!draft.canUndoExperience} onClick={draft.undoExperience}>↶</button>
        <button type="button" aria-label="Redo" disabled={!draft.canRedoExperience} onClick={draft.redoExperience}>↷</button>
        <button type="button" className="forge-next__health" data-status={projectHealth.status} onClick={()=>setMode("quality")}><i />{projectHealth.status==="ready"?"Ready":projectHealth.status}</button>
        <button type="button" className="forge-next__publish" onClick={()=>setMode("publish")}>Publish</button>
        <details className="forge-next__menu"><summary aria-label="Project menu">•••</summary><div>
          <button type="button" onClick={()=>setNewProjectOpen(true)}>New website</button>
          <button type="button" onClick={()=>setVaultOpen(true)}>Versions</button>
          <button type="button" onClick={()=>downloadJson("forge-project.json",{experience:draft.experience,project:draft.project,assetManifest:draft.assetManifest,interactionGraph:draft.interactionGraph,cinematicSystems:draft.cinematicSystems})}>Export project</button>
          <button type="button" onClick={()=>setMode("quality")}>Quality & performance</button>
          <Link href="/director">Director</Link>
          <Link href="/studio/agent">Creative Agent</Link>
        </div></details>
        <StudioIdentityBadge />
      </div>
    </header>

    <div className="forge-next__shell">
      <aside className="forge-next__rail">
        {modes.map((item)=><button key={item.id} type="button" data-active={mode===item.id} title={item.label} aria-label={item.label} onClick={()=>setMode(item.id)}><span>{item.short}</span></button>)}
        <div className="forge-next__rail-spacer" />
        <button type="button" data-active={mode==="quality"} title="Quality" aria-label="Quality" onClick={()=>setMode("quality")}><span>Q</span></button>
        <button type="button" title="Commands" aria-label="Commands" onClick={()=>setCommandOpen(true)}><span>⌘</span></button>
      </aside>

      {mode==="design" ? <>
        <aside className="forge-next__layers" data-open={layersOpen}>
          <div className="forge-next__panel-head"><div><span>Layers</span><small>{draft.experience.scenes.length} scenes</small></div><button type="button" aria-label="Collapse layers" onClick={()=>setLayersOpen(false)}>‹</button></div>
          <div className="forge-next__scene-list">
            {draft.experience.scenes.map((item,index)=><button key={item.id} type="button" data-active={index===sceneIndex} onClick={()=>selectScene(index)}>
              <span>{String(index+1).padStart(2,"0")}</span><div><strong>{item.label}</strong><small>{item.copy.headline}</small></div>
            </button>)}
          </div>
          <button type="button" className="forge-next__add-scene" onClick={addScene}>＋ Add scene</button>
        </aside>

        <section className="forge-next__canvas-area">
          {!layersOpen&&<button className="forge-next__edge-toggle forge-next__edge-toggle--left" type="button" onClick={()=>setLayersOpen(true)}>Layers ›</button>}
          {!inspectorOpen&&<button className="forge-next__edge-toggle forge-next__edge-toggle--right" type="button" onClick={()=>setInspectorOpen(true)}>‹ Inspector</button>}
          <div className="forge-next__canvas-bar">
            <div><button type="button" className={previewCandidate?"":"active"} onClick={()=>setPreviewCandidate(false)}>Current</button>{candidate&&<button type="button" className={previewCandidate?"active":""} onClick={()=>setPreviewCandidate(true)}>Candidate</button>}</div>
            <strong>{scene?.label}</strong>
            <div><button type="button" onClick={()=>setAiOpen((value)=>!value)}>AI Build</button><button type="button" onClick={()=>setMode("motion")}>Animate</button></div>
          </div>
          <div className="forge-next__canvas">
            <StudioLivePreview
              experience={previewExperience}
              active={Math.min(sceneIndex,previewExperience.scenes.length-1)}
              setActive={selectScene}
              progress={canvasProgress}
              onProgressChange={setCanvasProgress}
              cinematicSystems={draft.cinematicSystems}
            />
          </div>
          {aiOpen&&<aside className="forge-next__ai-drawer">
            <div className="forge-next__drawer-head"><div><span>AI Build</span><strong>Generate structure, then edit it here.</strong></div><button type="button" onClick={()=>setAiOpen(false)}>×</button></div>
            <Interactive3DBuildDock
              initialPrompt=""
              projectName={draft.project.name}
              experience={draft.experience}
              manifest={draft.assetManifest}
              healthStatus={projectHealth.status}
              references={draft.project.references}
              onPreview={(next)=>{setCandidate(next);setPreviewCandidate(true);}}
              onApply={(next)=>{draft.setExperience(next);setCandidate(null);setPreviewCandidate(false);setAiOpen(false);}}
              onOpenAssets={()=>{setMode("assets");setAiOpen(false);}}
            />
          </aside>}
          <div className="forge-next__timeline">
            <div className="forge-next__timeline-controls"><button type="button" onClick={()=>setMode("motion")}>Timeline</button><span>{Math.round(canvasProgress*100)}%</span></div>
            <div className="forge-next__timeline-track">{draft.experience.scenes.map((item,index)=><button key={item.id} type="button" data-active={index===sceneIndex} style={{flex:Math.max(.08,item.range[1]-item.range[0])}} onClick={()=>selectScene(index)}><i />{item.label}</button>)}</div>
          </div>
        </section>

        <aside className="forge-next__inspector" data-open={inspectorOpen}>
          <div className="forge-next__panel-head"><div><span>Inspector</span><small>Scene {sceneIndex+1}</small></div><button type="button" aria-label="Collapse inspector" onClick={()=>setInspectorOpen(false)}>›</button></div>
          <div className="forge-next__inspector-scroll">
            <section>
              <label>Scene name<input value={scene.label} maxLength={80} onChange={(event)=>draft.setExperience((current)=>({...current,scenes:current.scenes.map((item,index)=>index===sceneIndex?{...item,label:event.target.value}:item)}))}/></label>
            </section>
            <section>
              <h3>Content</h3>
              <label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event)=>setSceneCopy("eyebrow",event.target.value)}/></label>
              <label>Headline<textarea rows={3} value={scene.copy.headline} onChange={(event)=>setSceneCopy("headline",event.target.value)}/></label>
              <label>Body<textarea rows={5} value={scene.copy.body??""} onChange={(event)=>setSceneCopy("body",event.target.value)}/></label>
            </section>
            <section>
              <h3>Experience</h3>
              <div className="forge-next__readout"><span>Hero</span><strong>{draft.experience.heroModel?"3D model":"None"}</strong></div>
              <div className="forge-next__readout"><span>Motion tracks</span><strong>{scene.motionTracks.length}</strong></div>
              <div className="forge-next__readout"><span>Media</span><strong>{scene.media?.kind??"None"}</strong></div>
              <div className="forge-next__readout"><span>References</span><strong>{draft.project.references.length}</strong></div>
            </section>
            <section>
              <h3>Open in</h3>
              <div className="forge-next__inspector-actions"><button type="button" onClick={()=>setMode("references")}>References</button><button type="button" onClick={()=>setMode("motion")}>Motion</button><button type="button" onClick={()=>setMode("interactions")}>Interactions</button><button type="button" onClick={()=>setMode("effects")}>Effects</button></div>
            </section>
            <section className="forge-next__danger"><button type="button" disabled={draft.experience.scenes.length<=1} onClick={removeScene}>Delete scene</button></section>
          </div>
        </aside>
      </> : <section className="forge-next__workspace">
        <WorkspaceHeader mode={mode} projectName={draft.project.name} onCanvas={()=>setMode("design")} />
        <div className="forge-next__workspace-body">
          {mode==="references"&&<ReferenceWorkbench project={draft.project} setProject={draft.setProject}/>}
          {mode==="motion"&&<SequencerEditor experience={draft.experience} setExperience={draft.setExperience} active={sceneIndex} setActive={setActiveScene} beginGroup={draft.beginExperienceGroup} endGroup={draft.endExperienceGroup} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience}/>}
          {mode==="interactions"&&<InteractionGraphEditor graph={draft.interactionGraph} setGraph={draft.setInteractionGraph}/>}
          {mode==="assets"&&<div className="forge-next__workspace-stack"><AssetManager setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} active={sceneIndex}/><AssetBankPanel experience={draft.experience} setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} interactionGraph={draft.interactionGraph} undo={draft.undoExperience} canUndo={draft.canUndoExperience}/><GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience}/></div>}
          {mode==="effects"&&<CinematicSystemsPanel manifest={draft.cinematicSystems} setManifest={draft.setCinematicSystems} experience={draft.experience} activeScene={sceneIndex} onSelectScene={setActiveScene}/>}
          {mode==="quality"&&<QualityWorkspace tab={qualityTab} setTab={setQualityTab} projectHealth={projectHealth} draft={draft}/>}
          {mode==="publish"&&<PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} interactionGraph={draft.interactionGraph} cinematicSystems={draft.cinematicSystems} validationCount={draft.validation.length} healthReady={projectHealth.status==="ready"} healthSummary={projectHealth.summary}/>}
        </div>
      </section>}
    </div>

    {notice&&<button type="button" className="forge-next__toast" onClick={()=>setNotice("")}>{notice}<span>×</span></button>}
    {commandOpen&&<div className="forge-next__command-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setCommandOpen(false);}}><div className="forge-next__command">
      <div className="forge-next__command-input"><span>⌘</span><input ref={commandInput} aria-label="Forge command" placeholder="Go to Motion, open References, publish…" onKeyDown={(event)=>{if(event.key==="Enter")runCommand(event.currentTarget.value);}}/><kbd>esc</kbd></div>
      <div className="forge-next__command-grid">{[...modes,{id:"quality" as const,label:"Quality",short:"Q"},{id:"publish" as const,label:"Publish",short:"P"}].map((item)=><button type="button" key={item.id} onClick={()=>{setMode(item.id);setCommandOpen(false);}}><span>{item.short}</span><strong>{item.label}</strong></button>)}<button type="button" onClick={()=>{setAiOpen(true);setMode("design");setCommandOpen(false);}}><span>AI</span><strong>AI Build</strong></button><button type="button" onClick={()=>{setNewProjectOpen(true);setCommandOpen(false);}}><span>＋</span><strong>New website</strong></button></div>
    </div></div>}
    {vaultOpen&&<StudioVaultPanel draft={draft} onClose={()=>setVaultOpen(false)} onProjectChange={()=>{setCandidate(null);setPreviewCandidate(false);setActiveScene(0);}}/>}
    {newProjectOpen&&<NewProjectDialog name={newName} setName={setNewName} kind={newKind} setKind={setNewKind} onCreate={()=>startProject(newName,newKind)} onClose={()=>setNewProjectOpen(false)}/>}
  </main>;
}

function WorkspaceHeader({mode,projectName,onCanvas}:{mode:Mode;projectName:string;onCanvas:()=>void}){
  const names:Record<Mode,[string,string]>={
    design:["Design","Direct the site on the canvas."],
    references:["References","Turn inspiration into explicit construction rules."],
    motion:["Motion","Sequence camera, objects, type and media over scroll."],
    interactions:["Interactions","Build deterministic input and state behavior."],
    assets:["Assets","Inspect, optimize and connect production media."],
    effects:["Effects","Author reveals, refraction, warp and cinematic transitions."],
    quality:["Quality","Resolve performance, search and release readiness."],
    publish:["Publish","Create a protected production review."],
  };
  return <header className="forge-next__workspace-head"><div><button type="button" onClick={onCanvas}>← Canvas</button><span>{projectName}</span></div><div><h1>{names[mode][0]}</h1><p>{names[mode][1]}</p></div></header>;
}

function QualityWorkspace({tab,setTab,projectHealth,draft}:{tab:"health"|"performance"|"search";setTab:(value:"health"|"performance"|"search")=>void;projectHealth:ReturnType<typeof evaluateProjectHealth>;draft:ReturnType<typeof useStudioDraft>}){
  return <div className="forge-next__quality">
    <nav><button type="button" aria-current={tab==="health"?"page":undefined} onClick={()=>setTab("health")}>Project health</button><button type="button" aria-current={tab==="performance"?"page":undefined} onClick={()=>setTab("performance")}>Performance</button><button type="button" aria-current={tab==="search"?"page":undefined} onClick={()=>setTab("search")}>Search & AI</button></nav>
    {tab==="health"&&<section className="forge-next__health-page"><div className="forge-next__health-score" data-status={projectHealth.status}><span>{projectHealth.status}</span><strong>{projectHealth.issues.length}</strong><small>open findings</small></div><div className="forge-next__health-list">{projectHealth.issues.length?projectHealth.issues.map((issue)=><article key={issue.id} data-severity={issue.severity}><div><span>{issue.severity}</span><strong>{issue.title}</strong></div><p>{issue.detail}</p><small>{issue.recommendedAction}</small></article>):<article className="ready"><strong>Project health is ready.</strong><p>No release blockers are currently reported.</p></article>}</div></section>}
    {tab==="performance"&&<TelemetryPanel project={draft.project} setProject={draft.setProject}/>}
    {tab==="search"&&<DiscoverabilityPanel project={draft.project} setProject={draft.setProject} experience={draft.experience}/>}
  </div>;
}

function NewProjectDialog({name,setName,kind,setKind,onCreate,onClose}:{name:string;setName:(value:string)=>void;kind:ProjectKind;setKind:(value:ProjectKind)=>void;onCreate:()=>void;onClose:()=>void}){
  return <div className="forge-next__modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}><section className="forge-next__modal" role="dialog" aria-modal="true" aria-labelledby="forge-new-title"><span>New website</span><h2 id="forge-new-title">Start with a clean canvas.</h2><p>Forge creates an isolated website project with no inherited assets, interactions, effects or references.</p><label>Project name<input autoFocus value={name} onChange={(event)=>setName(event.target.value)}/></label><div className="forge-next__kind-grid">{(["real-estate","product","hospitality","automotive","fashion","custom"] as ProjectKind[]).map((item)=><button type="button" key={item} aria-pressed={kind===item} onClick={()=>setKind(item)}>{item.replace("-"," ")}</button>)}</div><footer><button type="button" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={!name.trim()} onClick={onCreate}>Create website</button></footer></section></div>;
}

function makeStarterExperience(base:ExperienceConfig,name:string,kind:ProjectKind):ExperienceConfig{
  const source=structuredClone(base.scenes[0]);
  const labels:Record<ProjectKind,string>={"real-estate":"Arrival",product:"Hero Product",hospitality:"Arrival",automotive:"Vehicle Reveal",fashion:"Opening Look",custom:"Opening Scene"};
  source.id="opening";
  source.label=labels[kind];
  source.range=[0,1];
  source.motionTracks=[];
  source.blocks=[];
  delete source.media;
  source.copy={eyebrow:`01 / ${kind.replace("-"," ").toUpperCase()}`,headline:name,body:"Direct this experience from the canvas.",align:"left"};
  return parseExperience({...structuredClone(base),meta:{...base.meta,name,description:`${name} — Forge website project.`},heroModel:"",heroVisible:false,assets:[],scenes:[source],hotspots:[],productRig:undefined});
}

function normalizeRanges(scenes:SceneDefinition[]):SceneDefinition[]{
  const length=Math.max(1,scenes.length);
  return scenes.map((item,index)=>({...item,range:[index/length,(index+1)/length] as [number,number]}));
}
function uniqueSceneId(experience:ExperienceConfig,base:string){
  const used=new Set(experience.scenes.map((item)=>item.id));
  let value=slug(base)||"scene";let index=2;
  while(used.has(value)) value=`${slug(base)}-${index++}`;
  return value;
}
function slug(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64);}
function midpoint(range:[number,number]){return range[0]+(range[1]-range[0])*.5;}
function validKind(value:ProjectKind|null):value is ProjectKind{return ["real-estate","product","hospitality","automotive","fashion","custom"].includes(value??"");}
