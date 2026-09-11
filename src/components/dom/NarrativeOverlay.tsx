import Link from "next/link";
import { experience } from "@/src/lib/experience";
import { CinematicDomMotion } from "./CinematicDomMotion";
import type { CinematicCue } from "@/src/lib/cinematicDom";
const cues: CinematicCue[] = experience.scenes.map((scene, index) => ({
  selector: `[data-motion-scene="${index}"] [data-motion-copy]`,
  range: [scene.range[0], scene.range[0] + (scene.range[1] - scene.range[0]) * .28],
  preset: "text-settle",
}));
// Ordinary server-rendered content remains the baseline. No opacity/aria-hidden gate owns primary copy.
export function NarrativeOverlay() {
  const runway = Math.max(
    experience.runtime.sceneHeightVh * experience.scenes.length,
    100 / Math.min(...experience.scenes.map((s) => s.range[1] - s.range[0])),
  );
  return (
    <CinematicDomMotion cues={cues}>
    <main
      id="experience-content"
      className="narrative-document"
      aria-label={experience.meta.name}
    >
      {experience.scenes.map((scene, index) => (
        <section
          id={scene.id}
          key={scene.id}
          data-motion-scene={index}
          className={`story-section story-section--${scene.copy.align ?? "left"}`}
          style={{
            minHeight: `${runway * (scene.range[1] - scene.range[0]) + (index === experience.scenes.length - 1 ? 100 : 0)}svh`,
          }}
          aria-labelledby={`${scene.id}-heading`}
        >
          <div className="story-panel">
            <div className="narrative-panel__index">
              {String(index + 1).padStart(2, "0")}
            </div>
            {scene.copy.eyebrow && (
              <p className="eyebrow" data-motion-copy>{scene.copy.eyebrow}</p>
            )}
            {index === 0 ? (
              <h1 id={`${scene.id}-heading`} data-motion-copy>{scene.copy.headline}</h1>
            ) : (
              <h2 id={`${scene.id}-heading`} data-motion-copy>{scene.copy.headline}</h2>
            )}
            <p className="narrative-body" data-motion-copy>{scene.copy.body}</p>
            {experience.hotspots
              .filter((h) => h.sceneId === scene.id)
              .map((h) => (
                <details key={h.id} className="story-detail">
                  <summary>{h.label}</summary>
                  <p>{h.description}</p>
                </details>
              ))}
            {scene.copy.cta && (
              <Link className="forge-button" href={scene.copy.cta.href}>
                {scene.copy.cta.label}
              </Link>
            )}
          </div>
        </section>
      ))}
    </main>
    </CinematicDomMotion>
  );
}
