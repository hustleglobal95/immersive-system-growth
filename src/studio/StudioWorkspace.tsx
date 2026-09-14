"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import heliotRaw from "@/src/experiences/heliot/experience.json";
import nocterraRaw from "@/clients/nocterra-residences/experience.json";
import { parseExperience } from "@/src/lib/configSchema";
import { replaceScene } from "@/src/platform/studioPresets";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { downloadJson } from "@/src/studio/useStudioDraft";
import type { CameraDefinition, ExperienceConfig, SceneDefinition, Vec3 } from "@/src/types/experience";

const presets = {
  heliot: parseExperience(heliotRaw),
  nocterra: parseExperience(nocterraRaw),
} as const;

type ProjectPreset = keyof typeof presets | "draft";
type InspectorTab = "camera" | "environment" | "material" | "mobile" | "performance";

export function StudioWorkspace({
  experience,
  setExperience,
  active,
  setActive,
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  setActive: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [preset, setPreset] = useState<ProjectPreset>("draft");
  const [inspector, setInspector] = useState<InspectorTab>("camera");
  const [progress, setProgress] = useState(() => midpoint(experience.scenes[Math.min(active, experience.scenes.length - 1)].range));
  const sceneIndex = Math.min(active, experience.scenes.length - 1);
  const scene = experience.scenes[sceneIndex];

  const sceneDuration = useMemo(() => Math.max(0.001, scene.range[1] - scene.range[0]), [scene.range]);
  const updateScene = (changes: Partial<SceneDefinition>) => {
    setExperience((current) => replaceScene(current, sceneIndex, { ...current.scenes[sceneIndex], ...changes }));
  };
  const updateCamera = (camera: CameraDefinition) => updateScene({ camera });

  const chooseScene = (index: number) => {
    const next = experience.scenes[index];
    setActive(index);
    setProgress(midpoint(next.range));
  };

  const loadPreset = (value: ProjectPreset) => {
    setPreset(value);
    if (value === "draft") return;
    const next = structuredClone(presets[value]);
    setExperience(next);
    setActive(0);
    setProgress(midpoint(next.scenes[0].range));
  };

  return (
    <section className="forge-workspace" aria-label="Cinematic scene builder">
      <div className="forge-workspace__bar">
        <div className="forge-workspace__project">
          <span>PROJECT</span>
          <select aria-label="Studio project" value={preset} onChange={(event) => loadPreset(event.target.value as ProjectPreset)}>
            <option value="draft">Current draft</option>
            <option value="heliot">HELIOT / Observatory</option>
            <option value="nocterra">NOCTERRA / Residences</option>
          </select>
        </div>
        <div className="forge-workspace__commands">
          <button type="button" disabled={!canUndo} onClick={undo}>Undo</button>
          <button type="button" disabled={!canRedo} onClick={redo}>Redo</button>
          <button type="button" onClick={() => downloadJson(`${experience.meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-experience.json`, experience)}>Save version</button>
          <button className="forge-workspace__primary" type="button" onClick={() => downloadJson("experience.json", experience)}>Export</button>
        </div>
      </div>

      <div className="forge-workspace__body">
        <aside className="forge-scenes">
          <div className="forge-panel-label"><span>SCENES</span><b>{experience.scenes.length}</b></div>
          <div className="forge-scenes__list">
            {experience.scenes.map((item, index) => (
              <button key={item.id} type="button" className={index === sceneIndex ? "is-active" : ""} onClick={() => chooseScene(index)}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <span><strong>{item.label}</strong><em>{item.camera.path}</em></span>
                <i style={{ width: `${Math.max(4, (item.range[1] - item.range[0]) * 100)}%` }} />
              </button>
            ))}
          </div>
        </aside>

        <div className="forge-stage">
          <div className="forge-stage__meta">
            <div><span>LIVE SCENE</span><strong>{scene.label}</strong></div>
            <div><span>PATH</span><strong>{scene.camera.path}</strong></div>
            <div><span>RANGE</span><strong>{scene.range[0].toFixed(2)} — {scene.range[1].toFixed(2)}</strong></div>
          </div>
          <StudioLivePreview experience={experience} active={sceneIndex} setActive={chooseScene} progress={progress} onProgressChange={setProgress} />
        </div>

        <aside className="forge-inspector">
          <div className="forge-inspector__tabs">
            {(["camera", "environment", "material", "mobile", "performance"] as const).map((tab) => (
              <button key={tab} type="button" aria-pressed={inspector === tab} onClick={() => setInspector(tab)}>{tab}</button>
            ))}
          </div>

          <div className="forge-inspector__content">
            {inspector === "camera" && <>
              <SectionTitle kicker="CAMERA" title="Shot framing" />
              <label className="forge-field">Path<select value={scene.camera.path} onChange={(event) => updateCamera({ ...scene.camera, path: event.target.value as CameraDefinition["path"] })}>{["linear","dolly","arc","orbit","crane","threshold","flyby","swoop","macro","pullback","subject-orbit"].map((path) => <option key={path}>{path}</option>)}</select></label>
              <VectorEditor label="Start position" value={scene.camera.from.position} onChange={(position) => updateCamera({ ...scene.camera, from: { ...scene.camera.from, position } })} />
              <VectorEditor label="Start target" value={scene.camera.from.target} onChange={(target) => updateCamera({ ...scene.camera, from: { ...scene.camera.from, target } })} />
              <RangeEditor label="Start FOV" value={scene.camera.from.fov} min={15} max={100} step={1} onChange={(fov) => updateCamera({ ...scene.camera, from: { ...scene.camera.from, fov } })} />
              <VectorEditor label="End position" value={scene.camera.to.position} onChange={(position) => updateCamera({ ...scene.camera, to: { ...scene.camera.to, position } })} />
              <VectorEditor label="End target" value={scene.camera.to.target} onChange={(target) => updateCamera({ ...scene.camera, to: { ...scene.camera.to, target } })} />
              <RangeEditor label="End FOV" value={scene.camera.to.fov} min={15} max={100} step={1} onChange={(fov) => updateCamera({ ...scene.camera, to: { ...scene.camera.to, fov } })} />
            </>}

            {inspector === "environment" && <>
              <SectionTitle kicker="WORLD" title="Light & atmosphere" />
              <ColorEditor label="Background" value={scene.world.background} onChange={(background) => updateScene({ world: { ...scene.world, background } })} />
              <ColorEditor label="Fog" value={scene.world.fog} onChange={(fog) => updateScene({ world: { ...scene.world, fog } })} />
              <RangeEditor label="Fog density" value={scene.world.fogDensity} min={0} max={0.15} step={0.001} onChange={(fogDensity) => updateScene({ world: { ...scene.world, fogDensity } })} />
              <RangeEditor label="Ambient" value={scene.world.ambient} min={0} max={20} step={0.1} onChange={(ambient) => updateScene({ world: { ...scene.world, ambient } })} />
              <RangeEditor label="Key" value={scene.world.key} min={0} max={50} step={0.1} onChange={(key) => updateScene({ world: { ...scene.world, key } })} />
              <RangeEditor label="Rim" value={scene.world.rim} min={0} max={50} step={0.1} onChange={(rim) => updateScene({ world: { ...scene.world, rim } })} />
              <RangeEditor label="Exposure" value={scene.world.exposure} min={0.25} max={3} step={0.01} onChange={(exposure) => updateScene({ world: { ...scene.world, exposure } })} />
              <RangeEditor label="Bloom" value={scene.post.bloom} min={0} max={2} step={0.01} onChange={(bloom) => updateScene({ post: { ...scene.post, bloom } })} />
              <RangeEditor label="Vignette" value={scene.post.vignette} min={0} max={1} step={0.01} onChange={(vignette) => updateScene({ post: { ...scene.post, vignette } })} />
            </>}

            {inspector === "material" && <>
              <SectionTitle kicker="MATERIAL" title="Surface treatment" />
              <ColorEditor label="Tint" value={scene.material.tint} onChange={(tint) => updateScene({ material: { ...scene.material, tint } })} />
              <RangeEditor label="Tint strength" value={scene.material.tintStrength} min={0} max={1} step={0.01} onChange={(tintStrength) => updateScene({ material: { ...scene.material, tintStrength } })} />
              <NullableRange label="Metalness" value={scene.material.metalness} onChange={(metalness) => updateScene({ material: { ...scene.material, metalness } })} />
              <NullableRange label="Roughness" value={scene.material.roughness} onChange={(roughness) => updateScene({ material: { ...scene.material, roughness } })} />
              <NullableRange label="Clearcoat" value={scene.material.clearcoat} onChange={(clearcoat) => updateScene({ material: { ...scene.material, clearcoat } })} />
            </>}

            {inspector === "mobile" && <>
              <SectionTitle kicker="MOBILE" title="Camera override" />
              {scene.mobileCamera ? <>
                <VectorEditor label="Start position" value={scene.mobileCamera.from.position} onChange={(position) => updateScene({ mobileCamera: { ...scene.mobileCamera!, from: { ...scene.mobileCamera!.from, position } } })} />
                <VectorEditor label="End position" value={scene.mobileCamera.to.position} onChange={(position) => updateScene({ mobileCamera: { ...scene.mobileCamera!, to: { ...scene.mobileCamera!.to, position } } })} />
                <RangeEditor label="Start FOV" value={scene.mobileCamera.from.fov} min={20} max={110} step={1} onChange={(fov) => updateScene({ mobileCamera: { ...scene.mobileCamera!, from: { ...scene.mobileCamera!.from, fov } } })} />
                <RangeEditor label="End FOV" value={scene.mobileCamera.to.fov} min={20} max={110} step={1} onChange={(fov) => updateScene({ mobileCamera: { ...scene.mobileCamera!, to: { ...scene.mobileCamera!.to, fov } } })} />
              </> : <button type="button" onClick={() => updateScene({ mobileCamera: structuredClone(scene.camera) })}>Create from desktop camera</button>}
            </>}

            {inspector === "performance" && <>
              <SectionTitle kicker="RUNTIME" title="Performance budget" />
              <Readout label="Scene span" value={`${(sceneDuration * 100).toFixed(1)}%`} />
              <Readout label="Min DPR" value={experience.runtime.minDpr.toFixed(2)} />
              <Readout label="Max DPR" value={experience.runtime.maxDpr.toFixed(2)} />
              <Readout label="Pixel budget" value={experience.runtime.maxPixels.toLocaleString()} />
              <Readout label="Preload budget" value={`${experience.runtime.preloadMb} MB`} />
              <p className="forge-inspector__note">Runtime budgets remain project-level. Use the existing Performance and Publish panels for certification and release checks.</p>
            </>}
          </div>
        </aside>
      </div>

      <div className="forge-timeline">
        <div className="forge-timeline__head">
          <span>TIMELINE</span>
          <output>{progress.toFixed(3)}</output>
          <input aria-label="Global cinematic progress" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => setProgress(Number(event.target.value))} />
        </div>
        <div className="forge-timeline__track">
          {experience.scenes.map((item, index) => (
            <button key={item.id} type="button" className={index === sceneIndex ? "is-active" : ""} style={{ left: `${item.range[0] * 100}%`, width: `${Math.max(1, (item.range[1] - item.range[0]) * 100)}%` }} onClick={() => chooseScene(index)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          ))}
          <i className="forge-timeline__playhead" style={{ left: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return <div className="forge-section-title"><span>{kicker}</span><h3>{title}</h3></div>;
}

function VectorEditor({ label, value, onChange }: { label: string; value: Vec3; onChange: (value: Vec3) => void }) {
  return <fieldset className="forge-vector"><legend>{label}</legend>{(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis}><span>{axis}</span><input type="number" step="0.05" value={value[index]} onChange={(event) => { const next: Vec3 = [...value]; next[index] = Number(event.target.value); onChange(next); }} /></label>)}</fieldset>;
}

function RangeEditor({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="forge-range"><span>{label}<output>{value.toFixed(step < 0.1 ? 3 : 1)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ColorEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="forge-color"><span>{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value}</code></label>;
}

function NullableRange({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <div className="forge-nullable"><label><input type="checkbox" checked={value !== null} onChange={(event) => onChange(event.target.checked ? 0.5 : null)} />{label}</label><RangeEditor label="Value" value={value ?? 0.5} min={0} max={1} step={0.01} onChange={(next) => onChange(next)} /></div>;
}

function Readout({ label, value }: { label: string; value: string }) {
  return <div className="forge-readout"><span>{label}</span><strong>{value}</strong></div>;
}

function midpoint(range: [number, number]) {
  return range[0] + (range[1] - range[0]) * 0.5;
}
