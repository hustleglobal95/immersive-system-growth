"use client";

import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { QualityMode } from "@/src/types/experience";

const round = (n: number) => Number(n.toFixed(3));

export function LabControls() {
  const guides=useExperienceStore(s=>s.guides);
  const progress = useExperienceStore((state) => state.progress);
  const activeScene = useExperienceStore((state) => state.activeScene);
  const quality = useExperienceStore((state) => state.qualityMode);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const freeCamera = useExperienceStore((state) => state.freeCamera);
  const camera = useExperienceStore((state) => state.cameraTelemetry);
  const setQuality = useExperienceStore((state) => state.setQuality);
  const setReducedMotion = useExperienceStore(
    (state) => state.setReducedMotion,
  );
  const setFreeCamera = useExperienceStore((state) => state.setFreeCamera);

  const scrub = (value: number) => {
    const index = experience.scenes.findIndex(
      (s, i) =>
        value >= s.range[0] &&
        (value < s.range[1] || i === experience.scenes.length - 1),
    );
    const scene = experience.scenes[index],
      start = document.getElementById(scene.id)?.offsetTop ?? 0;
    const next = experience.scenes[index + 1];
    const end = next
      ? (document.getElementById(next.id)?.offsetTop ?? start)
      : document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top:
        start +
        ((end - start) * (value - scene.range[0])) /
          (scene.range[1] - scene.range[0]),
      behavior: "instant",
    });
  };
  const copyCamera = async () => {
    const payload = JSON.stringify(
      {
        position: camera.position.map(round),
        target: camera.target.map(round),
        fov: round(camera.fov),
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      window.prompt("Copy camera state", payload);
    }
  };

  return (
    <aside className="lab-controls" aria-label="Scene lab controls">
      <div className="lab-controls__head">
        <strong>SCENE LAB</strong>
        <span>{experience.scenes[activeScene]?.label}</span>
      </div>
      <label>
        Timeline <output>{progress.toFixed(3)}</output>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={progress}
          onChange={(event) => scrub(Number(event.target.value))}
        />
      </label>
      <label>
        Quality{" "}
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value as QualityMode)}
        >
          <option value="auto">Auto</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="lab-controls__check">
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(event) => setReducedMotion(event.target.checked)}
        />{" "}
        Reduced motion
      </label>
      <label className="lab-controls__check">
        <input
          type="checkbox"
          checked={freeCamera}
          onChange={(event) => setFreeCamera(event.target.checked)}
        />{" "}
        Free camera
      </label>
      <label className="lab-controls__check"><input type="checkbox" checked={guides} onChange={e=>useExperienceStore.getState().setGuides(e.target.checked)}/> Show authoring guides</label>
      <button
        className="lab-controls__button"
        type="button"
        onClick={copyCamera}
      >
        Copy camera state
      </button>
      {freeCamera && (
        <small>
          Drag to orbit. Scroll to zoom. Copy the result into the current scene
          camera keyframe.
        </small>
      )}
    </aside>
  );
}
