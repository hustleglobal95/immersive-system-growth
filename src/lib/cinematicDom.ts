import gsap from "gsap";
import { cueProgress } from "./cinematicProgress";

export type CinematicPreset = "text-settle" | "curtain" | "image-depth" | "gallery-settle";
export interface CinematicCue {
  /** Selector scoped to the supplied root. Use a wrapper when CSS owns transforms. */
  selector: string;
  range: readonly [number, number];
  preset: CinematicPreset;
}

/** Build once; seek only when progress changes; revert all inline mutations on teardown. */
export function createCinematicDom(root: HTMLElement, cues: readonly CinematicCue[], compact = false) {
  const tracks: { timeline: gsap.core.Timeline; range: readonly [number, number] }[] = [];
  // Validate before any mutation so a bad cue cannot leak partially built animations.
  for (const cue of cues) {
    cueProgress(0, cue.range);
    const targets = Array.from(root.querySelectorAll<HTMLElement>(cue.selector));
    if (cue.preset !== "text-settle" && targets.some((el) =>
      el.getAttribute("aria-hidden") !== "true" ||
      el.matches("a,button,input,select,textarea,[tabindex],summary") ||
      el.querySelector("a,button,input,select,textarea,[tabindex],summary"))) {
      throw new Error("Decorative motion requires aria-hidden targets without interactive descendants");
    }
  }
  const context = gsap.context(() => {
    for (const cue of cues) {
      const targets = Array.from(root.querySelectorAll<HTMLElement>(cue.selector));
      if (!targets.length) continue;
      const timeline = gsap.timeline({ paused: true });
      const distance = compact ? 10 : 28;
      if (cue.preset === "text-settle") {
        timeline.fromTo(targets, { y: distance }, {
          y: 0, duration: 1, stagger: { amount: .18 }, ease: "power2.out", immediateRender: false,
        });
      } else if (cue.preset === "curtain") {
        timeline.fromTo(targets, { clipPath: "inset(0 0 100% 0)" }, {
          clipPath: "inset(0 0 0% 0)", duration: 1, ease: "power2.inOut", immediateRender: false,
        });
      } else if (cue.preset === "image-depth") {
        timeline.fromTo(targets, { yPercent: compact ? 2 : 6, scale: compact ? 1.03 : 1.08 }, {
          yPercent: compact ? -2 : -6, scale: 1, duration: 1, ease: "none", immediateRender: false,
        });
      } else {
        timeline.fromTo(targets, { y: distance, rotation: compact ? 0 : 2 }, {
          y: 0, rotation: 0, duration: 1, stagger: { amount: .3 }, ease: "power2.out", immediateRender: false,
        });
      }
      tracks.push({ timeline, range: cue.range });
    }
  }, root);
  let previous = NaN;
  return {
    seek(progress: number) {
      if (progress === previous) return;
      previous = progress;
      for (const track of tracks) track.timeline.progress(cueProgress(progress, track.range), true);
    },
    revert() { context.revert(); },
  };
}
