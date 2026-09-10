"use client";

import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { QualityTier } from "@/src/types/experience";

const round = (n: number) => Number(n.toFixed(3));

export function LabControls() {
  const progress = useExperienceStore((state) => state.progress);
  const activeScene = useExperienceStore((state) => state.activeScene);
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const freeCamera = useExperienceStore((state) => state.freeCamera);
  const camera = useExperienceStore((state) => state.cameraTelemetry);
  const setQuality = useExperienceStore((state) => state.setQuality);
  const setReducedMotion = useExperienceStore((state) => state.setReducedMotion);
  const setFreeCamera = useExperienceStore((state) => state.setFreeCamera);

  const scrub = (value: number) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll * value, behavior: "auto" });
  };
  const copyCamera = async () => {
    const payload = JSON.stringify({ position: camera.position.map(round), target: camera.target.map(round), fov: round(camera.fov) }, null, 2);
    await navigator.clipboard.writeText(payload);
  };

  return (
    <aside className="lab-controls" aria-label="Scene lab controls">
      <div className="lab-controls__head"><strong>SCENE LAB</strong><span>{experience.scenes[activeScene]?.label}</span></div>
      <label>Timeline <output>{progress.toFixed(3)}</output><input type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => scrub(Number(event.target.value))} /></label>
      <label>Quality <select value={quality} onChange={(event) => setQuality(event.target.value as QualityTier)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <label className="lab-controls__check"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
      <label className="lab-controls__check"><input type="checkbox" checked={freeCamera} onChange={(event) => setFreeCamera(event.target.checked)} /> Free camera</label>
      <button className="lab-controls__button" type="button" onClick={copyCamera}>Copy camera state</button>
      {freeCamera && <small>Drag to orbit. Scroll to zoom. Copy the result into the current scene camera keyframe.</small>}
    </aside>
  );
}
