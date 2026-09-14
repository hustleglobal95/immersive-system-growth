"use client";

import { useEffect, useRef, useState } from "react";
import { StudioIcon, type StudioIconName } from "./pro/StudioIcon";
import { StudioDialog } from "./pro/StudioDialog";
import Link from "next/link";
import rawExperience from "@/src/experiences/heliot/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawCreativeDirection from "@/config/creative-direction.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { GlbInspectorPanel } from "@/src/studio/GlbInspectorPanel";
import { TimelineEditor } from "@/src/studio/TimelineEditor";
import { MaskLab } from "@/src/studio/MaskLab";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { SceneDirector } from "@/src/studio/SceneDirector";
import { LayerEditor } from "@/src/studio/LayerEditor";
import { AssetManager } from "@/src/studio/AssetManager";
import { AssetBankPanel } from "@/src/studio/AssetBankPanel";
import { TemplateGallery } from "@/src/studio/TemplateGallery";
import { RecipeEditor } from "@/src/studio/RecipeEditor";
import { SequencerEditor } from "@/src/studio/SequencerEditor";
import { InteractionGraphEditor } from "@/src/studio/InteractionGraphEditor";
import { StudioWorkspace } from "@/src/studio/StudioWorkspace";
import type { AssetManifest } from "@/src/types/assets";
import { IntegrationsPanel, ProjectPanel, PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import { CreativeDirectionPanel } from "@/src/studio/CreativeDirectionPanel";
import { VisualSystemsPanel } from "@/src/studio/VisualSystemsPanel";
import { parseCreativeDirection } from "@/src/platform/creativeDirectionSchema";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject({ ...rawProject, id: "heliot", name: "HELIOT Observatory", experiencePath: "src/experiences/heliot/experience.json" });
const initialAssetManifest = rawAssetManifest as AssetManifest;
const initialInteractionGraph = parseInteractionGraph(rawInteractionGraph);
const initialCreativeDirection = parseCreativeDirection(rawCreativeDirection);
const tabs = ["workspace", "project", "creative", "visuals", "recipe", "templates", "preview", "director", "timeline", "sequence", "interactions", "masks", "layers", "assets", "bank", "model", "integrations", "publish", "telemetry"] as const;
type Tab = (typeof tabs)[number];

export function StudioWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialAssetManifest, initialInteractionGraph);
  const [tab, setTab] = useState<Tab>("workspace");
  const [creative, setCreative] = useState(initialCreativeDirection);
  const [activeScene, setActiveScene] = useState(0);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandsOpen(open => !open); }
      if (event.key === "?" && !(event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]') && !document.querySelector('dialog[open]')) { event.preventDefault(); setHelpOpen(true); }
    };
    window.addEventListener('keydown',listener); return () => window.removeEventListener('keydown',listener);
  }, []);
  const openTab = (next: Tab) => { setTab(next); setCommandsOpen(false); setMoreOpen(false); };
  const primary: Tab[] = ['workspace','sequence','bank','templates','project','publish'];
  const icons: Partial<Record<Tab,StudioIconName>> = { workspace:'scene',sequence:'key',bank:'cube',templates:'layers',project:'folder',publish:'export' };
  const labels: Partial<Record<Tab,string>> = {workspace:'Compose',sequence:'Animate',bank:'Assets',templates:'Templates',project:'Project',publish:'Deliver'};

  const importExperience = async (file: File | undefined) => {
    if (!file) return;
    try {
      draft.setExperience(parseExperience(JSON.parse(await file.text())));
      setActiveScene(0);
      setNotice("Experience imported and validated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The experience file is invalid.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const active = Math.min(activeScene, draft.experience.scenes.length - 1);

  return (
    <main className="studio-shell studio-pro" data-area={tab}>
      <header className="studio-header">
        <div className="pro-brand-lockup"><Link href="/" className="studio-brand" aria-label="Forge home"><svg width="25" height="30" viewBox="0 0 25 30" fill="none" aria-hidden="true"><path d="M2 28V2h22L18 9H9v5h10l-6 7H9v7H2Z" fill="currentColor" /></svg>FORGE<span>STUDIO</span></Link><i /><span className="pro-edition">CINEMATIC AUTHORING</span></div>
        <button className="pro-command-trigger" onClick={()=>{setCommandQuery('');setCommandsOpen(true);}}><StudioIcon name="search" /><span>Find a tool or scene...</span><kbd>Ctrl / Cmd K</kbd></button>
        <div className="studio-actions">
          <div className="studio-header__status" data-valid={!draft.validation.length&&!draft.storageNotice} title={draft.validation.length?'Draft needs attention':'Production schema valid'}><i /><span>{draft.storageNotice?'Backup needed':draft.hydrated?'Local autosave':'Opening draft'}</span></div>
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={event=>void importExperience(event.target.files?.[0])} />
          <button type="button" aria-label="Import" title="Import experience JSON" onClick={()=>importRef.current?.click()}><StudioIcon name="import" /></button>
          <button type="button" aria-label="Export" title="Export current experience" onClick={()=>{try{downloadJson('experience.json',parseExperience(draft.experience));}catch{setNotice('Export blocked: repair validation errors first.');}}}><StudioIcon name="export" /></button>
          <button type="button" aria-label="Studio help" title="Workflow and shortcuts (?)" onClick={()=>setHelpOpen(true)}><StudioIcon name="help" /></button>
        </div>
      </header>
      <nav className="pro-tool-rail" aria-label="Studio areas">
        {primary.map(item=><button key={item} type="button" aria-label={item} aria-current={tab===item?'page':undefined} title={titleFor(item)} onClick={()=>openTab(item)}><StudioIcon name={icons[item]??'settings'} /><span>{labels[item]}</span></button>)}
        <div className="pro-more-tools"><button type="button" aria-expanded={moreOpen} aria-controls="pro-tools-menu" title="All production tools" onClick={()=>setMoreOpen(!moreOpen)}><StudioIcon name="more" /><span>More tools</span></button>{moreOpen&&<div id="pro-tools-menu" className="pro-tools-menu"><header><span>PRODUCTION TOOLS</span><button aria-label="Close tools" onClick={()=>setMoreOpen(false)}><StudioIcon name="close" /></button></header>{tabs.filter(t=>!primary.includes(t)).map(item=><button key={item} aria-label={item} onClick={()=>openTab(item)}>{titleFor(item)}<StudioIcon name="chevron" /></button>)}</div>}</div>
        <div className="pro-rail-bottom"><span>LOCAL</span><i /></div>
      </nav>
      <div className="pro-main-content">
      {draft.storageNotice && <div className="studio-warning" role="alert" data-testid="studio-storage-warning">
        <strong>Draft storage</strong>
        <p>{draft.storageNotice}</p>
        {draft.recoveryLocked && <button type="button" onClick={draft.exportRecovery}>Export recovery copy</button>}
      </div>}

      {tab !== "workspace" && <div className="studio-title">
        <div><span>{draft.project.id}</span><h1>{titleFor(tab)}</h1></div>
        <div>
          <button type="button" onClick={()=>{if(window.confirm("Reset this draft to its initial project? Export a backup first."))draft.reset();}}>Reset draft</button>
          <small>{draft.storageNotice ? "Export a backup before leaving." : "Changes save locally until exported."}</small>
        </div>
      </div>}

      {draft.validation.length > 0 && (
        <div className="studio-validation" role="alert">
          <strong>Validation</strong>
          {draft.validation.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      )}
      {notice && <p className="studio-message" role="status">{notice}</p>}

      {tab === "workspace" && <StudioWorkspace experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience} onProjectLoad={key=>draft.setProject(current=>({...current,id:key.toLowerCase(),name:key==='HELIOT'?'HELIOT Observatory':'NOCTERRA Residences',experiencePath:key==='HELIOT'?'src/experiences/heliot/experience.json':'clients/nocterra-residences/experience.json'}))} />}
      {tab === "project" && <ProjectPanel {...draft} />}
      {tab === "creative" && <CreativeDirectionPanel direction={creative} setDirection={setCreative} />}
      {tab === "visuals" && <VisualSystemsPanel />}
      {tab === "recipe" && <RecipeEditor experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} />}
      {tab === "templates" && <TemplateGallery experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "preview" && <StudioLivePreview experience={draft.experience} active={active} setActive={setActiveScene} />}
      {tab === "director" && <SceneDirector experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} />}
      {tab === "timeline" && <TimelineEditor experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} />}
      {tab === "sequence" && <SequencerEditor experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} beginGroup={draft.beginExperienceGroup} endGroup={draft.endExperienceGroup} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience} />}
      {tab === "interactions" && <InteractionGraphEditor graph={draft.interactionGraph} setGraph={draft.setInteractionGraph} />}
      {tab === "masks" && <MaskLab experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} />}
      {tab === "layers" && <LayerEditor experience={draft.experience} setExperience={draft.setExperience} active={active} setActive={setActiveScene} />}
      {tab === "assets" && <AssetManager setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} active={active} />}
      {tab === "bank" && <AssetBankPanel experience={draft.experience} setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} interactionGraph={draft.interactionGraph} undo={draft.undoExperience} canUndo={draft.canUndoExperience} />}
      {tab === "model" && <GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "integrations" && <IntegrationsPanel project={draft.project} setProject={draft.setProject} />}
      {tab === "publish" && <PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} />}
      {tab === "telemetry" && <TelemetryPanel project={draft.project} setProject={draft.setProject} />}

      </div>
      <footer className="studio-footer"><span><i className="pro-status-dot" />{draft.validation.length?'Validation needs attention':'Production schema valid'}</span><span>Drafts stay on this device / Export to back up</span><span>FORGE / STUDIO 01</span></footer>
      <StudioDialog open={commandsOpen} title="Where do you want to go?" onClose={()=>setCommandsOpen(false)}>
        <label className="pro-command-search"><StudioIcon name="search" /><input autoFocus aria-label="Search commands" placeholder="Camera, library, timeline, a scene..." value={commandQuery} onChange={e=>setCommandQuery(e.target.value)} /></label>
        <div className="pro-command-results"><span className="pro-kicker">TOOLS</span>{tabs.filter(t=>`${t} ${titleFor(t)}`.toLowerCase().includes(commandQuery.toLowerCase())).map(t=><button key={t} onClick={()=>openTab(t)}><StudioIcon name={icons[t]??'settings'} /><span>{titleFor(t)}</span><StudioIcon name="chevron" /></button>)}<span className="pro-kicker">SCENES</span>{draft.experience.scenes.map((s,i)=>({s,i})).filter(({s})=>s.label.toLowerCase().includes(commandQuery.toLowerCase())).map(({s,i})=><button key={s.id} onClick={()=>{setActiveScene(i);openTab('workspace');window.setTimeout(()=>window.dispatchEvent(new CustomEvent('forge:seek-scene',{detail:i})),0);}}><StudioIcon name="camera" /><span>{s.label}</span><small>{String(i+1).padStart(2,'0')}</small></button>)}</div>
      </StudioDialog>
      <StudioDialog open={helpOpen} title="From a scene to a story." onClose={()=>setHelpOpen(false)} wide>
        <p className="pro-dialog-intro">A focused workflow, with precise controls when you need them. This is a scene-authoring tool, not a replacement for 3D modeling software.</p>
        <div className="pro-help-grid">{[['01','Set the stage','Load HELIOT or NOCTERRA. Add or duplicate a scene. Use Objects or the asset library to place your models.'],['02','Compose your shot','Enter Orbit / edit view. Drag to orbit, right-drag to pan, and scroll to zoom. Capture start and end frames in Camera.'],['03','Direct the atmosphere','Use Light and Surface to set the mood. Edit copy in Story. Open Animate for timed motion tracks and keyframes.'],['04','Review and preserve','Preview desktop and mobile, save a named snapshot, and export JSON. Assets must remain available at their configured paths.']].map(([n,title,body])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="pro-shortcuts">{[['Ctrl / Cmd K','Find tools'],['Ctrl / Cmd S','Snapshot'],['Ctrl / Cmd Z','Undo'],['Ctrl / Cmd Shift Z','Redo'],['Space','Play / pause'],['F','Frame selection'],['W / E / R','Move / rotate / scale'],['1 / 2 / 3','Camera / object / light'],['Esc','Exit focus or close dialog']].map(([key,action])=><div key={key}><span>{action}</span><kbd>{key}</kbd></div>)}</div>
      </StudioDialog>
    </main>
  );
}

function titleFor(tab: Tab) {
  return {
    workspace: "Cinematic workspace", project: "Project control", creative: "Creative direction", visuals: "Visual systems",
    recipe: "Recipe editor", templates: "Industry template gallery", preview: "Live production preview",
    director: "Camera and art direction", timeline: "Visual timeline", sequence: "Motion sequencer", interactions: "Interaction graph",
    masks: "Mask reveal laboratory", layers: "Transition layer composer", assets: "Asset intake and budgets", bank: "Asset bank",
    model: "Model inspection", integrations: "Content connections", publish: "Release pipeline", telemetry: "Device performance",
  }[tab];
}
