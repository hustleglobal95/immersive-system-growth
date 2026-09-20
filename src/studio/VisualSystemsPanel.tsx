"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import rawVisualSystems from "@/config/visual-systems.json";
import {
  parseVisualSystems,
  qualityInstanceCount,
  sampleInstancedField,
  type VisualSystemDefinition,
} from "@/src/platform/visualSystems";
import { useExperienceStore } from "@/src/store/experienceStore";
import { downloadJson } from "@/src/studio/useStudioDraft";
import { CinematicSystemsPanel } from "@/src/studio/CinematicSystemsPanel";
import type { CinematicSystemsManifest } from "@/src/lib/cinematic/schema";
import type { ExperienceConfig } from "@/src/types/experience";
import { ExperienceModesPanel } from "@/src/studio/ExperienceModesPanel";

const defaults = parseVisualSystems(rawVisualSystems);

export function VisualSystemsPanel({
  experience,
  cinematicSystems,
  setCinematicSystems,
}:{
  experience:ExperienceConfig;
  cinematicSystems:CinematicSystemsManifest;
  setCinematicSystems:Dispatch<SetStateAction<CinematicSystemsManifest>>;
}) {
  return <>
    <VisualSystemsCorePanel />
    <ExperienceModesPanel />
    <CinematicSystemsPanel manifest={cinematicSystems} setManifest={setCinematicSystems} experience={experience} />
  </>;
}

function VisualSystemsCorePanel() {
  const manifest = useExperienceStore((state) => state.visualSystems);
  const setVisualSystems = useExperienceStore((state) => state.setVisualSystems);
  const resetVisualSystems = useExperienceStore((state) => state.resetVisualSystems);
  const [selectedId, setSelectedId] = useState(manifest.systems[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const selected = manifest.systems.find((system) => system.id === selectedId) ?? manifest.systems[0];

  const patchSelected = (patch: Partial<VisualSystemDefinition>) => {
    if (!selected) return;
    try {
      const next = parseVisualSystems({
        ...manifest,
        systems: manifest.systems.map((system) =>
          system.id === selected.id ? { ...system, ...patch } : system,
        ),
      });
      setVisualSystems(next);
      setError("");
      setMessage("Runtime preview updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Visual system settings are invalid.");
      setMessage("");
    }
  };

  const importManifest = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = parseVisualSystems(JSON.parse(await file.text()));
      setVisualSystems(next);
      setSelectedId(next.systems[0]?.id ?? "");
      setError("");
      setMessage("Visual systems imported and validated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The visual systems file is invalid.");
      setMessage("");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const reset = () => {
    resetVisualSystems();
    setSelectedId(defaults.systems[0]?.id ?? "");
    setError("");
    setMessage("Runtime visual systems restored to project defaults.");
  };

  return (
    <section className="studio-card visual-system-editor" aria-labelledby="visual-systems-heading">
      <header className="studio-card__head">
        <div>
          <span>RUNTIME ART DIRECTION</span>
          <h2 id="visual-systems-heading">Visual systems</h2>
        </div>
        <div className="visual-system-editor__actions">
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importManifest(event.target.files?.[0])} />
          <button type="button" onClick={() => importRef.current?.click()}>Import visual systems</button>
          <button type="button" onClick={() => downloadJson("visual-systems.json", manifest)}>Export visual systems</button>
          <button type="button" onClick={reset}>Reset defaults</button>
        </div>
      </header>
      <p>Author deterministic fields, particle layers and their graceful fallbacks. Changes apply to the live preview and stay local until exported.</p>
      {error && <p role="alert">{error}</p>}
      {message && <p className="studio-message" role="status">{message}</p>}
      <div className="visual-system-editor__layout">
        <nav className="visual-system-list" aria-label="Visual system list">
          {manifest.systems.map((system) => (
            <button key={system.id} type="button" className={selected?.id === system.id ? "is-active" : ""} aria-pressed={selected?.id === system.id} onClick={() => setSelectedId(system.id)}>
              <strong>{system.label}</strong>
              <small>{system.kind} · {system.instanceCount} instances</small>
            </button>
          ))}
        </nav>
        {selected ? (
          <div className="visual-system-editor__detail">
            <div className="visual-system-editor__identity">
              <div><span>{selected.id}</span><h3>{selected.label}</h3></div>
              <label className="studio-check"><input type="checkbox" checked={selected.enabled} onChange={(event) => patchSelected({ enabled: event.target.checked })} /> Enabled</label>
            </div>
            <div className="visual-system-editor__fields">
              <label>Instance count <output>{selected.instanceCount}</output><input aria-label="Instance count" type="range" min="1" max={selected.kind === "instanced-field" ? 1024 : 2048} step="1" value={selected.instanceCount} onChange={(event) => patchSelected({ instanceCount: Number(event.target.value) })} /></label>
              <label>Motion intensity <output>{selected.motion.toFixed(2)}</output><input aria-label="Motion intensity" type="range" min="0" max="4" step="0.05" value={selected.motion} onChange={(event) => patchSelected({ motion: Number(event.target.value) })} /></label>
              <label>Primary color <input aria-label="Primary color" type="color" value={selected.color} onChange={(event) => patchSelected({ color: event.target.value })} /></label>
              <label>Accent color <input aria-label="Accent color" type="color" value={selected.accent} onChange={(event) => patchSelected({ accent: event.target.value })} /></label>
              <label>Fallback behavior<select aria-label="Fallback behavior" value={selected.fallback} onChange={(event) => patchSelected({ fallback: event.target.value as VisualSystemDefinition["fallback"] })}><option value="static">Static</option><option value="dom">DOM fallback</option><option value="hidden">Hidden</option></select></label>
              <label>Reduced motion<select aria-label="Reduced motion" value={selected.reducedMotion} onChange={(event) => patchSelected({ reducedMotion: event.target.value as VisualSystemDefinition["reducedMotion"] })}><option value="freeze">Freeze</option><option value="static">Static</option><option value="hide">Hide</option></select></label>
            </div>
            <div className="visual-system-quality">
              <h3>Quality budget</h3>
              <table><thead><tr><th>Tier</th><th>Instances</th><th>Mode</th></tr></thead><tbody>{(["low", "medium", "high"] as const).map((quality) => <tr key={quality}><td>{quality}</td><td>{qualityInstanceCount(selected, quality)}</td><td>{selected.enabled ? (quality === "low" ? "static" : "dynamic") : "hidden"}</td></tr>)}</tbody></table>
            </div>
            <div className="visual-system-samples">
              <h3>Deterministic sample</h3>
              <div>{sampleInstancedField(selected, Math.min(6, selected.instanceCount)).map((sample, index) => <code key={index}>#{index + 1} [{sample.position.map((value) => value.toFixed(2)).join(", ")}]</code>)}</div>
            </div>
          </div>
        ) : <p>No visual systems are configured.</p>}
      </div>
    </section>
  );
}
