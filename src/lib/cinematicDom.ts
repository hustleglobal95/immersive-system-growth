import gsap from "gsap";
import { cueProgress } from "./cinematicProgress";

export type CinematicPreset =
  | "text-settle"
  | "headline-reveal"
  | "headline-words"
  | "headline-chars"
  | "lede-words"
  | "label-track"
  | "copy-drift"
  | "curtain"
  | "image-depth"
  | "gallery-settle";
/** Presets that carry primary copy, so they are allowed to animate accessible content. */
const COPY_PRESETS = new Set<CinematicPreset>([
  "text-settle", "headline-reveal", "headline-words", "headline-chars", "lede-words",
  "label-track", "copy-drift",
]);
/** Presets whose targets are split into per-word or per-character boxes before animating. */
const SPLIT_PRESETS: Partial<Record<CinematicPreset, "word" | "char">> = {
  "headline-words": "word",
  "headline-chars": "char",
  "lede-words": "word",
};

interface SplitTarget { element: HTMLElement; html: string }
/**
 * Wraps each word or character in a masking box so type can rise out of its own line.
 * Text content is unchanged, so headings keep serving `aria-labelledby` and selection, and the
 * original markup is restored on teardown -- gsap.context() reverts styles, not DOM surgery.
 */
function splitText(element: HTMLElement, unit: "word" | "char") {
  const html = element.innerHTML;
  const text = element.textContent ?? "";
  const fragment = document.createDocumentFragment();
  const parts: HTMLElement[] = [];
  const box = (token: string) => {
    const outer = document.createElement("span");
    outer.className = "forge-split";
    const inner = document.createElement("span");
    inner.className = "forge-split__inner";
    inner.textContent = token;
    outer.append(inner);
    parts.push(inner);
    return outer;
  };
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    if (/^\s+$/.test(word)) { fragment.append(document.createTextNode(word)); continue; }
    if (unit === "word") { fragment.append(box(word)); continue; }
    // Per-character boxes are inline-block, so each word needs its own nowrap container or
    // the line breaks mid-word.
    const group = document.createElement("span");
    group.className = "forge-split-word";
    for (const character of Array.from(word)) group.append(box(character));
    fragment.append(group);
  }
  if (!parts.length) return null;
  element.replaceChildren(fragment);
  return { parts, record: { element, html } as SplitTarget };
}
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
    if (!COPY_PRESETS.has(cue.preset) && targets.some((el) =>
      el.getAttribute("aria-hidden") !== "true" ||
      el.matches("a,button,input,select,textarea,[tabindex],summary") ||
      el.querySelector("a,button,input,select,textarea,[tabindex],summary"))) {
      throw new Error("Decorative motion requires aria-hidden targets without interactive descendants");
    }
  }
  // Split before the context opens so the per-token boxes exist as animation targets.
  const splits: SplitTarget[] = [];
  const splitParts = new Map<CinematicCue, HTMLElement[]>();
  for (const cue of cues) {
    const unit = SPLIT_PRESETS[cue.preset];
    if (!unit) continue;
    const parts: HTMLElement[] = [];
    for (const element of root.querySelectorAll<HTMLElement>(cue.selector)) {
      const split = splitText(element, unit);
      if (!split) continue;
      splits.push(split.record);
      parts.push(...split.parts);
    }
    if (parts.length) splitParts.set(cue, parts);
  }
  const context = gsap.context(() => {
    for (const cue of cues) {
      const targets = splitParts.get(cue) ?? Array.from(root.querySelectorAll<HTMLElement>(cue.selector));
      if (!targets.length) continue;
      const timeline = gsap.timeline({ paused: true });
      const distance = compact ? 10 : 28;
      if (cue.preset === "text-settle") {
        timeline.fromTo(targets, { y: distance }, {
          y: 0, duration: 1, stagger: { amount: .18 }, ease: "power2.out", immediateRender: true,
        });
      } else if (cue.preset === "headline-reveal") {
        // A masked rise: the headline wipes up out of its own box and settles from a slight
        // over-scale, which reads as one continuous move rather than a fade-in.
        timeline.fromTo(targets, {
          clipPath: "inset(0% 0% 108% 0%)",
          y: compact ? 28 : 62,
          scale: compact ? 1.014 : 1.035,
          transformOrigin: "0% 100%",
        }, {
          clipPath: "inset(0% 0% 0% 0%)",
          y: 0,
          scale: 1,
          duration: 1,
          stagger: { amount: compact ? .06 : .12 },
          ease: "expo.out",
          immediateRender: true,
        });
      } else if (cue.preset === "headline-words") {
        // Each word rises out of its own mask, so the line assembles instead of appearing.
        timeline.fromTo(targets, { yPercent: 118, rotate: compact ? 0 : 2.4 }, {
          yPercent: 0, rotate: 0, duration: 1,
          stagger: { amount: compact ? .36 : .62, from: "start" },
          ease: "expo.out", immediateRender: true,
        });
      } else if (cue.preset === "headline-chars") {
        timeline.fromTo(targets, { yPercent: 108, rotateX: compact ? 0 : -62, opacity: 0, transformPerspective: 620, transformOrigin: "50% 100%" }, {
          yPercent: 0, rotateX: 0, opacity: 1, duration: 1,
          stagger: { amount: compact ? .42 : .74, from: "start" },
          ease: "power4.out", immediateRender: true,
        });
      } else if (cue.preset === "lede-words") {
        timeline.fromTo(targets, { yPercent: 64, opacity: 0, filter: "blur(5px)" }, {
          yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1,
          stagger: { amount: compact ? .4 : .72, from: "start" },
          ease: "power3.out", immediateRender: true,
        });
      } else if (cue.preset === "label-track") {
        // Small caps settle by tightening their tracking rather than sliding. The authored
        // tracking is read before the from-state is applied so it stays the tween's endpoint.
        const settled = targets.map((el) => getComputedStyle(el).letterSpacing);
        timeline.fromTo(targets, { letterSpacing: compact ? "0.5em" : "0.72em", opacity: 0, x: compact ? -6 : -14 }, {
          letterSpacing: (index: number) => settled[index] === "normal" ? "0em" : settled[index],
          opacity: 1, x: 0, duration: 1,
          stagger: { amount: .12 }, ease: "power2.out", immediateRender: true,
        });
      } else if (cue.preset === "copy-drift") {
        timeline.fromTo(targets, { y: compact ? 14 : 34, filter: "blur(7px)" }, {
          y: 0, filter: "blur(0px)", duration: 1, stagger: { amount: compact ? .1 : .22 },
          ease: "power3.out", immediateRender: true,
        });
      } else if (cue.preset === "curtain") {
        timeline.fromTo(targets, { clipPath: "inset(0 0 100% 0)" }, {
          clipPath: "inset(0 0 0% 0)", duration: 1, ease: "power2.inOut", immediateRender: true,
        });
      } else if (cue.preset === "image-depth") {
        timeline.fromTo(targets, { yPercent: compact ? 2 : 6, scale: compact ? 1.03 : 1.08 }, {
          yPercent: compact ? -2 : -6, scale: 1, duration: 1, ease: "none", immediateRender: true,
        });
      } else {
        timeline.fromTo(targets, { y: distance, rotation: compact ? 0 : 2 }, {
          y: 0, rotation: 0, duration: 1, stagger: { amount: .3 }, ease: "power2.out", immediateRender: true,
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
    revert() {
      context.revert();
      for (const split of splits) split.element.innerHTML = split.html;
      splits.length = 0;
    },
  };
}
