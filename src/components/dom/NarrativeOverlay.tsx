import Link from "next/link";
import { experience } from "@/src/lib/experience";
import { CinematicDomMotion } from "./CinematicDomMotion";
import type { CinematicCue } from "@/src/lib/cinematicDom";
import { SceneBlocks } from "./SceneBlocks";
const cues: CinematicCue[] = experience.scenes.flatMap((scene, index) => {
  const span = scene.range[1] - scene.range[0];
  return [
    {
      selector: '[data-motion-scene="' + index + '"] [data-motion-copy]',
      range: [scene.range[0], scene.range[0] + span * (scene.media?.textEnd ?? .28)],
      preset: "text-settle",
    },
    {
      selector: '[data-motion-scene="' + index + '"] [data-motion-block]',
      range: [scene.range[0] + span * .08, scene.range[0] + span * .66],
      preset: "text-settle",
    },
  ];
});
// Ordinary server-rendered content remains the baseline. No opacity/aria-hidden gate owns primary copy.
export function NarrativeOverlay() {
  const runway = Math.max(
    experience.runtime.sceneHeightVh * experience.scenes.length,
    100 / Math.min(...experience.scenes.map((s) => s.range[1] - s.range[0])),
  );
  return (
    <CinematicDomMotion cues={cues} experience={experience}>
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
          className={"story-section story-section--" + (scene.copy.align ?? "left") + (scene.blocks.length ? " story-section--blocks" : "")}
          style={{
            minHeight: `${runway * (scene.range[1] - scene.range[0]) + (index === experience.scenes.length - 1 ? 100 : 0)}svh`,
          }}
          aria-labelledby={`${scene.id}-heading`}
        >
          {scene.media && <img className="story-media-static" src={scene.media.poster ?? scene.media.src} alt={scene.media.alt} loading={index===0?"eager":"lazy"} />}
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
            <SceneBlocks blocks={scene.blocks} />
            {experience.hotspots
              .filter((h) => h.sceneId === scene.id)
              .map((h) => (
                <details key={h.id} className="story-detail">
                  <summary data-forge-interaction={`hotspot-${h.id}`}>{h.label}</summary>
                  <p>{h.description}</p>
                </details>
              ))}
            {scene.copy.cta && (
              <Link className="forge-button" href={scene.copy.cta.href} data-forge-interaction={`cta-${scene.id}`}>
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
