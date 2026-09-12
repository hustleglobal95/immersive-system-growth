"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ExperienceConfigProvider } from "@/src/components/runtime/ExperienceConfigContext";
import { StudioEditorProvider, type StudioGizmoState } from "@/src/components/runtime/StudioEditorContext";
import { CinematicMedia } from "@/src/components/dom/CinematicMedia";
import { CinematicTransitionLayers } from "@/src/components/dom/CinematicTransitionLayers";
import { getSceneIndex } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { ExperienceConfig, QualityMode } from "@/src/types/experience";
import { sampleExperience } from "@/src/lib/sampleExperience";
import type { CSSProperties } from "react";

const SceneCanvas = dynamic(
  () => import("@/src/components/three/SceneCanvas").then((module) => module.SceneCanvas),
  { ssr: false },
);

type Viewport = "desktop" | "tablet" | "mobile";

export function StudioLivePreview({
  experience,
  active,
  setActive,
  progress: controlledProgress,
  onProgressChange,
  gizmo = null,
}: {
  experience: ExperienceConfig;
  active: number;
  setActive: (index: number) => void;
  progress?: number;
  onProgressChange?: (progress: number) => void;
  gizmo?: StudioGizmoState | null;
}) {
  const [internalProgress, setInternalProgress] = useState(() => midpoint(experience.scenes[active].range));
  const progress = controlledProgress ?? internalProgress;
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(progress);
  const onProgressChangeRef = useRef(onProgressChange);
  const quality = useExperienceStore((state) => state.qualityMode);
  const webgl = useExperienceStore((state) => state.webglStatus);
  const stats = useExperienceStore((state) => state.rendererStats);

  useEffect(() => {
    const store = useExperienceStore.getState();
    store.setProfile("high", "high");
    store.setSystemReducedMotion(false);
    store.setReducedMotion(false);
    store.setDebug(false);
    return () => {
      store.setReducedMotion(null);
      store.setWebglStatus("loading");
    };
  }, []);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { onProgressChangeRef.current = onProgressChange; }, [onProgressChange]);

  useEffect(() => {
    const sceneIndex = getSceneIndex(progress, experience);
    useExperienceStore.getState().setScrollState(progress, 0, 0, sceneIndex);
    if (sceneIndex !== active) setActive(sceneIndex);
  }, [active, experience, progress, setActive]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let prior = performance.now();
    const tick = (now: number) => {
      const next = (progressRef.current + (now - prior) / 18_000) % 1;
      prior = now;
      progressRef.current = next;
      if (onProgressChangeRef.current) onProgressChangeRef.current(next);
      else setInternalProgress(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const seek = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    progressRef.current = next;
    if (onProgressChangeRef.current) onProgressChangeRef.current(next);
    else setInternalProgress(next);
  };
  const aspect = viewport === "mobile" ? 9 / 16 : viewport === "tablet" ? 4 / 3 : 16 / 9;
  const sampled = sampleExperience(progress, false, experience, aspect);

  const selectScene = (index: number) => {
    setPlaying(false);
    setActive(index);
    seek(midpoint(experience.scenes[index].range));
  };

  return (
    <section className="studio-card studio-preview" aria-labelledby="live-preview-title">
      <div className="studio-card__head">
        <div><span>PRODUCTION RUNTIME</span><h2 id="live-preview-title">Live experience preview</h2></div>
        <output data-status={webgl}>{webgl}</output>
      </div>
      <div className="studio-preview__toolbar">
        <div role="group" aria-label="Preview viewport">
          {(["desktop", "tablet", "mobile"] as const).map((size) => <button type="button" key={size} aria-pressed={viewport === size} onClick={() => setViewport(size)}>{size}</button>)}
        </div>
        <label>Quality<select aria-label="Preview quality" value={quality} onChange={(event) => useExperienceStore.getState().setQuality(event.target.value as QualityMode)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <span>{stats.calls} calls / {stats.triangles.toLocaleString()} triangles</span>
      </div>
      <div className="studio-preview__viewport" data-viewport={viewport}>
        <div className="studio-preview__canvas">
          <ExperienceConfigProvider value={experience}><StudioEditorProvider value={gizmo}><SceneCanvas /><CinematicMedia /><CinematicTransitionLayers /></StudioEditorProvider></ExperienceConfigProvider>
          <div className="studio-preview__copy" style={{ opacity: sampled.motion.copy.opacity, translate: `0 ${sampled.motion.copy.y}px`, filter: `blur(${sampled.motion.copy.blur}px)` } as CSSProperties}>
            <span>{experience.scenes[active].copy.eyebrow}</span>
            <strong>{experience.scenes[active].copy.headline}</strong>
          </div>
        </div>
      </div>
      <div className="studio-preview__transport">
        <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button>
        <output>{progress.toFixed(3)}</output>
        <input aria-label="Live preview progress" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => { setPlaying(false); seek(Number(event.target.value)); }} />
      </div>
      <div className="studio-preview__scenes" role="list" aria-label="Preview scenes">
        {experience.scenes.map((scene, index) => <button role="listitem" type="button" key={scene.id} className={active === index ? "is-active" : ""} onClick={() => selectScene(index)}><small>{String(index + 1).padStart(2, "0")}</small>{scene.label}</button>)}
      </div>
    </section>
  );
}

function midpoint(range: [number, number]) {
  return range[0] + (range[1] - range[0]) * 0.5;
}
