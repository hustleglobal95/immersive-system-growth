"use client";
import { useExperienceStore } from "@/src/store/experienceStore";
import { experience } from "@/src/lib/experience";
export function DebugHUD() {
  const scene = useExperienceStore((s) => s.activeScene),
    quality = useExperienceStore((s) => s.quality),
    mode = useExperienceStore((s) => s.qualityMode),
    stats = useExperienceStore((s) => s.rendererStats),
    camera = useExperienceStore((s) => s.cameraTelemetry);
  return (
    <aside className="debug-hud" aria-label="3D debug information">
      <strong>FORGE HUD</strong>
      <dl>
        {Object.entries({
          scene: experience.scenes[scene]?.label,
          quality: `${quality} (${mode})`,
          camera: camera.position.map((n) => n.toFixed(2)).join(", "),
          target: camera.target.map((n) => n.toFixed(2)).join(", "),
          fov: camera.fov.toFixed(1),
          calls: stats.calls,
          triangles: stats.triangles,
          textures: stats.textures,
          geometries: stats.geometries,
          "frame ms": stats.frameMs.toFixed(1),
          "GPU ms": "unavailable",
        }).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <small>
        Previous complete frame: all passes. Frame ms includes browser
        scheduling, not GPU execution time.
      </small>
    </aside>
  );
}
