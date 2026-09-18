import gsap from "gsap";
import { easeSmoother } from "@/src/lib/easing";

/**
 * The ease for anything scrubbed by scroll.
 *
 * These timelines are seeked by scroll position rather than played, so an ease's slope is felt
 * directly as the reader moves. The presets here were authored with playback eases: expo.out put
 * half of a cue's movement into the first tenth of its scroll window and power4.out 41%, so the
 * type snapped most of the way into place and then crawled. The three power2.in exits were the
 * mirror, arriving at the cue's end still travelling at three times linear and stopping dead.
 *
 * The quintic comes to rest at both ends, which is what lets a cue start and settle instead of
 * lurching, and it is the same curve the masks, panels, carousel and site plan already use -- so
 * the whole page shares one motion language. Character still comes from what each preset moves,
 * not from how it accelerates. A genuine parallax stays linear, because it should track scroll
 * one to one.
 */
const scrub = easeSmoother;
import { cueProgress } from "./cinematicProgress";

export type CinematicPreset =
  | "text-settle"
  | "headline-reveal"
  | "headline-words"
  | "headline-chars"
  | "headline-swing"
  | "headline-slide"
  | "headline-fracture"
  | "headline-drop"
  | "headline-unfold"
  | "headline-converge"
  | "type-disperse"
  | "lede-words"
  | "lede-scatter"
  | "list-unfold"
  | "section-collapse"
  | "section-lift"
  | "plate-rise"
  | "label-track"
  | "copy-drift"
  | "curtain"
  | "image-depth"
  | "gallery-settle";
/** Presets that carry primary copy, so they are allowed to animate accessible content. */
const COPY_PRESETS = new Set<CinematicPreset>([
  "text-settle", "headline-reveal", "headline-words", "headline-chars", "headline-swing",
  "headline-slide", "headline-fracture", "headline-drop", "headline-unfold",
  "headline-converge", "type-disperse", "lede-words", "lede-scatter",
  "list-unfold", "plate-rise", "section-collapse", "section-lift", "label-track", "copy-drift",
]);
/** Presets whose targets are split into per-word or per-character boxes before animating. */
const SPLIT_PRESETS: Partial<Record<CinematicPreset, "word" | "char">> = {
  "headline-words": "word",
  "headline-chars": "char",
  "headline-swing": "word",
  "headline-slide": "word",
  "headline-fracture": "char",
  "headline-drop": "char",
  "headline-unfold": "char",
  "headline-converge": "word",
  "lede-words": "word",
  "lede-scatter": "word",
};

interface SplitTarget { element: HTMLElement; html: string }
/**
 * Wraps each word or character in a masking box so type can rise out of its own line.
 * Text content is unchanged, so headings keep serving `aria-labelledby` and selection, and the
 * original markup is restored on teardown -- gsap.context() reverts styles, not DOM surgery.
 */
function splitText(element: HTMLElement, unit: "word" | "char") {
  // Idempotent: a second cue on the same element reuses the boxes rather than rebuilding them
  // and stranding the first cue's targets.
  const existing = element.querySelectorAll<HTMLElement>(".forge-split__inner");
  if (existing.length) return { parts: Array.from(existing), record: null };
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
      if (split.record) splits.push(split.record);
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
          y: 0, duration: 1, stagger: { amount: .18 }, ease: scrub, immediateRender: true,
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
          ease: scrub,
          immediateRender: true,
        });
      } else if (cue.preset === "headline-words") {
        // Each word rises out of its own mask, so the line assembles instead of appearing.
        timeline.fromTo(targets, { yPercent: 118, rotate: compact ? 0 : 2.4 }, {
          yPercent: 0, rotate: 0, duration: 1,
          stagger: { amount: compact ? .36 : .62, from: "start" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-chars") {
        timeline.fromTo(targets, { yPercent: 108, rotateX: compact ? 0 : -62, opacity: 0, transformPerspective: 620, transformOrigin: "50% 100%" }, {
          yPercent: 0, rotateX: 0, opacity: 1, duration: 1,
          stagger: { amount: compact ? .42 : .74, from: "start" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-swing") {
        // Words hinge down from their top edge, last word first, so the line closes backwards.
        timeline.fromTo(targets, {
          rotateX: compact ? -46 : -88, yPercent: 46, opacity: 0,
          transformPerspective: 900, transformOrigin: "50% 0%",
        }, {
          rotateX: 0, yPercent: 0, opacity: 1, duration: 1,
          stagger: { amount: compact ? .34 : .58, from: "end" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-slide") {
        // Alternating words slide in from opposite sides inside their masks.
        timeline.fromTo(targets, {
          xPercent: (index: number) => (index % 2 ? 1 : -1) * (compact ? 52 : 96),
          opacity: 0,
        }, {
          xPercent: 0, opacity: 1, duration: 1,
          stagger: { amount: compact ? .3 : .5, from: "start" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "lede-scatter") {
        timeline.fromTo(targets, { yPercent: 38, scale: .92, opacity: 0 }, {
          yPercent: 0, scale: 1, opacity: 1, duration: 1,
          stagger: { amount: compact ? .46 : .82, from: "random" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-fracture") {
        // The most worked headline on the site: characters arrive from alternating sides of the
        // line, out of focus and over-scaled, and resolve into place one after another.
        timeline.fromTo(targets, {
          yPercent: (index: number) => (index % 2 ? 132 : -126),
          rotate: (index: number) => (index % 2 ? 5.5 : -5.5),
          scale: 1.24,
          opacity: 0,
          filter: "blur(13px)",
          transformOrigin: "50% 100%",
        }, {
          yPercent: 0, rotate: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 1,
          stagger: { amount: compact ? .5 : .86, from: "start" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-drop") {
        // Characters fall in from above behind their own mask, last letter first, so the line
        // assembles backwards and lands heavy.
        timeline.fromTo(targets, {
          yPercent: -128, scale: 1.16, opacity: 0, transformOrigin: "50% 0%",
        }, {
          yPercent: 0, scale: 1, opacity: 1, duration: 1,
          stagger: { amount: compact ? .46 : .8, from: "end" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "plate-rise") {
        // Square plates rise out of their own frame and settle from a slight over-scale.
        timeline.fromTo(targets, {
          clipPath: "inset(100% 0% 0% 0%)", scale: 1.22, yPercent: 26,
        }, {
          clipPath: "inset(0% 0% 0% 0%)", scale: 1, yPercent: 0, duration: 1,
          stagger: { amount: compact ? .34 : .6 }, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "section-collapse") {
        // The chapter folds away from its own base rather than being replaced: it settles back,
        // tips a little and compresses, so the handover reads as one continuous move.
        timeline.fromTo(targets, {
          scale: 1, rotateX: 0, yPercent: 0, transformPerspective: 1400, transformOrigin: "50% 100%",
        }, {
          scale: compact ? 0.955 : 0.918,
          rotateX: compact ? 2.2 : 5.2,
          yPercent: compact ? -1.4 : -3,
          duration: 1, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "section-lift") {
        // A harder version of the collapse: the words compress and carry upward out of the
        // frame, clearing the section for whatever is still playing beneath them.
        timeline.fromTo(targets, {
          scale: 1, yPercent: 0, rotateX: 0, transformPerspective: 1400, transformOrigin: "50% 0%",
        }, {
          scale: compact ? 0.93 : 0.872,
          yPercent: compact ? -7 : -14,
          rotateX: compact ? 3 : 7,
          duration: 1, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-unfold") {
        // Each glyph turns in on its own vertical axis, so the line unfolds letter by letter.
        timeline.fromTo(targets, {
          rotateY: compact ? -64 : -96, opacity: 0, xPercent: 24,
          transformPerspective: 760, transformOrigin: "0% 50%",
        }, {
          rotateY: 0, opacity: 1, xPercent: 0, duration: 1,
          stagger: { amount: compact ? .44 : .78 }, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "headline-converge") {
        // Words arrive from far out on alternating sides and converge into the line.
        timeline.fromTo(targets, {
          xPercent: (index: number) => (index % 2 ? 1 : -1) * (compact ? 120 : 260),
          opacity: 0, filter: "blur(16px)", scale: 1.12,
        }, {
          xPercent: 0, opacity: 1, filter: "blur(0px)", scale: 1, duration: 1,
          stagger: { amount: compact ? .4 : .7, from: "edges" }, ease: scrub,
          immediateRender: true,
        });
      } else if (cue.preset === "type-disperse") {
        // The exit treatment. Opacity and blur only: the entrance timeline owns these tokens'
        // transforms, and two GSAP timelines on one matrix contend.
        timeline.fromTo(targets, { opacity: 1, filter: "blur(0px)" }, {
          opacity: 0, filter: `blur(${compact ? 5 : 9}px)`, duration: 1,
          stagger: { amount: compact ? .3 : .56 }, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "list-unfold") {
        // Rows unfold from their own left edge, so the schedule builds line by line.
        timeline.fromTo(targets, {
          clipPath: "inset(0% 100% 0% 0%)", x: compact ? -18 : -46, opacity: 0,
        }, {
          clipPath: "inset(0% 0% 0% 0%)", x: 0, opacity: 1, duration: 1,
          stagger: { amount: compact ? .3 : .52 }, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "lede-words") {
        timeline.fromTo(targets, { yPercent: 64, opacity: 0, filter: "blur(5px)" }, {
          yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 1,
          stagger: { amount: compact ? .4 : .72, from: "start" },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "label-track") {
        // Small caps settle by tightening their tracking rather than sliding. The authored
        // tracking is read before the from-state is applied so it stays the tween's endpoint.
        const settled = targets.map((el) => getComputedStyle(el).letterSpacing);
        timeline.fromTo(targets, { letterSpacing: compact ? "0.5em" : "0.72em", opacity: 0, x: compact ? -6 : -14 }, {
          letterSpacing: (index: number) => settled[index] === "normal" ? "0em" : settled[index],
          opacity: 1, x: 0, duration: 1,
          stagger: { amount: .12 }, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "copy-drift") {
        timeline.fromTo(targets, { y: compact ? 14 : 34, filter: "blur(7px)" }, {
          y: 0, filter: "blur(0px)", duration: 1, stagger: { amount: compact ? .1 : .22 },
          ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "curtain") {
        timeline.fromTo(targets, { clipPath: "inset(0 0 100% 0)" }, {
          clipPath: "inset(0 0 0% 0)", duration: 1, ease: scrub, immediateRender: true,
        });
      } else if (cue.preset === "image-depth") {
        timeline.fromTo(targets, { yPercent: compact ? 2 : 6, scale: compact ? 1.03 : 1.08 }, {
          yPercent: compact ? -2 : -6, scale: 1, duration: 1, ease: "none", immediateRender: true,
        });
      } else {
        timeline.fromTo(targets, { y: distance, rotation: compact ? 0 : 2 }, {
          y: 0, rotation: 0, duration: 1, stagger: { amount: .3 }, ease: scrub, immediateRender: true,
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
