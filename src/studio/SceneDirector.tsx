"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { applyCameraDirector, type CameraDirectorPlan } from "@/src/platform/cameraDirector";
import { replaceScene } from "@/src/platform/studioPresets";
import { getSpatialBoundsSnapshot } from "@/src/runtime/spatialRegistry";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import type { CameraDefinition, ExperienceConfig, SceneDefinition, Vec3 } from "@/src/types/experience";

const paths: CameraDefinition["path"][] = ["linear", "dolly", "arc", "orbit", "crane", "threshold", "flyby", "swoop", "macro", "pullback", "subject-orbit"];

export function SceneDirector({
  experience,
  setExperience,
  active,
  setActive,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  setActive: (index: number) => void;
}) {
  const scene = experience.scenes[active];
  const [directorNotice, setDirectorNotice] = useState("");
  const [directorPlan, setDirectorPlan] = useState<CameraDirectorPlan | null>(null);
  const [previewProgress, setPreviewProgress] = useState(() => midpoint(scene.range));
  const [liveSpatialCount, setLiveSpatialCount] = useState(0);
  const update = (changes: Partial<SceneDefinition>) => setExperience((current) => replaceScene(current, active, { ...current.scenes[active], ...changes }));
  const updateCamera = (camera: CameraDefinition) => update({ camera });
  const points = useMemo(() => Array.from({ length: 49 }, (_, index) => {
    const progress = scene.range[0] + (scene.range[1] - scene.range[0]) * index / 48;
    return sampleExperience(progress, false, experience).camera.position;
  }), [experience, scene.range]);

  useEffect(() => {
    setPreviewProgress(midpoint(scene.range));
    setDirectorPlan(null);
    setDirectorNotice("");
  }, [active, scene.range]);

  useEffect(() => {
    const refresh = () => setLiveSpatialCount(getSpatialBoundsSnapshot().length);
    refresh();
    const timer = window.setInterval(refresh, 250);
    return () => window.clearInterval(timer);
  }, [active, experience.heroModel, experience.assets]);

  const autoDirect = () => {
    const liveBounds = getSpatialBoundsSnapshot();
    const result = applyCameraDirector(experience, active, { liveBounds });
    setExperience(result.experience);
    setDirectorPlan(result.plan);
    const spatial = result.plan.spatial.evaluation;
    const planner = result.plan.spatial.planner;
    setDirectorNotice(`${result.plan.shotLabel} · ${Math.round(result.plan.confidence * 100)}% confidence. ${result.plan.rationale} ${result.replacedTracks ? `Replaced ${result.replacedTracks} existing camera track${result.replacedTracks === 1 ? "" : "s"}.` : "Added editable camera tracks."} Spatial source: ${result.plan.spatial.boundsSource}. Minimum clearance ${spatial.minClearance.toFixed(2)}. Visibility waypoints ${planner.routeWaypoints}. Composition repairs ${planner.compositionRepairs}.`);
  };
  const chooseScene = (index: number) => {
    setActive(index);
    setPreviewProgress(midpoint(experience.scenes[index].range));
    setDirectorNotice("");
    setDirectorPlan(null);
  };

  return (
    <div className="studio-grid studio-grid--director">
      <section className="studio-card director-camera">
        <div className="studio-card__head"><div><span>CAMERA DIRECTOR</span><h2>Path and framing</h2></div><code>{scene.id}</code></div>
        <label>Scene<select value={active} onChange={(event) => chooseScene(Number(event.target.value))}>{experience.scenes.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} / {item.label}</option>)}</select></label>
        <CameraPathDiagram points={points} />
        <div className="director-auto">
          <button type="button" className="studio-primary" onClick={autoDirect}>Auto-direct camera</button>
          <span>Scores every Director shot against scene intent, live geometry, subject visibility, safe framing, floor clearance and scene-to-scene continuity, then authors editable tracks.</span>
          <strong data-testid="director-spatial-status">{liveSpatialCount > 0 ? `Live geometry ready · ${liveSpatialCount} spatial hull${liveSpatialCount === 1 ? "" : "s"}` : "Geometry preview warming up · proxy safety active"}</strong>
        </div>
        {directorNotice && <p className="sequencer-notice" role="status">{directorNotice}</p>}
        {directorPlan && <SpatialDirectorReport plan={directorPlan} />}
        <div className="studio-field-row">
          <label>Path preset<select value={scene.camera.path} onChange={(event) => updateCamera({ ...scene.camera, path: event.target.value as CameraDefinition["path"] })}>{paths.map((path) => <option key={path}>{path}</option>)}</select></label>
          <label>Easing<select value={scene.easing} onChange={(event) => update({ easing: event.target.value as SceneDefinition["easing"] })}><option>linear</option><option>smooth</option><option>cinematic</option></select></label>
        </div>
        <VectorControl label="Start position" value={scene.camera.from.position} onChange={(position) => updateCamera({ ...scene.camera, from: { ...scene.camera.from, position } })} />
        <VectorControl label="Start target" value={scene.camera.from.target} onChange={(target) => updateCamera({ ...scene.camera, from: { ...scene.camera.from, target } })} />
        <NumberControl label="Start FOV" value={scene.camera.from.fov} min={15} max={90} onChange={(fov) => updateCamera({ ...scene.camera, from: { ...scene.camera.from, fov } })} />
        <VectorControl label="End position" value={scene.camera.to.position} onChange={(position) => updateCamera({ ...scene.camera, to: { ...scene.camera.to, position } })} />
        <VectorControl label="End target" value={scene.camera.to.target} onChange={(target) => updateCamera({ ...scene.camera, to: { ...scene.camera.to, target } })} />
        <NumberControl label="End FOV" value={scene.camera.to.fov} min={15} max={90} onChange={(fov) => updateCamera({ ...scene.camera, to: { ...scene.camera.to, fov } })} />
        <button type="button" onClick={() => update({ mobileCamera: structuredClone(scene.camera) })}>Copy desktop camera to mobile</button>
      </section>

      <section className="studio-card director-look">
        <div className="studio-card__head"><div><span>ART DIRECTION</span><h2>Light, atmosphere and material</h2></div><output>live schema</output></div>
        <h3>Environment</h3>
        <div className="director-color-grid">
          <ColorControl label="Background" value={scene.world.background} onChange={(background) => update({ world: { ...scene.world, background } })} />
          <ColorControl label="Fog" value={scene.world.fog} onChange={(fog) => update({ world: { ...scene.world, fog } })} />
          <ColorControl label="Key color" value={scene.world.keyColor} onChange={(keyColor) => update({ world: { ...scene.world, keyColor } })} />
          <ColorControl label="Rim color" value={scene.world.rimColor} onChange={(rimColor) => update({ world: { ...scene.world, rimColor } })} />
        </div>
        <NumberControl label="Fog density" value={scene.world.fogDensity} min={0} max={.15} step={.001} onChange={(fogDensity) => update({ world: { ...scene.world, fogDensity } })} />
        <NumberControl label="Ambient light" value={scene.world.ambient} min={0} max={20} step={.1} onChange={(ambient) => update({ world: { ...scene.world, ambient } })} />
        <NumberControl label="Key light" value={scene.world.key} min={0} max={50} step={.1} onChange={(key) => update({ world: { ...scene.world, key } })} />
        <NumberControl label="Rim light" value={scene.world.rim} min={0} max={50} step={.1} onChange={(rim) => update({ world: { ...scene.world, rim } })} />
        <NumberControl label="Exposure" value={scene.world.exposure} min={.25} max={3} step={.01} onChange={(exposure) => update({ world: { ...scene.world, exposure } })} />
        <NumberControl label="Bloom" value={scene.post.bloom} min={0} max={2} step={.01} onChange={(bloom) => update({ post: { ...scene.post, bloom } })} />
        <NumberControl label="Vignette" value={scene.post.vignette} min={0} max={1} step={.01} onChange={(vignette) => update({ post: { ...scene.post, vignette } })} />
        <h3>Hero material</h3>
        <ColorControl label="Tint" value={scene.material.tint} onChange={(tint) => update({ material: { ...scene.material, tint } })} />
        <NumberControl label="Tint strength" value={scene.material.tintStrength} min={0} max={1} step={.01} onChange={(tintStrength) => update({ material: { ...scene.material, tintStrength } })} />
        <NullableControl label="Metalness" value={scene.material.metalness} onChange={(metalness) => update({ material: { ...scene.material, metalness } })} />
        <NullableControl label="Roughness" value={scene.material.roughness} onChange={(roughness) => update({ material: { ...scene.material, roughness } })} />
        <NullableControl label="Clearcoat" value={scene.material.clearcoat} onChange={(clearcoat) => update({ material: { ...scene.material, clearcoat } })} />
        <p className="studio-muted">Asset values remain untouched until an override is enabled. Tint is blended against each cloned source material instead of replacing its texture.</p>
      </section>

      <StudioLivePreview
        experience={experience}
        active={active}
        setActive={chooseScene}
        progress={previewProgress}
        onProgressChange={setPreviewProgress}
      />
    </div>
  );
}

function SpatialDirectorReport({ plan }: { plan: CameraDirectorPlan }) {
  const spatial = plan.spatial.evaluation;
  const planner = plan.spatial.planner;
  return <div className="director-auto" aria-label="Spatial camera diagnostics">
    <strong>Spatial camera intelligence</strong>
    <span>{plan.spatial.boundsSource} bounds · {plan.spatial.reroutes} reroute{plan.spatial.reroutes === 1 ? "" : "s"} · {plan.spatial.rejectedCandidates} rejected shot{plan.spatial.rejectedCandidates === 1 ? "" : "s"}</span>
    <span>Clearance {spatial.minClearance.toFixed(2)} · Occlusion {spatial.occlusionSamples}/{spatial.samples} · Framing violations {spatial.framingViolations}/{spatial.samples} · Max turn {spatial.maxTurnDegrees.toFixed(1)}°</span>
    <span>Planner: {planner.routeWaypoints} route waypoint{planner.routeWaypoints === 1 ? "" : "s"} · {planner.occlusionReroutes} occlusion reroute{planner.occlusionReroutes === 1 ? "" : "s"} · {planner.compositionRepairs} composition repair{planner.compositionRepairs === 1 ? "" : "s"} · {planner.failedRoutes} failed route{planner.failedRoutes === 1 ? "" : "s"}</span>
    <span>Top alternatives: {plan.alternatives.slice(1, 4).map((item) => `${item.shotLabel.replace("Director · ", "")} ${item.hardInvalid ? "rejected" : item.score.toFixed(1)}`).join(" · ")}</span>
  </div>;
}

function CameraPathDiagram({ points }: { points: Vec3[] }) {
  const top = plot(points, 0, 2);
  const side = plot(points, 0, 1);
  return <div className="camera-path-diagram"><figure><figcaption>TOP / XZ</figcaption><svg viewBox="0 0 300 150" role="img" aria-label="Camera top path"><Grid /><polyline points={top} /><circle cx={top.split(" ")[0].split(",")[0]} cy={top.split(" ")[0].split(",")[1]} r="4" /></svg></figure><figure><figcaption>SIDE / XY</figcaption><svg viewBox="0 0 300 150" role="img" aria-label="Camera side path"><Grid /><polyline points={side} /><circle cx={side.split(" ")[0].split(",")[0]} cy={side.split(" ")[0].split(",")[1]} r="4" /></svg></figure></div>;
}

function Grid() {
  return <g className="camera-grid"><path d="M0 37.5H300M0 75H300M0 112.5H300M75 0V150M150 0V150M225 0V150" /></g>;
}

function plot(points: Vec3[], a: number, b: number) {
  const av = points.map((point) => point[a]);
  const bv = points.map((point) => point[b]);
  const minA = Math.min(...av), maxA = Math.max(...av), minB = Math.min(...bv), maxB = Math.max(...bv);
  return points.map((point) => `${20 + (point[a] - minA) / Math.max(.001, maxA - minA) * 260},${130 - (point[b] - minB) / Math.max(.001, maxB - minB) * 110}`).join(" ");
}

function VectorControl({ label, value, onChange }: { label: string; value: Vec3; onChange: (value: Vec3) => void }) {
  return <fieldset className="vector-control"><legend>{label}</legend>{(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis}>{axis}<input type="number" step="0.05" value={value[index]} onChange={(event) => { const next: Vec3 = [...value]; next[index] = Number(event.target.value); onChange(next); }} /></label>)}</fieldset>;
}

function NumberControl({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="director-range"><span>{label}<output>{value.toFixed(step < .1 ? 3 : 1)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="director-color">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NullableControl({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <div className="nullable-control"><label className="studio-check"><input type="checkbox" checked={value !== null} onChange={(event) => onChange(event.target.checked ? .5 : null)} />Override {label.toLowerCase()}</label><NumberControl label={label} value={value ?? .5} min={0} max={1} step={.01} onChange={(next) => onChange(next)} /></div>;
}

function midpoint(range: [number, number]) {
  return range[0] + (range[1] - range[0]) * 0.5;
}
