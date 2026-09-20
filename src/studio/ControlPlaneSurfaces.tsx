"use client";

import { parseExperience } from "@/src/lib/configSchema";
import type { ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import type { NextAction } from "@/src/platform/control-plane/nextAction";
import type { ProjectHealthReport } from "@/src/platform/control-plane/projectHealth";
import type { ForgeProposal } from "@/src/platform/control-plane/proposal";
import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";
import { PublishPanel } from "@/src/studio/ProjectPanels";
import type { useStudioDraft } from "@/src/studio/useStudioDraft";
import type { ExperienceConfig, SceneDefinition, Vec3 } from "@/src/types/experience";

export type AdvancedWorkspaceName="Motion"|"Interact"|"Assets"|"Visuals"|"Telemetry";

export function ContextualDirection({ context, capabilities, proposal, nextActions, onCapability }: {
  context:SelectionContext;
  capabilities:ResolvedCapability[];
  proposal:ForgeProposal|null;
  nextActions:NextAction[];
  onCapability:(capability:ResolvedCapability)=>void;
}) {
  const directionLabel=context.kind==="camera" ? "CAMERA DIRECTION"
    : context.kind==="node" ? "OBJECT DIRECTION"
      : context.kind==="copy" ? "COPY DIRECTION"
        : context.kind==="media" ? "MEDIA DIRECTION"
          : context.kind==="asset" ? "ASSET DIRECTION"
            : context.kind==="environment" ? "ENVIRONMENT DIRECTION"
              : "SCENE DIRECTION";
  const highestIssue=context.issues.find((issue)=>issue.severity==="blocker")
    ?? context.issues.find((issue)=>issue.severity==="warning")
    ?? context.issues[0];
  const recommendedIds=new Set(nextActions.map((item)=>item.capability.id));
  const primary=[...nextActions.map((item)=>item.capability),...capabilities.filter((item)=>!recommendedIds.has(item.id))].slice(0,3);
  const activeProposal=proposal?.selectionKey===context.selectionKey ? proposal : null;

  return <section className="production-context" data-kind={context.kind}>
    <span>{directionLabel}</span>
    <strong>{context.summary}</strong>
    <p>{highestIssue?.message ?? primary[0]?.description ?? "Forge has enough context to direct this selection without exposing subsystem machinery first."}</p>
    <div>
      {primary.map((capability,index)=><button
        key={capability.id}
        type="button"
        className={index===0 ? "primary" : undefined}
        title={capability.description}
        data-capability={capability.id}
        data-risk={capability.riskClass}
        onClick={()=>onCapability(capability)}
      >{capability.label}</button>)}
    </div>
    <small>{context.signals.join(" · ")}</small>
    {activeProposal && <div className="production-context__proposal" data-risk={activeProposal.riskClass}>
      <span>PROPOSAL · {activeProposal.riskClass.replaceAll("-"," ").toUpperCase()}</span>
      <strong>{activeProposal.intent.raw}</strong>
      <small>{activeProposal.verification.required.length ? `Verify: ${activeProposal.verification.required.join(" · ")}` : "No verification gate required before routing."}</small>
    </div>}
  </section>;
}

export function RefinePanel({ context, experience, setExperience, openAdvanced, openAnimate }: {
  context:SelectionContext;
  experience:ExperienceConfig;
  setExperience:ReturnType<typeof useStudioDraft>["setExperience"];
  openAdvanced:(target?:AdvancedWorkspaceName)=>void;
  openAnimate:(target?:string)=>void;
}) {
  const scene=experience.scenes[context.sceneIndex];

  if(context.kind==="camera") return <div className="production-inspector">
    <Section title="Camera">
      <label>Path<select aria-label="Camera path" value={scene.camera.path} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,path:event.target.value as SceneDefinition["camera"]["path"]}}))}>{["linear","dolly","arc","orbit","crane","threshold","flyby","swoop","macro","pullback","subject-orbit"].map((value)=><option key={value}>{value}</option>)}</select></label>
      <div className="production-quick-grid">
        <label>Start FOV<input aria-label="Camera start FOV" type="number" min="15" max="90" step="1" value={scene.camera.from.fov} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,from:{...current.camera.from,fov:bounded(event.target.value,current.camera.from.fov,15,90)}}}))}/></label>
        <label>End FOV<input aria-label="Camera end FOV" type="number" min="15" max="90" step="1" value={scene.camera.to.fov} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,to:{...current.camera.to,fov:bounded(event.target.value,current.camera.to.fov,15,90)}}}))}/></label>
      </div>
      <Vec3Fields label="Start position" ariaPrefix="Camera start position" value={scene.camera.from.position} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,from:{...current.camera.from,position:safeCameraPosition(value,current.camera.from.target,current.camera.from.position)}}}))}/>
      <Vec3Fields label="End position" ariaPrefix="Camera end position" value={scene.camera.to.position} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,to:{...current.camera.to,position:safeCameraPosition(value,current.camera.to.target,current.camera.to.position)}}}))}/>
      <Vec3Fields label="Start target" ariaPrefix="Camera start target" value={scene.camera.from.target} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,from:{...current.camera.from,target:safeCameraTarget(value,current.camera.from.position,current.camera.from.target)}}}))}/>
      <Vec3Fields label="End target" ariaPrefix="Camera end target" value={scene.camera.to.target} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,camera:{...current.camera,to:{...current.camera.to,target:safeCameraTarget(value,current.camera.to.position,current.camera.to.target)}}}))}/>
      <label className="studio-check"><input aria-label="Enable mobile camera override" type="checkbox" checked={!!scene.mobileCamera} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,mobileCamera:event.target.checked?structuredClone(current.camera):undefined}))}/> Mobile camera override</label>
      {scene.mobileCamera&&<div className="production-quick-grid"><label>Mobile path<select aria-label="Mobile camera path" value={scene.mobileCamera.path} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,mobileCamera:current.mobileCamera?{...current.mobileCamera,path:event.target.value as SceneDefinition["camera"]["path"]}:current.camera}))}>{["linear","dolly","arc","orbit","crane","threshold","flyby","swoop","macro","pullback","subject-orbit"].map((value)=><option key={value}>{value}</option>)}</select></label><label>Mobile end FOV<input aria-label="Mobile camera end FOV" type="number" min="15" max="90" step="1" value={scene.mobileCamera.to.fov} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,mobileCamera:current.mobileCamera?{...current.mobileCamera,to:{...current.mobileCamera.to,fov:bounded(event.target.value,current.mobileCamera.to.fov,15,90)}}:current.camera}))}/></label></div>}
    </Section>
    <Section title="Motion"><button type="button" onClick={()=>openAnimate("camera.position")}>Animate camera</button><button type="button" onClick={()=>openAnimate("camera.fov")}>Animate lens</button><button type="button" onClick={()=>openAdvanced("Motion")}>Advanced keyframes & curves</button></Section>
  </div>;

  if(context.kind==="node") {
    const node=context.selection.kind==="node" ? context.selection.name : context.label;
    return <div className="production-inspector">
      <Section title="Selected object">
        <div className="production-readout"><span>Rig node</span><strong>{node}</strong></div>
        <div className="production-readout"><span>Authored tracks</span><strong>{context.state.selectedNodeTrackCount}</strong></div>
        <div className="production-readout"><span>Interaction references</span><strong>{context.state.interactionReferenceCount}</strong></div>
      </Section>
      <Section title="Animate this part">
        <button type="button" onClick={()=>openAnimate(`rig:${node}:position`)}>Position</button>
        <button type="button" onClick={()=>openAnimate(`rig:${node}:rotation`)}>Rotation</button>
        <button type="button" onClick={()=>openAnimate(`rig:${node}:scale`)}>Scale</button>
        <button type="button" onClick={()=>openAnimate(`rig:${node}:opacity`)}>Opacity</button>
      </Section>
      <Section title="Behavior"><button type="button" onClick={()=>openAdvanced("Interact")}>Add / edit interaction</button><button type="button" onClick={()=>openAdvanced("Motion")}>Advanced keyframes</button></Section>
    </div>;
  }

  if(context.kind==="environment") return <div className="production-inspector">
    <Section title="Lighting & atmosphere">
      <div className="production-quick-grid">
        <NumberControl label="Exposure" ariaLabel="Environment exposure" value={scene.world.exposure} min={.25} max={3} step={.05} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,exposure:value}}))}/>
        <NumberControl label="Ambient" ariaLabel="Environment ambient" value={scene.world.ambient} min={0} max={20} step={.1} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,ambient:value}}))}/>
        <NumberControl label="Key light" ariaLabel="Environment key light" value={scene.world.key} min={0} max={50} step={.1} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,key:value}}))}/>
        <NumberControl label="Rim light" ariaLabel="Environment rim light" value={scene.world.rim} min={0} max={50} step={.1} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,rim:value}}))}/>
        <NumberControl label="Fog density" ariaLabel="Environment fog density" value={scene.world.fogDensity} min={0} max={.15} step={.005} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,fogDensity:value}}))}/>
        <NumberControl label="Bloom" ariaLabel="Environment bloom" value={scene.post.bloom} min={0} max={2} step={.05} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,post:{...current.post,bloom:value}}))}/>
        <NumberControl label="Vignette" ariaLabel="Environment vignette" value={scene.post.vignette} min={0} max={1} step={.05} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,post:{...current.post,vignette:value}}))}/>
      </div>
      <div className="production-quick-grid production-quick-grid--colors">
        <ColorControl label="Background" ariaLabel="Environment background color" value={scene.world.background} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,background:value}}))}/>
        <ColorControl label="Fog" ariaLabel="Environment fog color" value={scene.world.fog} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,fog:value}}))}/>
        <ColorControl label="Key color" ariaLabel="Environment key color" value={scene.world.keyColor} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,keyColor:value}}))}/>
        <ColorControl label="Rim color" ariaLabel="Environment rim color" value={scene.world.rimColor} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,world:{...current.world,rimColor:value}}))}/>
      </div>
    </Section>
    <Section title="Sequence"><button type="button" onClick={()=>openAnimate("world.exposure")}>Animate exposure</button><button type="button" onClick={()=>openAnimate("world.key")}>Animate key light</button><button type="button" onClick={()=>openAdvanced("Motion")}>Advanced timing</button></Section>
  </div>;

  if(context.kind==="copy") return <div className="production-inspector">
    <Section title="Copy">
      <label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,eyebrow:event.target.value}}))} /></label>
      <label>Headline<textarea required minLength={1} rows={3} value={scene.copy.headline} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,headline:event.target.value}}))} /></label>
      <label>Body<textarea required minLength={1} rows={4} value={scene.copy.body} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,body:event.target.value}}))} /></label>
    </Section>
    <Section title="Motion"><button type="button" onClick={()=>openAnimate("copy.opacity")}>Animate typography</button><button type="button" onClick={()=>openAdvanced("Motion")}>Advanced timing</button></Section>
  </div>;

  if(context.kind==="media") return <div className="production-inspector">
    <Section title="Media presentation">
      <div className="production-readout"><span>Kind</span><strong>{scene.media?.kind ?? "None"}</strong></div>
      <div className="production-readout"><span>Source</span><strong>{scene.media?.src?.split("/").pop() ?? scene.media?.fill ?? "—"}</strong></div>
      {scene.media&&<>
        <label>Transition<select aria-label="Media transition" value={scene.media.transition} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,transition:event.target.value as NonNullable<SceneDefinition["media"]>["transition"]}}):current)}>{["slide","curtain","zoom","dissolve","wipe","mask","cut"].map((value)=><option key={value}>{value}</option>)}</select></label>
        <label>Direction<select aria-label="Media direction" value={scene.media.direction} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,direction:event.target.value as NonNullable<SceneDefinition["media"]>["direction"]}}):current)}>{["up","down","left","right"].map((value)=><option key={value}>{value}</option>)}</select></label>
        <div className="production-quick-grid">
          <NumberControl label="Overlap" ariaLabel="Media overlap" value={scene.media.overlap} min={.1} max={.45} step={.01} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,overlap:value}}):current)}/>
          <NumberControl label="Zoom" ariaLabel="Media zoom" value={scene.media.zoom} min={1} max={1.18} step={.01} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,zoom:value}}):current)}/>
          <NumberControl label="Scrim" ariaLabel="Media scrim" value={scene.media.scrim??0} min={0} max={1} step={.05} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,scrim:value}}):current)}/>
          <NumberControl label="Mask softness" ariaLabel="Media mask softness" value={scene.media.maskSoftness} min={0} max={100} step={1} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,maskSoftness:value}}):current)}/>
        </div>
        <PositionFields label="Desktop position" ariaPrefix="Media desktop position" value={scene.media.position} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,position:value}}):current)}/>
        <PositionFields label="Mobile position" ariaPrefix="Media mobile position" value={scene.media.mobilePosition} onChange={(value)=>updateScene(setExperience,context.sceneIndex,(current)=>current.media?({...current,media:{...current.media,mobilePosition:value}}):current)}/>
      </>}
    </Section>
    <Section title="Motion & source"><button type="button" disabled={!scene.media} onClick={()=>openAnimate("media.reveal")}>Animate reveal</button><button type="button" disabled={!scene.media} onClick={()=>openAnimate("media.opacity")}>Animate opacity</button><button type="button" onClick={()=>openAdvanced("Assets")}>Replace / inspect source</button><button type="button" onClick={()=>openAdvanced("Motion")}>Advanced timing</button></Section>
  </div>;

  if(context.kind==="asset") {
    const asset=context.selectedAsset;
    return <div className="production-inspector"><Section title="Selected asset">
      <div className="production-readout"><span>Type</span><strong>{asset?.kind ?? "Unavailable"}</strong></div>
      <div className="production-readout"><span>File</span><strong>{asset?.entry.path.split("/").pop() ?? "Missing"}</strong></div>
      <div className="production-readout"><span>Manifest health</span><strong>{Math.round(context.state.manifestHealth)}/100</strong></div>
      <button type="button" onClick={()=>openAdvanced("Assets")}>Replace / optimize / inspect</button>
    </Section></div>;
  }

  return <div className="production-inspector">
    <Section title="Content">
      <label>Name<input required minLength={1} value={scene.label} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,label:event.target.value}))} /></label>
      <label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,eyebrow:event.target.value}}))} /></label>
      <label>Headline<textarea required minLength={1} rows={3} value={scene.copy.headline} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,headline:event.target.value}}))} /></label>
      <label>Body<textarea required minLength={1} rows={4} value={scene.copy.body} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,body:event.target.value}}))} /></label>
    </Section>
    <Section title="Motion"><button type="button" onClick={()=>openAnimate()}>Animate scene</button><button type="button" onClick={()=>openAdvanced("Motion")}>Advanced keyframes</button></Section>
  </div>;
}

function Vec3Fields({label,ariaPrefix,value,onChange}:{label:string;ariaPrefix:string;value:Vec3;onChange:(value:Vec3)=>void}) {
  return <fieldset className="production-vector-fields"><legend>{label}</legend>{(["X","Y","Z"] as const).map((axis,index)=><label key={axis}>{axis}<input aria-label={`${ariaPrefix} ${axis}`} type="number" step=".05" value={value[index]} onChange={(event)=>{const next=[...value] as Vec3;const parsed=Number(event.target.value);if(Number.isFinite(parsed)){next[index]=parsed;onChange(next);}}}/></label>)}</fieldset>;
}

function PositionFields({label,ariaPrefix,value,onChange}:{label:string;ariaPrefix:string;value:[number,number];onChange:(value:[number,number])=>void}) {
  return <fieldset className="production-vector-fields production-vector-fields--two"><legend>{label}</legend>{(["X","Y"] as const).map((axis,index)=><label key={axis}>{axis}<input aria-label={`${ariaPrefix} ${axis}`} type="number" min="0" max="100" step="1" value={value[index]} onChange={(event)=>{const next=[...value] as [number,number];next[index]=bounded(event.target.value,value[index],0,100);onChange(next);}}/></label>)}</fieldset>;
}

function NumberControl({label,ariaLabel,value,min,max,step,onChange}:{label:string;ariaLabel:string;value:number;min:number;max:number;step:number;onChange:(value:number)=>void}) {
  return <label>{label}<input aria-label={ariaLabel} type="number" min={min} max={max} step={step} value={value} onChange={(event)=>onChange(bounded(event.target.value,value,min,max))}/></label>;
}

function ColorControl({label,ariaLabel,value,onChange}:{label:string;ariaLabel:string;value:string;onChange:(value:string)=>void}) {
  return <label>{label}<input aria-label={ariaLabel} type="color" value={value} onChange={(event)=>onChange(event.target.value)}/></label>;
}

function bounded(raw:string,fallback:number,min:number,max:number) {
  const value=Number(raw);
  return Number.isFinite(value) ? Math.max(min,Math.min(max,value)) : fallback;
}

function safeCameraTarget(target:Vec3,position:Vec3,fallback:Vec3):Vec3 {
  return Math.hypot(...target.map((value,index)=>value-position[index]))>.001 ? target : fallback;
}

function safeCameraPosition(position:Vec3,target:Vec3,fallback:Vec3):Vec3 {
  return Math.hypot(...position.map((value,index)=>value-target[index]))>.001 ? position : fallback;
}

export function ReviewSurface({ health, nextActions, proposal, onRun, onBuildScene, onBuild, onAssets, onTelemetry }: {
  health:ProjectHealthReport;
  nextActions:NextAction[];
  proposal:ForgeProposal|null;
  onRun:(capability:ResolvedCapability)=>void;
  onBuildScene:(index:number)=>void;
  onBuild:()=>void;
  onAssets:()=>void;
  onTelemetry:()=>void;
}) {
  const blockers=health.issues.filter((issue)=>issue.severity==="blocker").length;
  const warnings=health.issues.filter((issue)=>issue.severity==="warning").length;
  return <div className="production-primary-surface production-review-surface">
    <header className="production-surface-hero">
      <div><span>REVIEW / PROJECT HEALTH</span><h2>{health.status==="ready" ? "Ready for release review." : health.status==="blocked" ? "Resolve blockers before shipping." : "Production quality needs attention."}</h2><p>One health model combines validation, assets, motion, mobile and interaction readiness. Specialist audits remain underneath this surface.</p></div>
      <output data-health={health.status}>{Math.round(health.score)}/100 · {health.status.toUpperCase()}</output>
    </header>

    <section className="production-health-metrics" aria-label="Project health metrics">
      <article><span>Scenes</span><strong>{health.metrics.scenesWithMotion}/{health.metrics.scenes}</strong><small>with authored motion</small></article>
      <article><span>Mobile</span><strong>{health.metrics.scenesWithMobileCamera}/{health.metrics.scenes}</strong><small>with mobile camera</small></article>
      <article><span>Assets</span><strong>{Math.round(health.metrics.manifestHealth)}/100</strong><small>{health.metrics.registeredAssets} registered</small></article>
      <article><span>Interactions</span><strong>{health.metrics.interactionNodes}</strong><small>graph nodes</small></article>
    </section>

    <section className="production-health-issues">
      <div className="production-surface-section-head"><div><span>WHAT NEEDS ATTENTION</span><strong>{blockers} blocker{blockers===1?"":"s"} · {warnings} warning{warnings===1?"":"s"}</strong></div><button type="button" onClick={onBuild}>Back to Build</button></div>
      {health.issues.length ? health.issues.map((issue)=><article key={issue.id} data-severity={issue.severity}>
        <div><span>{issue.domain.toUpperCase()}</span><strong>{issue.title}</strong><p>{issue.detail}</p><small>{issue.recommendedAction}</small></div>
        <div>{typeof issue.sceneIndex==="number" && <button type="button" onClick={()=>onBuildScene(issue.sceneIndex!)}>Open scene</button>}{issue.domain==="assets" && <button type="button" onClick={onAssets}>Asset tools</button>}</div>
      </article>) : <div className="production-health-clear"><strong>No unresolved production-health issues.</strong><p>Forge still requires the normal release and real-device evidence appropriate to the project.</p></div>}
    </section>

    <section className="production-review-actions">
      <div className="production-surface-section-head"><div><span>RECOMMENDED</span><strong>Highest-value next actions</strong></div><button type="button" onClick={onTelemetry}>Real-device evidence</button></div>
      <div>{nextActions.map((action)=><button type="button" key={action.capability.id} data-urgency={action.urgency} onClick={()=>onRun(action.capability)}><span>{action.urgency.toUpperCase()}</span><strong>{action.capability.label}</strong><small>{action.reason}</small></button>)}</div>
      {proposal && <aside className="production-review-proposal"><span>ACTIVE PROPOSAL</span><strong>{proposal.intent.raw}</strong><small>{proposal.state} · {proposal.riskClass.replaceAll("-"," ")}</small></aside>}
    </section>
  </div>;
}

export function ShipSurface({ draft, health, onReview, onVault, onTelemetry }: {
  draft:ReturnType<typeof useStudioDraft>;
  health:ProjectHealthReport;
  onReview:()=>void;
  onVault:()=>void;
  onTelemetry:()=>void;
}) {
  const blockers=health.issues.filter((issue)=>issue.severity==="blocker").length;
  const warnings=health.issues.filter((issue)=>issue.severity==="warning").length;
  const summary=health.status==="blocked"
    ? `${blockers} blocker${blockers===1?"":"s"} must be resolved in Review.`
    : health.status==="attention"
      ? `${warnings} production warning${warnings===1?"":"s"} remain in Review.`
      : "Project Health is ready.";
  return <div className="production-primary-surface production-ship-surface">
    <header className="production-surface-hero">
      <div><span>SHIP</span><h2>Review, checkpoint and release.</h2><p>Shipping stays simple because Project Health owns production readiness and the protected release pipeline owns authority.</p></div>
      <output data-health={health.status}>{Math.round(health.score)}/100 · {health.status.toUpperCase()}</output>
    </header>
    <div className="production-ship-actions"><button type="button" onClick={onReview}>Project Health</button><button type="button" onClick={onVault}>Project Vault</button><button type="button" onClick={onTelemetry}>Telemetry</button></div>
    <PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} interactionGraph={draft.interactionGraph} cinematicSystems={draft.cinematicSystems} validationCount={draft.validation.length} healthReady={health.status==="ready"} healthSummary={summary} />
  </div>;
}

function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return <section className="production-section"><h3>{title}</h3>{children}</section>;
}

function updateScene(
  setExperience:ReturnType<typeof useStudioDraft>["setExperience"],
  index:number,
  change:(scene:SceneDefinition)=>SceneDefinition,
) {
  setExperience((current)=>{
    try {
      return parseExperience({
        ...current,
        scenes:current.scenes.map((scene,sceneIndex)=>sceneIndex===index ? change(scene) : scene),
      });
    } catch {
      // Direct Build controls must never throw on a temporary invalid keystroke.
      // Keep the last valid project state; field constraints communicate the bounded input.
      return current;
    }
  });
}
