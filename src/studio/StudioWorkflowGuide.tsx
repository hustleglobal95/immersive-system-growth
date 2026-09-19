"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { readStored, useClientValue, useStoredValue } from "@/src/lib/useClientValue";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";
import type { StudioProject } from "@/src/platform/studioSchema";

export const STUDIO_GUIDE_BRIEF_KEY = "forge-studio-guide-brief-v1";
export const STUDIO_GUIDE_SHIP_KEY = "forge-studio-guide-shipped-project-v1";
const BRIEF_KEY = STUDIO_GUIDE_BRIEF_KEY;

type StepId = "idea" | "assets" | "structure" | "motion" | "review" | "ship";

export function StudioWorkflowGuide({
  project,
  experience,
  manifest,
  validationCount,
  projectHealthReady,
  projectHealthIssueCount,
  onClose,
  onNewProject,
  onOpenCreate,
  onOpenAssets,
  onOpenMotion,
  onOpenReview,
  onOpenShip,
}: {
  project: StudioProject;
  experience: ExperienceConfig;
  manifest: AssetManifest;
  validationCount: number;
  projectHealthReady: boolean;
  projectHealthIssueCount: number;
  onClose: () => void;
  onNewProject: () => void;
  onOpenCreate: () => void;
  onOpenAssets: () => void;
  onOpenMotion: () => void;
  onOpenReview: () => void;
  onOpenShip: () => void;
}) {
  // Read the stored brief during render rather than setting it from an effect, so the guide
  // never renders an empty textarea for a frame and then replaces it.
  const storedBrief = useClientValue(() => readStored(BRIEF_KEY), "");
  const shippedProjectId = useStoredValue(STUDIO_GUIDE_SHIP_KEY);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  const [brief, setBrief] = useState(storedBrief);
  const [seededFrom, setSeededFrom] = useState(storedBrief);
  if (seededFrom !== storedBrief) {
    setSeededFrom(storedBrief);
    setBrief(storedBrief);
  }

  const saveBrief = (value: string) => {
    setBrief(value);
    try { window.localStorage.setItem(BRIEF_KEY, value); } catch { /* keep the guide usable without persistence */ }
  };

  const assetCount = manifest.models.length + manifest.textures.length + manifest.hdr.length + manifest.video.length;
  const motionCount = experience.scenes.reduce((total, scene) => total + scene.motionTracks.length, 0);
  const customStructure = experience.scenes.length > 1 || experience.scenes[0]?.label !== "Opening Scene";
  const hasIdea = brief.trim().length >= 12;
  const hasAssets = assetCount > 0;
  const hasMotion = motionCount > 0;
  const isReviewable = projectHealthReady && validationCount === 0 && hasIdea && customStructure && hasMotion;

  const status: Record<StepId, boolean> = {
    idea: hasIdea,
    assets: hasAssets,
    structure: customStructure,
    motion: hasMotion,
    review: isReviewable,
    ship: shippedProjectId === project.id,
  };

  const nextStep = useMemo<StepId>(() => {
    if (!status.idea) return "idea";
    if (!status.assets) return "assets";
    if (!status.structure) return "structure";
    if (!status.motion) return "motion";
    if (!status.review) return "review";
    return "ship";
  }, [hasIdea, hasAssets, customStructure, hasMotion, isReviewable]);

  const directorHref = `/studio/agent?idea=${encodeURIComponent(brief.trim() || `Create a memorable immersive experience for ${project.name}.`)}`;
  const creatorHref = `/studio/assets/create?asset=${encodeURIComponent(`${project.id}-hero-source.webp`)}&type=image&priority=hero-critical&scene=0&reason=${encodeURIComponent(brief.trim() || `Create the first hero visual asset for ${project.name}.`)}`;

  return <div className="workflow-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} className="workflow-guide" role="dialog" aria-modal="true" aria-labelledby="workflow-guide-title">
      <header className="workflow-guide__header">
        <div><span>FORGE / GUIDED BUILD</span><h2 id="workflow-guide-title">Build the project without learning the machinery.</h2></div>
        <button type="button" aria-label="Close guide" onClick={onClose}>×</button>
      </header>

      <div className="workflow-guide__project">
        <div><span>PROJECT</span><strong>{project.name}</strong></div>
        <div><span>SCENES</span><strong>{experience.scenes.length}</strong></div>
        <div><span>ASSETS</span><strong>{assetCount}</strong></div>
        <div><span>MOTION TRACKS</span><strong>{motionCount}</strong></div>
      </div>

      <section className="workflow-guide__next">
        <span>DO THIS NEXT</span>
        <strong>{status.ship ? "Project shipped." : stepTitle(nextStep)}</strong>
        <p>{status.ship ? "The review handoff was created successfully. Reopen Ship whenever you need another review or release." : stepDescription(nextStep)}</p>
      </section>

      <div className="workflow-guide__steps">
        <GuideStep number="01" done={status.idea} title="Describe the idea" description="Say what the visitor should feel, understand or remember. Director will turn that into a production strategy.">
          <textarea value={brief} onChange={(event) => saveBrief(event.target.value)} placeholder="Example: Enter a luxury hotel at night, move through the lobby, reveal the architecture, then transition into the booking experience." />
          <a className="workflow-guide__primary" href={directorHref}>Ask Creative Agent to direct it</a>
        </GuideStep>

        <GuideStep number="02" done={status.assets} title="Give Forge the ingredients" description="Use what you already have or create what the project is missing. You should not have to leave Forge just to produce a hero image, video or 3D asset.">
          <a className="workflow-guide__primary" href={creatorHref}>Create an asset</a>
          <button type="button" onClick={onOpenAssets}>Import existing assets</button>
        </GuideStep>

        <GuideStep number="03" done={status.structure} title="Shape the experience" description="Create the scene sequence and edit the words. You can stay in the visual cockpit; no source files are required.">
          <button type="button" className="workflow-guide__primary" onClick={onOpenCreate}>Open scene builder</button>
        </GuideStep>

        <GuideStep number="04" done={status.motion} title="Direct movement" description="Choose the camera and motion behavior. Start with coordinated presets, then fine-tune only if the idea needs it.">
          <button type="button" className="workflow-guide__primary" onClick={onOpenMotion}>Open motion</button>
        </GuideStep>

        <GuideStep number="05" done={status.review} title="Check readiness" description={projectHealthReady ? "Project Health is ready. Review the complete experience before shipping." : `${projectHealthIssueCount} production-health issue${projectHealthIssueCount === 1 ? "" : "s"} still need attention before this is production-ready.`}>
          <button type="button" onClick={onOpenReview}>Open Project Health</button>
        </GuideStep>

        <GuideStep number="06" done={status.ship} title="Publish when it is ready" description="Finish through Guided Ship. Workspace setup and engineering controls stay behind Advanced so authors can review and hand off without learning build commands or deployment internals.">
          <button type="button" className="workflow-guide__primary" onClick={onOpenShip}>Review & publish</button>
        </GuideStep>
      </div>

      <footer className="workflow-guide__footer">
        <button type="button" onClick={onNewProject}>Start a different project</button>
        <p>Advanced controls remain available, but this path is designed to take a nontechnical user from idea → assets → scenes → motion → review → publish.</p>
      </footer>
    </section>
  </div>;
}

function GuideStep({ number, done, title, description, children }: { number: string; done: boolean; title: string; description: string; children: React.ReactNode }) {
  return <article className={done ? "workflow-guide__step is-done" : "workflow-guide__step"}>
    <div className="workflow-guide__step-number">{done ? "✓" : number}</div>
    <div className="workflow-guide__step-copy"><span>{done ? "COMPLETE" : "STEP"}</span><h3>{title}</h3><p>{description}</p><div className="workflow-guide__actions">{children}</div></div>
  </article>;
}

function stepTitle(step: StepId) {
  return ({
    idea: "Describe what you want to create.",
    assets: "Import or create the assets the idea needs.",
    structure: "Turn the idea into a scene journey.",
    motion: "Give the scenes camera and motion direction.",
    review: "Review the complete experience.",
    ship: "Publish the project.",
  } as const)[step];
}

function stepDescription(step: StepId) {
  return ({
    idea: "Do not think about WebGL, GSAP or cameras yet. Start with the outcome and let Director choose the production approach.",
    assets: "Use existing files, or send a missing asset straight to Forge Asset Creator and place the result into the draft.",
    structure: "Build only the scenes needed to communicate the idea clearly.",
    motion: "Use coordinated motion first; advanced sequencing is optional.",
    review: "Resolve project issues and make sure one signature moment carries the experience.",
    ship: "Move into Publish only after the creative and production path is coherent.",
  } as const)[step];
}
