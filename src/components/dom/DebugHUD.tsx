"use client";

import { experience } from "@/src/lib/experience";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";

const fmt = (value: number) => value.toFixed(2);

export function DebugHUD() {
  const debug = useExperienceStore((state) => state.debug);
  const progress = useExperienceStore((state) => state.progress);
  const velocity = useExperienceStore((state) => state.velocity);
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const rendererStats = useExperienceStore((state) => state.rendererStats);
  if (!debug) return null;
  const sampled = sampleExperience(progress, reducedMotion);

  return (
    <aside className="debug-hud" aria-label="3D debug information">
      <strong>FORGE HUD</strong>
      <dl>
        <div><dt>scene</dt><dd>{sampled.scene.id}</dd></div>
        <div><dt>progress</dt><dd>{fmt(progress)}</dd></div>
        <div><dt>local</dt><dd>{fmt(sampled.localProgress)}</dd></div>
        <div><dt>velocity</dt><dd>{fmt(velocity)}</dd></div>
        <div><dt>quality</dt><dd>{quality}</dd></div>
        <div><dt>motion</dt><dd>{reducedMotion ? "reduced" : "full"}</dd></div>
        <div><dt>camera</dt><dd>{sampled.camera.position.map(fmt).join(", ")}</dd></div>
        <div><dt>calls</dt><dd>{rendererStats.calls}</dd></div>
        <div><dt>triangles</dt><dd>{rendererStats.triangles.toLocaleString()}</dd></div>
        <div><dt>scenes</dt><dd>{experience.scenes.length}</dd></div>
      </dl>
      <small>Press D to toggle. Arrow keys jump scenes.</small>
    </aside>
  );
}
