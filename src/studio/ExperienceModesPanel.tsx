"use client";

import { useState } from "react";
import rawModes from "@/config/experience-modes.json";
import { activeExperienceMode, auditExperienceMode, parseExperienceModes } from "@/src/platform/experienceModes";
import { experience } from "@/src/lib/experience";
import { downloadJson } from "@/src/studio/useStudioDraft";

const defaults = parseExperienceModes(rawModes);

export function ExperienceModesPanel() {
  const [manifest, setManifest] = useState(defaults);
  const selected = activeExperienceMode(manifest);
  const failures = auditExperienceMode(selected, experience);
  return (
    <section className="studio-card experience-mode-editor" aria-labelledby="experience-modes-heading">
      <header className="studio-card__head">
        <div><span>COMPOSITION REGISTRY</span><h2 id="experience-modes-heading">Six experience modes</h2></div>
        <div className="visual-system-editor__actions">
          <button type="button" onClick={() => downloadJson("experience-modes.json", manifest)}>Export active mode</button>
          <button type="button" onClick={() => setManifest(defaults)}>Reset</button>
        </div>
      </header>
      <p>Select the dominant composition. Every mode reuses the same validated scenes, camera system, interaction graph and fallbacks.</p>
      <div className="experience-mode-grid">
        {manifest.modes.map((mode) => (
          <button key={mode.id} type="button" className={mode.id === manifest.activeMode ? "is-active" : ""} aria-pressed={mode.id === manifest.activeMode} onClick={() => setManifest({ ...manifest, activeMode: mode.id })}>
            <span>{mode.id}</span><strong>{mode.label}</strong><small>{mode.summary}</small>
          </button>
        ))}
      </div>
      <div className="experience-mode-detail">
        <div><span>ACTIVE COMPOSITION</span><h3>{selected.label}</h3><p>{selected.summary}</p></div>
        <dl>
          <div><dt>Narrative</dt><dd>{selected.composition.narrative}</dd></div>
          <div><dt>Navigation</dt><dd>{selected.composition.navigation}</dd></div>
          <div><dt>Interaction</dt><dd>{selected.composition.interaction}</dd></div>
          <div><dt>Fallback</dt><dd>{selected.fallback}</dd></div>
        </dl>
      </div>
      <p className={failures.length ? "studio-error" : "studio-message"} role="status">
        {failures.length ? failures.join(". ") : "Current project satisfies this mode's structural requirements."}
      </p>
    </section>
  );
}
