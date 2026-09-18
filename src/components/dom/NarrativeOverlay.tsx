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
const CHAPTER_MOTION: Record<string, { headline: CinematicPreset; lede: CinematicPreset; pace?: number; lead?: number; rows?: CinematicPreset; plates?: CinematicPreset;
  collapse?: CinematicPreset; collapseAt?: readonly [number, number] }> = {
  // 01 Position clears its words early and upward, leaving the carousel alone in the frame
  // for a beat before the ring itself goes.
  parti: { headline: "headline-words", lede: "lede-words" },
  threshold: { headline: "headline-unfold", lede: "copy-drift" },
  living: { headline: "headline-drop", lede: "lede-words", rows: "list-unfold", plates: "plate-rise" },
  material: { headline: "headline-fracture", lede: "lede-scatter", rows: "list-unfold" },
  wellness: { headline: "headline-swing", lede: "copy-drift" },
  studio: { headline: "headline-words", lede: "lede-scatter" },
  horizon: { headline: "headline-converge", lede: "lede-words" },
  inquiry: { headline: "headline-slide", lede: "copy-drift" },
};

/**
 * One rhythm for every handover.
 *
 * Each chapter used to carry its own lead, pace and collapse point, which left the stretch with
 * nothing to read ranging from 6vh at the closing handover to 141vh at 02 into 03 -- measured as
 * legible headline ink. The presets above stay different, because that is the authored character
 * of each chapter; only the timing is shared, so the sequence reads at one tempo.
 *
 * The three windows are solved together and stay strictly serial. A chapter's copy is empty by
 * about 0.86, the media handover runs 0.86 to 1.0 on a 0.14 overlap, and the next chapter's copy
 * begins at its own 0. Nothing overlaps, and the stretch with no headline to read is the handover
 * itself rather than the handover plus a wait either side of it.
 */
// collapseAt drives the GSAP disperse and panel-collapse cues; the authored copy.opacity track
// empties the panel at 0.86. Both have to land together or whichever fires first decides when
// the chapter stops being readable, which is what left 02 into 03 a third longer than its
// neighbours: the disperse was ending at 0.76 while the track ran on to 0.86.
const RHYTHM = { lead: 0, pace: 1, entrance: .62, collapseAt: [.82, .92] as const };
const FALLBACK_MOTION = { headline: "headline-words", lede: "lede-words" } as const;

// Every cue is seeked by the one scroll clock, so scrubbing backwards reconstructs the same frame.
const cues: CinematicCue[] = experience.scenes.flatMap((scene, index) => {
  // The arrival chapter has no scroll behind it, so a scroll-gated entrance would leave the
  // hero half-assembled on load. It renders settled and leaves through its copy tracks.
  if (!index) return [];
  const span = scene.range[1] - scene.range[0];
  const start = scene.range[0];
  const motion = CHAPTER_MOTION[scene.id] ?? FALLBACK_MOTION;
  const scope = '[data-motion-scene="' + index + '"] ';

  // Chapter shape. The settled state is the point of the chapter, so the entrance is brief
  // and the hold runs two full screens: 18vh lead, 53vh entrance, 202vh arrived, 35vh exit,
  // 18vh still, 114vh handover at a 440vh chapter.
  const lead = motion.lead ?? RHYTHM.lead;
  const pace = Math.min(1.15, motion.pace ?? RHYTHM.pace);
  const at = (fraction: number) => start + span * Math.min(1, fraction);
  // The cues used to be authored against playback eases that front-loaded their movement, so a
  // headline was readable almost as soon as its cue began. On the shared scrubbed curve the
  // motion starts from rest instead, which pushed legibility later and cost about 34vh a
  // handover. The windows are compressed to give that back: the same distance, travelled over
  // less scroll, still starting and settling at rest.
  const ent = (fraction: number) => at(lead + fraction * RHYTHM.entrance * pace);
  return [
    { selector: scope + "[data-motion-headline]", range: [ent(0), ent(.11)], preset: motion.headline },
    { selector: scope + "[data-motion-lede]", range: [ent(.03), ent(.13)], preset: motion.lede },
    { selector: scope + "[data-motion-block]", range: [ent(.02), ent(.12)], preset: "copy-drift" },
    { selector: scope + "[data-motion-row]", range: [ent(.03), ent(.13)], preset: motion.rows ?? "copy-drift" },
    { selector: scope + "[data-motion-plate]", range: [ent(.04), ent(.14)], preset: motion.plates ?? "copy-drift" },
    { selector: scope + "[data-motion-aside]", range: [ent(.05), ent(.13)], preset: "copy-drift" },
    { selector: scope + "[data-motion-cta]", range: [ent(.06), ent(.14)], preset: "copy-drift" },
    {
      selector: scope + "[data-motion-headline] .forge-split",
      range: [at((motion.collapseAt?.[0] ?? RHYTHM.collapseAt[0]) - .04), at((motion.collapseAt?.[1] ?? RHYTHM.collapseAt[1]) - .06)],
      preset: "type-disperse",
    },
    {
      selector: scope + "[data-motion-panel]",
      range: [at(motion.collapseAt?.[0] ?? RHYTHM.collapseAt[0]), at(motion.collapseAt?.[1] ?? RHYTHM.collapseAt[1])],
      preset: motion.collapse ?? "section-collapse",
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
          data-scene-id={scene.id}
          data-motion-scene={index}
          className={"story-section story-section--" + (scene.copy.align ?? "left") + (scene.blocks.length ? " story-section--blocks" : "")}
          style={{
            minHeight: `${runway * (scene.range[1] - scene.range[0]) + (index === experience.scenes.length - 1 ? 100 : 0)}svh`,
          }}
          aria-labelledby={`${scene.id}-heading`}
        >
          {scene.media && <img className="story-media-static" src={scene.media.poster ?? scene.media.src} alt={scene.media.alt} loading={index===0?"eager":"lazy"} />}
          <div className="story-panel" data-motion-panel>
            {/* The chapter number and its "NN / NAME" label are no longer printed above the
                headline. The eyebrow stays on the scene in config, because the Studio editors
                and the Heliot experience both read it; this layout simply opens on its own
                headline. The progress rail still carries the chapter count. */}
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
