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
import { LoopEnginePanel } from "@/src/studio/LoopEnginePanel";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

const initialExperience=parseExperience(rawExperience);
const initialProject=parseStudioProject(rawProject);
const initialManifest=rawAssetManifest as AssetManifest;
const initialGraph=parseInteractionGraph(rawInteractionGraph);

type Mode="design"|"references"|"motion"|"interactions"|"assets"|"effects"|"quality"|"publish";
type ProjectKind="real-estate"|"product"|"hospitality"|"automotive"|"fashion"|"custom";
type LeftPanelTab="pages"|"layers";
type InspectorTab="design"|"content";
type CanvasTool="select"|"text";

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
  const [leftPanelTab,setLeftPanelTab]=useState<LeftPanelTab>("pages");
  const [inspectorTab,setInspectorTab]=useState<InspectorTab>("design");
  const [canvasTool,setCanvasTool]=useState<CanvasTool>("select");
  const [inspectorOpen,setInspectorOpen]=useState(true);
  const [aiOpen,setAiOpen]=useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [commandValue,setCommandValue]=useState("");
  const [qualityTab,setQualityTab]=useState<"health"|"performance"|"search">("health");
  const [vaultOpen,setVaultOpen]=useState(false);
  const [loopOpen,setLoopOpen]=useState(false);
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
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="j"){
        event.preventDefault();
        setMode("design");
        setAiOpen((value)=>!value);
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
        <button type="button" className="forge-next__project-button" onClick={()=>setCommandOpen(true)}>
          <span className="forge-next__project-org">FORGE</span>
          <span className="forge-next__project-separator">/</span>
          <strong>{draft.project.name}</strong>
          <Icon name="chevronDown" />
        </button>
      </div>

      <div className="forge-next__canvas-tools" role="toolbar" aria-label="Canvas tools">
        <button type="button" aria-pressed={canvasTool==="select"} aria-label="Select tool" title="Select" onClick={()=>{setCanvasTool("select");setMode("design");}}><Icon name="cursor" /></button>
        <span />
        <button type="button" aria-label="Add section" title="Add section" onClick={()=>{setMode("design");addScene();}}><Icon name="frame" /></button>
        <button type="button" aria-pressed={canvasTool==="text"} aria-label="Edit text" title="Text" onClick={()=>{setCanvasTool("text");setMode("design");setInspectorOpen(true);setInspectorTab("content");}}><Icon name="text" /></button>
        <button type="button" aria-label="Open assets" title="Media & 3D" onClick={()=>setMode("assets")}><Icon name="media" /></button>
        <button type="button" aria-label="Open references" title="References" onClick={()=>setMode("references")}><Icon name="reference" /></button>
        <span />
        <button type="button" aria-label="Open motion" title="Motion" onClick={()=>setMode("motion")}><Icon name="motion" /></button>
      </div>

      <div className="forge-next__top-actions">
        <button type="button" aria-label="Undo" disabled={!draft.canUndoExperience} onClick={draft.undoExperience}><Icon name="undo" /></button>
        <button type="button" aria-label="Redo" disabled={!draft.canRedoExperience} onClick={draft.redoExperience}><Icon name="redo" /></button>
        <button type="button" className="forge-next__health" data-status={projectHealth.status} onClick={()=>setMode("quality")}><i />{projectHealth.status==="ready"?"Ready":projectHealth.status}</button>
        <button type="button" className="forge-next__preview-action" onClick={()=>{setMode("design");setPreviewCandidate(false);}}><Icon name="play" /> Preview</button>
        <button type="button" className="forge-next__publish" onClick={()=>setMode("publish")}>Publish</button>
        <details className="forge-next__menu"><summary aria-label="Project menu"><Icon name="more" /></summary><div>
          <button type="button" onClick={()=>setNewProjectOpen(true)}>New website</button>
          <button type="button" onClick={()=>setVaultOpen(true)}>Versions</button>
          <button type="button" onClick={()=>setLoopOpen(true)}>Improve current site</button>
          <button type="button" onClick={()=>downloadJson("forge-project.json",{experience:draft.experience,project:draft.project,assetManifest:draft.assetManifest,interactionGraph:draft.interactionGraph,cinematicSystems:draft.cinematicSystems})}>Export project</button>
          <button type="button" onClick={()=>setMode("quality")}>Quality & performance</button>
          <Link href="/director">Director</Link>
          <Link href="/studio/agent">Creative Agent</Link>
          <Link href="/studio/assets/create">Asset Creator</Link>
        </div></details>
        <StudioIdentityBadge />
      </div>
    </header>

    <div className="forge-next__shell">
      <nav className="forge-next__rail" aria-label="Editor modes">
        <div className="forge-next__rail-primary">
          <button type="button" data-active={mode==="design"} aria-label="Design" title="Design" onClick={()=>setMode("design")}><Icon name="layers" /></button>
          <button type="button" data-active={mode==="references"} aria-label="References" title="References" onClick={()=>setMode("references")}><Icon name="reference" /></button>
          <button type="button" data-active={mode==="assets"} aria-label="Assets" title="Assets" onClick={()=>setMode("assets")}><Icon name="media" /></button>
          <button type="button" data-active={mode==="motion"} aria-label="Motion" title="Motion" onClick={()=>setMode("motion")}><Icon name="motion" /></button>
          <button type="button" data-active={mode==="interactions"} aria-label="Interact" title="Interactions" onClick={()=>setMode("interactions")}><Icon name="bolt" /></button>
          <button type="button" data-active={mode==="effects"} aria-label="Effects" title="Effects" onClick={()=>setMode("effects")}><Icon name="sparkles" /></button>
        </div>
        <div className="forge-next__rail-spacer" />
        <button type="button" data-active={mode==="quality"} title="Quality" aria-label="Quality" onClick={()=>setMode("quality")}><Icon name="shield" /></button>
        <button type="button" title="Commands" aria-label="Open command palette" onClick={()=>setCommandOpen(true)}><Icon name="command" /></button>
      </nav>

      {mode==="design" ? <>
        <aside className="forge-next__layers" data-open={layersOpen}>
          <div className="forge-next__panel-head forge-next__panel-head--tabs">
            <div className="forge-next__panel-tabs">
              <button type="button" aria-current={leftPanelTab==="pages"?"page":undefined} onClick={()=>setLeftPanelTab("pages")}>Pages</button>
              <button type="button" aria-current={leftPanelTab==="layers"?"page":undefined} onClick={()=>setLeftPanelTab("layers")}>Layers</button>
            </div>
            <button type="button" aria-label="Collapse layers" onClick={()=>setLayersOpen(false)}><Icon name="panelLeft" /></button>
          </div>
          {leftPanelTab==="pages" ? <>
            <div className="forge-next__panel-section-title"><span>Website</span><button type="button" onClick={addScene} aria-label="Add scene"><Icon name="plus" /></button></div>
            <div className="forge-next__scene-list">
              {draft.experience.scenes.map((item,index)=><button key={item.id} type="button" data-active={index===sceneIndex} onClick={()=>selectScene(index)}>
                <Icon name="page" /><div><strong>{item.label}</strong><small>{item.copy.headline}</small></div><span>{String(index+1).padStart(2,"0")}</span>
              </button>)}
            </div>
          </> : <div className="forge-next__layer-tree">
            <LayerRow icon="frame" label={scene.label} depth={0} active />
            <LayerRow icon="text" label="Copy" depth={1} onClick={()=>{setInspectorTab("content");setCanvasTool("text");}} />
            {scene.media&&<LayerRow icon="media" label={scene.media.kind==="video"?"Video":"Media"} depth={1} onClick={()=>setMode("assets")} />}
            {draft.experience.heroModel&&<LayerRow icon="cube" label="Hero 3D" depth={1} onClick={()=>setMode("assets")} />}
            <LayerRow icon="motion" label={"Motion · "+scene.motionTracks.length} depth={1} onClick={()=>setMode("motion")} />
            <LayerRow icon="bolt" label="Interactions" depth={1} onClick={()=>setMode("interactions")} />
          </div>}
          <div className="forge-next__left-footer">
            <button type="button" onClick={()=>setMode("references")}><Icon name="reference" /><span>{draft.project.references.length} references</span></button>
            <button type="button" onClick={()=>setMode("assets")}><Icon name="media" /><span>Asset library</span></button>
          </div>
        </aside>

        <section className="forge-next__canvas-area">
          {!layersOpen&&<button className="forge-next__edge-toggle forge-next__edge-toggle--left" type="button" onClick={()=>setLayersOpen(true)}><Icon name="panelRight" /></button>}
          {!inspectorOpen&&<button className="forge-next__edge-toggle forge-next__edge-toggle--right" type="button" onClick={()=>setInspectorOpen(true)}><Icon name="panelLeft" /></button>}

          <div className="forge-next__canvas-bar">
            <div className="forge-next__canvas-context"><span>{scene?.label}</span><i>/</i><strong>Desktop</strong></div>
            <div className="forge-next__viewport-switcher" aria-label="Canvas viewport">
              <button type="button" className="active"><Icon name="desktop" /> Desktop</button>
              <button type="button"><Icon name="tablet" /></button>
              <button type="button"><Icon name="phone" /></button>
            </div>
            <div className="forge-next__canvas-actions">
              {candidate&&<div className="forge-next__candidate-toggle"><button type="button" className={previewCandidate?"":"active"} onClick={()=>setPreviewCandidate(false)}>Current</button><button type="button" className={previewCandidate?"active":""} onClick={()=>setPreviewCandidate(true)}>Candidate</button></div>}
              <button type="button" onClick={()=>setMode("motion")}><Icon name="motion" /> Animate</button>
            </div>
          </div>

          <div className="forge-next__canvas">
            <div className="forge-next__artboard-label"><span>{draft.project.name}</span><small>1200 px</small></div>
            <StudioLivePreview
              experience={previewExperience}
              active={Math.min(sceneIndex,previewExperience.scenes.length-1)}
              setActive={(index)=>{const target=previewExperience.scenes[index];if(target)setCanvasProgress(midpoint(target.range));setActiveScene(Math.min(index,draft.experience.scenes.length-1));}}
              progress={canvasProgress}
              onProgressChange={setCanvasProgress}
              cinematicSystems={draft.cinematicSystems}
            />
            <button type="button" className="forge-next__agent-launch" onClick={()=>setAiOpen((value)=>!value)} aria-expanded={aiOpen}><Icon name="sparkles" /><span>Ask Forge</span><kbd>⌘ J</kbd></button>
          </div>

          {aiOpen&&<aside className="forge-next__ai-drawer">
            <div className="forge-next__drawer-head"><div><span><Icon name="sparkles" /> Forge Agent</span><strong>Build and revise the website without leaving the canvas.</strong></div><button type="button" aria-label="Close AI Build" onClick={()=>setAiOpen(false)}><Icon name="close" /></button></div>
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
            <div className="forge-next__timeline-controls"><button type="button" onClick={()=>setMode("motion")}><Icon name="motion" /> Timeline</button><span>{Math.round(canvasProgress*100)}%</span></div>
            <div className="forge-next__timeline-track">{draft.experience.scenes.map((item,index)=><button key={item.id} type="button" data-active={index===sceneIndex} style={{flex:Math.max(.08,item.range[1]-item.range[0])}} onClick={()=>selectScene(index)}><i />{item.label}</button>)}</div>
          </div>
        </section>

        <aside className="forge-next__inspector" data-open={inspectorOpen}>
          <div className="forge-next__panel-head forge-next__panel-head--inspector">
            <div className="forge-next__inspector-tabs">
              <button type="button" aria-current={inspectorTab==="design"?"page":undefined} onClick={()=>setInspectorTab("design")}>Design</button>
              <button type="button" aria-current={inspectorTab==="content"?"page":undefined} onClick={()=>setInspectorTab("content")}>Content</button>
            </div>
            <button type="button" aria-label="Collapse inspector" onClick={()=>setInspectorOpen(false)}><Icon name="panelRight" /></button>
          </div>
          <div className="forge-next__inspector-scroll">
            {inspectorTab==="design" ? <>
              <InspectorSection title="Scene">
                <label>Name<input value={scene.label} maxLength={80} onChange={(event)=>draft.setExperience((current)=>({...current,scenes:current.scenes.map((item,index)=>index===sceneIndex?{...item,label:event.target.value}:item)}))}/></label>
                <div className="forge-next__field-grid"><Readout label="Range" value={Math.round((scene.range[1]-scene.range[0])*100)+"%"} /><Readout label="Tracks" value={String(scene.motionTracks.length)} /></div>
              </InspectorSection>
              <InspectorSection title="Experience">
                <Readout label="Hero" value={draft.experience.heroModel?"3D model":"None"} />
                <Readout label="Media" value={scene.media?.kind??"None"} />
                <Readout label="References" value={String(draft.project.references.length)} />
                <div className="forge-next__inspector-actions"><button type="button" onClick={()=>setMode("motion")}><Icon name="motion" /> Motion</button><button type="button" onClick={()=>setMode("interactions")}><Icon name="bolt" /> Interactions</button><button type="button" onClick={()=>setMode("effects")}><Icon name="sparkles" /> Effects</button><button type="button" onClick={()=>setMode("references")}><Icon name="reference" /> References</button></div>
              </InspectorSection>
              <InspectorSection title="Project">
                <button type="button" className="forge-next__row-action" onClick={()=>setMode("quality")}><span>Quality & performance</span><Icon name="chevronRight" /></button>
                <button type="button" className="forge-next__row-action" onClick={()=>setVaultOpen(true)}><span>Version history</span><Icon name="chevronRight" /></button>
              </InspectorSection>
            </> : <>
              <InspectorSection title="Content">
                <label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event)=>setSceneCopy("eyebrow",event.target.value)}/></label>
                <label>Headline<textarea rows={4} value={scene.copy.headline} onChange={(event)=>setSceneCopy("headline",event.target.value)}/></label>
                <label>Body<textarea rows={6} value={scene.copy.body??""} onChange={(event)=>setSceneCopy("body",event.target.value)}/></label>
              </InspectorSection>
              <InspectorSection title="Source">
                <button type="button" className="forge-next__row-action" onClick={()=>setMode("assets")}><span>Replace media</span><Icon name="chevronRight" /></button>
                <button type="button" className="forge-next__row-action" onClick={()=>setMode("references")}><span>Reference direction</span><Icon name="chevronRight" /></button>
              </InspectorSection>
            </>}
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
          {mode==="publish"&&<PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} interactionGraph={draft.interactionGraph} cinematicSystems={draft.cinematicSystems} validationCount={draft.validation.length} healthReady={projectHealth.status==="ready"} healthSummary={projectHealth.issues[0]?.detail??"Project Health needs attention."}/>}
        </div>
      </section>}
    </div>

    {notice&&<button type="button" className="forge-next__toast" onClick={()=>setNotice("")}>{notice}<span>×</span></button>}
    {commandOpen&&<div className="forge-next__command-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setCommandOpen(false);}}><div className="forge-next__command">
      <div className="forge-next__command-input"><Icon name="search" /><input ref={commandInput} aria-label="Forge command" value={commandValue} placeholder="Search commands and tools…" onChange={(event)=>setCommandValue(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter"){runCommand(commandValue);setCommandValue("");}}}/><kbd>esc</kbd></div>
      <div className="forge-next__command-grid">{[...modes,{id:"quality" as const,label:"Quality",short:"Q"},{id:"publish" as const,label:"Publish",short:"P"}].map((item)=><button type="button" key={item.id} onClick={()=>{setMode(item.id);setCommandOpen(false);}}><Icon name={modeIcon(item.id)} /><strong>{item.label}</strong></button>)}<button type="button" onClick={()=>{setAiOpen(true);setMode("design");setCommandOpen(false);}}><Icon name="sparkles" /><strong>AI Build</strong></button><button type="button" onClick={()=>{setNewProjectOpen(true);setCommandOpen(false);}}><Icon name="plus" /><strong>New website</strong></button><button type="button" onClick={()=>{setVaultOpen(true);setCommandOpen(false);}}><Icon name="history" /><strong>Versions</strong></button><button type="button" onClick={()=>{setLoopOpen(true);setCommandOpen(false);}}><Icon name="wand" /><strong>Improve current site</strong></button></div>
    </div></div>}
    {loopOpen&&<LoopEnginePanel
      projectId={draft.project.id}
      projectName={draft.project.name}
      workingBundle={{experience:draft.experience,assetManifest:draft.assetManifest,interactionGraph:draft.interactionGraph,cinematicSystems:draft.cinematicSystems}}
      proposal={null}
      onCandidateReady={(next)=>{draft.applyProjectBundle({experience:next.experience,assetManifest:next.assetManifest,interactionGraph:next.interactionGraph,cinematicSystems:next.cinematicSystems});setLoopOpen(false);setCandidate(null);setPreviewCandidate(false);setNotice("Verified improvement candidate applied to the working draft.");}}
      onOpenVault={()=>{setLoopOpen(false);setVaultOpen(true);}}
      onClose={()=>setLoopOpen(false)}
    />}
    {vaultOpen&&<StudioVaultPanel draft={draft} onClose={()=>setVaultOpen(false)} onProjectChange={()=>{setCandidate(null);setPreviewCandidate(false);setActiveScene(0);}}/>}
    {newProjectOpen&&<NewProjectDialog name={newName} setName={setNewName} kind={newKind} setKind={setNewKind} onCreate={()=>startProject(newName,newKind)} onClose={()=>setNewProjectOpen(false)}/>}
  </main>;
}
function LayerRow({icon,label,depth,active,onClick}:{icon:IconName;label:string;depth:number;active?:boolean;onClick?:()=>void}){
  return <button type="button" className="forge-next__layer-row" data-active={active} style={{paddingLeft:10+depth*18}} onClick={onClick}><Icon name={icon}/><span>{label}</span></button>;
}

function InspectorSection({title,children}:{title:string;children:React.ReactNode}){
  return <section className="forge-next__inspector-section"><h3>{title}</h3>{children}</section>;
}

function Readout({label,value}:{label:string;value:string}){
  return <div className="forge-next__readout"><span>{label}</span><strong>{value}</strong></div>;
}

type IconName="cursor"|"frame"|"text"|"media"|"reference"|"motion"|"undo"|"redo"|"play"|"more"|"layers"|"bolt"|"sparkles"|"shield"|"command"|"panelLeft"|"panelRight"|"plus"|"page"|"cube"|"desktop"|"tablet"|"phone"|"close"|"chevronDown"|"chevronRight"|"search"|"history"|"wand"|"quality"|"publish";

function modeIcon(mode:Mode|"quality"|"publish"):IconName {
  if(mode==="design") return "layers";
  if(mode==="references") return "reference";
  if(mode==="motion") return "motion";
  if(mode==="interactions") return "bolt";
  if(mode==="assets") return "media";
  if(mode==="effects") return "sparkles";
  if(mode==="quality") return "shield";
  return "publish";
}

function Icon({name}:{name:IconName}){
  const common={width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.7,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,ariaHidden:true};
  const paths:Record<IconName,React.ReactNode>={
    cursor:<><path d="M5 3l12 9-6 1.4L9 19z"/><path d="M11 13l4 5"/></>,
    frame:<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4"/></>,
    text:<><path d="M5 6h14M12 6v12M8 18h8"/></>,
    media:<><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M6 16l4-4 3 3 2-2 3 3"/><circle cx="15.5" cy="9" r="1.3"/></>,
    reference:<><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 13v7M13 16.5h7"/></>,
    motion:<><path d="M4 12h3l2-5 4 10 2-5h5"/></>,
    undo:<><path d="M9 7L4 12l5 5"/><path d="M5 12h8a6 6 0 010 12"/></>,
    redo:<><path d="M15 7l5 5-5 5"/><path d="M19 12h-8a6 6 0 000 12"/></>,
    play:<path d="M8 5l11 7-11 7z"/>,
    more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    layers:<><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/></>,
    bolt:<path d="M13 2L5 14h6l-1 8 9-13h-6z"/>,
    sparkles:<><path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></>,
    shield:<path d="M12 3l7 3v5c0 4.6-2.9 8.1-7 10-4.1-1.9-7-5.4-7-10V6z"/>,
    command:<><path d="M9 8V6a3 3 0 10-3 3h12a3 3 0 10-3-3v12a3 3 0 103-3H6a3 3 0 103 3z"/></>,
    panelLeft:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
    panelRight:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></>,
    plus:<><path d="M12 5v14M5 12h14"/></>,
    page:<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/></>,
    cube:<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></>,
    desktop:<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    tablet:<><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/></>,
    phone:<><rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/></>,
    close:<><path d="M6 6l12 12M18 6L6 18"/></>,
    chevronDown:<path d="M7 9l5 5 5-5"/>,
    chevronRight:<path d="M9 6l6 6-6 6"/>,
    search:<><circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/></>,
    history:<><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    wand:<><path d="M4 20L16 8M13 5l2-2M19 9l2-2M18 16l2 2M6 6L4 4"/><path d="M14 6l4 4"/></>,
    quality:<path d="M12 3l7 3v5c0 4.6-2.9 8.1-7 10-4.1-1.9-7-5.4-7-10V6z"/>,
    publish:<><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 13v7h14v-7"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
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
