"use client";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useInteractionStore } from "@/src/store/interactionStore";
import { experience } from "@/src/lib/experience";
export function DebugHUD() {
  const scene = useExperienceStore((s) => s.activeScene),
    quality = useExperienceStore((s) => s.quality),
    mode = useExperienceStore((s) => s.qualityMode),
    stats = useExperienceStore((s) => s.rendererStats),
    camera = useExperienceStore((s) => s.cameraTelemetry),
    interactionState = useInteractionStore((s) => s.state),
    lastEvent = useInteractionStore((s) => s.lastEvent),
    matchedTriggers = useInteractionStore((s) => s.matchedTriggers),
    graphHalted = useInteractionStore((s) => s.halted);
  return (
    <aside className="debug-hud" aria-label="3D debug information">
      <strong>FORGE HUD</strong>
      <dl>
        {Object.entries({
          scene: experience.scenes[scene]?.label,
          quality: `${quality} (${mode})`,
          interaction: interactionState,
          "graph event": lastEvent ? [lastEvent.type, lastEvent.target ?? lastEvent.sceneId ?? lastEvent.name].filter(Boolean).join(" / ") : "none",
          "graph triggers": matchedTriggers.length ? matchedTriggers.join(", ") : "none",
          "graph guard": graphHalted ? "HALTED" : "ok",
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
