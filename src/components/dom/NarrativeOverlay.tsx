import Link from "next/link";
import { experience } from "@/src/lib/experience";
import { CinematicDomMotion } from "./CinematicDomMotion";
import type { CinematicCue, CinematicPreset } from "@/src/lib/cinematicDom";
import { SceneBlocks } from "./SceneBlocks";
/**
 * Per-chapter motion direction. Each section gets its own combination so the sequence reads as
 * nine authored chapters rather than one effect repeated: the label, the headline and the lede
 * each carry a different treatment, and `pace` sets how quickly that chapter's copy lands.
 * Chapters not listed here fall back to the last entry's shape.
 */
const CHAPTER_MOTION: Record<string, { label: CinematicPreset; headline: CinematicPreset; lede: CinematicPreset; pace: number; lead?: number }> = {
  parti: { label: "label-track", headline: "headline-words", lede: "lede-words", pace: 1 },
  threshold: { label: "text-settle", headline: "headline-reveal", lede: "copy-drift", pace: .6, lead: .03 },
  living: { label: "label-track", headline: "headline-slide", lede: "lede-scatter", pace: 1.18 },
  material: { label: "text-settle", headline: "headline-chars", lede: "lede-words", pace: 1.3 },
  wellness: { label: "label-track", headline: "headline-swing", lede: "copy-drift", pace: .9 },
  studio: { label: "text-settle", headline: "headline-words", lede: "lede-scatter", pace: 1.1 },
  horizon: { label: "label-track", headline: "headline-reveal", lede: "lede-words", pace: .72 },
  inquiry: { label: "text-settle", headline: "headline-chars", lede: "copy-drift", pace: 1.24 },
};
const FALLBACK_MOTION = { label: "label-track", headline: "headline-words", lede: "lede-words", pace: 1 } as const;

// Every cue is seeked by the one scroll clock, so scrubbing backwards reconstructs the same frame.
const cues: CinematicCue[] = experience.scenes.flatMap((scene, index) => {
  // The arrival chapter has no scroll behind it, so a scroll-gated entrance would leave the
  // hero half-assembled on load. It renders settled and leaves through its copy tracks.
  if (!index) return [];
  const span = scene.range[1] - scene.range[0];
  const start = scene.range[0];
  const motion = CHAPTER_MOTION[scene.id] ?? FALLBACK_MOTION;
  const scope = '[data-motion-scene="' + index + '"] ';
  // Every cue lands inside the window the copy is actually lit for. The pinned panel releases
  // at roughly 0.62 of its section, so all motion finishes before that and the chapter ends on
  // a held frame rather than on content sliding away upward.
  const lead = motion.lead ?? .12;
  const pace = Math.min(1, motion.pace);
  const at = (fraction: number) => start + span * Math.min(1, fraction);
  return [
    { selector: scope + "[data-motion-index]", range: [at(lead), at(lead + .1 * pace)], preset: motion.label },
    { selector: scope + "[data-motion-copy]", range: [at(lead + .02), at(lead + .14 * pace)], preset: motion.label },
    { selector: scope + "[data-motion-headline]", range: [at(lead), at(lead + .3 * pace)], preset: motion.headline },
    { selector: scope + "[data-motion-lede]", range: [at(lead + .1), at(lead + .38 * pace)], preset: motion.lede },
    { selector: scope + "[data-motion-aside]", range: [at(lead + .18), at(lead + .42)], preset: "copy-drift" },
    { selector: scope + "[data-motion-cta]", range: [at(lead + .22), at(lead + .44)], preset: "copy-drift" },
    { selector: scope + "[data-motion-block]", range: [at(lead + .04), at(lead + .4)], preset: "copy-drift" },
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
          data-scene-id={scene.id}
          data-motion-scene={index}
          className={"story-section story-section--" + (scene.copy.align ?? "left") + (scene.blocks.length ? " story-section--blocks" : "")}
          style={{
            minHeight: `${runway * (scene.range[1] - scene.range[0]) + (index === experience.scenes.length - 1 ? 100 : 0)}svh`,
          }}
          aria-labelledby={`${scene.id}-heading`}
        >
          {scene.media && <img className="story-media-static" src={scene.media.poster ?? scene.media.src} alt={scene.media.alt} loading={index===0?"eager":"lazy"} />}
          <div className="story-panel">
            <div className="narrative-panel__index" data-motion-index>
              {String(index + 1).padStart(2, "0")}
            </div>
            {scene.copy.eyebrow && (
              <p className="eyebrow" data-motion-copy>{scene.copy.eyebrow}</p>
            )}
            {index === 0 ? (
              <h1 id={`${scene.id}-heading`} data-motion-headline>{scene.copy.headline}</h1>
            ) : (
              <h2 id={`${scene.id}-heading`} data-motion-headline>{scene.copy.headline}</h2>
            )}
            <p className="narrative-body" data-motion-lede>{scene.copy.body}</p>
            <SceneBlocks blocks={scene.blocks} range={scene.range} />
            {experience.hotspots
              .filter((h) => h.sceneId === scene.id)
              .map((h) => (
                <details key={h.id} className="story-detail" data-motion-aside>
                  <summary data-forge-interaction={`hotspot-${h.id}`}>{h.label}</summary>
                  <p>{h.description}</p>
                </details>
              ))}
            {scene.copy.cta && (
              <Link className="forge-button" href={scene.copy.cta.href} data-motion-cta data-forge-interaction={`cta-${scene.id}`}>
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
