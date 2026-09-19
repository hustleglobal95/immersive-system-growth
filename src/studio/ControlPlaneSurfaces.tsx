"use client";

import { parseExperience } from "@/src/lib/configSchema";
import type { ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import type { NextAction } from "@/src/platform/control-plane/nextAction";
import type { ProjectHealthReport } from "@/src/platform/control-plane/projectHealth";
import type { ForgeProposal } from "@/src/platform/control-plane/proposal";
import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";
import { PublishPanel } from "@/src/studio/ProjectPanels";
import type { useStudioDraft } from "@/src/studio/useStudioDraft";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export type AdvancedWorkspaceName="Motion"|"Interact"|"Assets"|"Telemetry";

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

export function RefinePanel({ context, experience, setExperience, openAdvanced }: {
  context:SelectionContext;
  experience:ExperienceConfig;
  setExperience:ReturnType<typeof useStudioDraft>["setExperience"];
  openAdvanced:(target?:AdvancedWorkspaceName)=>void;
}) {
  const scene=experience.scenes[context.sceneIndex];

  if(context.kind==="camera") return <div className="production-inspector">
    <Section title="Shot state">
      <div className="production-readout"><span>Path</span><strong>{scene.camera.path}</strong></div>
      <div className="production-readout"><span>Lens</span><strong>{scene.camera.from.fov}° → {scene.camera.to.fov}°</strong></div>
      <div className="production-readout"><span>Mobile translation</span><strong>{scene.mobileCamera ? "Authored" : "Needs direction"}</strong></div>
    </Section>
    <Section title="Fine tune"><p className="production-muted">Exact camera vectors, lens timing, curves and recording stay in the Sequencer.</p><button type="button" onClick={()=>openAdvanced("Motion")}>Open Sequencer</button></Section>
  </div>;

  if(context.kind==="node") return <div className="production-inspector">
    <Section title="Selected object">
      <div className="production-readout"><span>Rig node</span><strong>{context.selection.kind==="node" ? context.selection.name : context.label}</strong></div>
      <div className="production-readout"><span>Authored tracks</span><strong>{context.state.selectedNodeTrackCount}</strong></div>
      <div className="production-readout"><span>Interaction references</span><strong>{context.state.interactionReferenceCount}</strong></div>
    </Section>
    <Section title="Fine tune"><button type="button" onClick={()=>openAdvanced("Motion")}>Motion tracks</button><button type="button" onClick={()=>openAdvanced("Interact")}>Interaction behavior</button></Section>
  </div>;

  if(context.kind==="environment") return <div className="production-inspector">
    <Section title="Environment state">
      <div className="production-readout"><span>Exposure</span><strong>{scene.world.exposure.toFixed(2)}</strong></div>
      <div className="production-readout"><span>Key light</span><strong>{scene.world.key.toFixed(2)}</strong></div>
      <div className="production-readout"><span>Bloom</span><strong>{scene.post.bloom.toFixed(2)}</strong></div>
      <div className="production-readout"><span>Pressure</span><strong>{context.state.postPressure}</strong></div>
    </Section>
    <Section title="Fine tune"><p className="production-muted">Exact lighting/post timing remains available without cluttering Build.</p><button type="button" onClick={()=>openAdvanced("Motion")}>Open Sequencer</button></Section>
  </div>;

  if(context.kind==="copy") return <div className="production-inspector">
    <Section title="Copy">
      <label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,eyebrow:event.target.value}}))} /></label>
      <label>Headline<textarea rows={3} value={scene.copy.headline} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,headline:event.target.value}}))} /></label>
      <label>Body<textarea rows={4} value={scene.copy.body} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,body:event.target.value}}))} /></label>
    </Section>
    <Section title="Fine tune"><p className="production-muted">Typography motion stays outcome-driven here; exact opacity, blur and vertical tracks live in the Sequencer.</p><button type="button" onClick={()=>openAdvanced("Motion")}>Open Sequencer</button></Section>
  </div>;

  if(context.kind==="media") return <div className="production-inspector">
    <Section title="Media state">
      <div className="production-readout"><span>Kind</span><strong>{scene.media?.kind ?? "None"}</strong></div>
      <div className="production-readout"><span>Transition</span><strong>{scene.media?.transition ?? "None"}</strong></div>
      <div className="production-readout"><span>Position</span><strong>{scene.media ? `${scene.media.position[0]} / ${scene.media.position[1]}` : "—"}</strong></div>
      <div className="production-readout"><span>Mobile position</span><strong>{scene.media ? `${scene.media.mobilePosition[0]} / ${scene.media.mobilePosition[1]}` : "—"}</strong></div>
    </Section>
    <Section title="Fine tune"><button type="button" onClick={()=>openAdvanced("Motion")}>Media timing</button><button type="button" onClick={()=>openAdvanced("Assets")}>Source asset</button></Section>
  </div>;

  if(context.kind==="asset") {
    const asset=context.selectedAsset;
    return <div className="production-inspector"><Section title="Selected asset">
      <div className="production-readout"><span>Type</span><strong>{asset?.kind ?? "Unavailable"}</strong></div>
      <div className="production-readout"><span>File</span><strong>{asset?.entry.path.split("/").pop() ?? "Missing"}</strong></div>
      <div className="production-readout"><span>Manifest health</span><strong>{Math.round(context.state.manifestHealth)}/100</strong></div>
      <p className="production-muted">Replacement, optimization, provenance and GLB diagnostics stay in Asset tools.</p>
      <button type="button" onClick={()=>openAdvanced("Assets")}>Open Asset tools</button>
    </Section></div>;
  }

  return <div className="production-inspector">
    <Section title="Content">
      <label>Name<input value={scene.label} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,label:event.target.value}))} /></label>
      <label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,eyebrow:event.target.value}}))} /></label>
      <label>Headline<textarea rows={3} value={scene.copy.headline} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,headline:event.target.value}}))} /></label>
      <label>Body<textarea rows={4} value={scene.copy.body} onChange={(event)=>updateScene(setExperience,context.sceneIndex,(current)=>({...current,copy:{...current.copy,body:event.target.value}}))} /></label>
    </Section>
    <Section title="Fine tune"><p className="production-muted">Outcome-level direction stays above; exact keyframes and curves are available when needed.</p><button type="button" onClick={()=>openAdvanced("Motion")}>Open Sequencer</button></Section>
  </div>;
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
    <PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} validationCount={draft.validation.length} healthReady={health.status==="ready"} healthSummary={summary} />
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
  setExperience((current)=>parseExperience({
    ...current,
    scenes:current.scenes.map((scene,sceneIndex)=>sceneIndex===index ? change(scene) : scene),
  }));
}
