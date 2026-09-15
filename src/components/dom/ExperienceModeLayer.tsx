"use client";

import { useState } from "react";
import rawModes from "@/config/experience-modes.json";
import { experience } from "@/src/lib/experience";
import { activeExperienceMode, parseExperienceModes } from "@/src/platform/experienceModes";
import { useExperienceStore } from "@/src/store/experienceStore";

const manifest = parseExperienceModes(rawModes);
export const currentExperienceMode = activeExperienceMode(manifest);

function jumpTo(sceneId: string) {
  document.getElementById(sceneId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function FloatingNavigation() {
  const active = useExperienceStore((state) => state.activeScene);
  const [expanded, setExpanded] = useState(false);
  const scene = experience.scenes[active] ?? experience.scenes[0];
  return (
    <nav className="mode-floating-nav" aria-label="Floating chapter navigation" data-expanded={expanded}>
      <button type="button" className="mode-floating-nav__toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span>{String(active + 1).padStart(2, "0")}</span>
        <strong>{scene?.label ?? "Chapters"}</strong>
        <i aria-hidden="true">{expanded ? "Close" : "Explore"}</i>
      </button>
      <ol>
        {experience.scenes.map((item, index) => (
          <li key={item.id}>
            <button type="button" aria-current={index === active ? "step" : undefined} onClick={() => { jumpTo(item.id); setExpanded(false); }}>
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function InteractiveCards() {
  const active = useExperienceStore((state) => state.activeScene);
  return (
    <nav className="mode-card-deck" aria-label="Interactive story cards">
      {experience.scenes.map((scene, index) => (
        <button
          key={scene.id}
          type="button"
          className="mode-card"
          data-state={index === active ? "active" : index < active ? "past" : "next"}
          aria-current={index === active ? "step" : undefined}
          onClick={() => jumpTo(scene.id)}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{scene.copy.headline}</strong>
          <small>{scene.copy.body}</small>
        </button>
      ))}
    </nav>
  );
}

function ProductViewControls() {
  const orbit = useExperienceStore((state) => state.orbit);
  const setOrbitControl = useExperienceStore((state) => state.setOrbitControl);
  const resetOrbit = useExperienceStore((state) => state.resetOrbit);
  const enabled = orbit.target === "hero";
  return (
    <aside className="mode-product-controls" aria-label="3D product controls">
      <span>PRODUCT INSPECTION</span>
      <p>{enabled ? "Drag the product to inspect every angle." : "Enable inspection to rotate the product."}</p>
      <div>
        <button type="button" aria-pressed={enabled} onClick={() => setOrbitControl(enabled ? null : "hero", 0.006)}>
          {enabled ? "End inspection" : "Inspect product"}
        </button>
        <button type="button" onClick={() => resetOrbit("hero")}>Reset view</button>
      </div>
    </aside>
  );
}

function MotionCues() {
  const progress = useExperienceStore((state) => state.progress);
  const direction = useExperienceStore((state) => state.direction);
  const active = useExperienceStore((state) => state.activeScene);
  const next = experience.scenes[Math.min(active + 1, experience.scenes.length - 1)];
  return (
    <aside className="mode-motion-cues" aria-label="Journey progress">
      <div className="mode-motion-cues__meter"><i style={{ transform: `scaleX(${progress})` }} /></div>
      <span>{Math.round(progress * 100)}%</span>
      {next && active < experience.scenes.length - 1 && (
        <button type="button" onClick={() => jumpTo(next.id)}>
          <i aria-hidden="true">{direction < 0 ? "↑" : "↓"}</i> Next: {next.label}
        </button>
      )}
    </aside>
  );
}

export function ExperienceModeLayer() {
  if (currentExperienceMode.id === "floating-navigation") return <FloatingNavigation />;
  if (currentExperienceMode.id === "interactive-cards") return <InteractiveCards />;
  if (currentExperienceMode.id === "3d-product-view") return <><ProductViewControls /><MotionCues /></>;
  if (currentExperienceMode.id === "motion-cues") return <MotionCues />;
  return null;
}
