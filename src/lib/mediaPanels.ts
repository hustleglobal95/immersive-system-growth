import type { SceneDefinition } from "@/src/types/experience";

export type MediaTransition = "slide" | "curtain" | "zoom" | "dissolve" | "wipe" | "mask" | "cut";
export type MediaDirection = "up" | "down" | "left" | "right";
export interface PanelWindow { start: number; end: number; enterStart: number; exitStart: number; first: boolean; last: boolean; direction: MediaDirection; exitDirection?: MediaDirection; zoom: number; transition?: MediaTransition; exitCut?: boolean;
  drift?: { from: { x: number; y: number; zoom: number }; to: { x: number; y: number; zoom: number } } }
/** Travel axis and sign for a direction, so a handover can cross the frame either way. */
const axisOf = (direction: MediaDirection) => (direction === "left" || direction === "right" ? "x" : "y") as "x" | "y";
const signOf = (direction: MediaDirection) => (direction === "up" || direction === "left" ? 1 : -1);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/**
 * Handover ramps were linear, which is what made every cross-fade read as mechanical: the
 * frame started and stopped changing at full rate. Easing both ends lets a handover begin and
 * settle rather than switch on.
 */
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export function getMediaPanelWindow(scenes: readonly SceneDefinition[], index: number): PanelWindow {
  const scene = scenes[index], prior = scenes[index - 1], next = scenes[index + 1];
  return {
    start: scene.range[0],
    end: scene.range[1],
    enterStart: prior ? scene.range[0] - (prior.range[1] - prior.range[0]) * (scene.media?.overlap ?? .25) : 0,
    exitStart: next ? scene.range[1] - (scene.range[1] - scene.range[0]) * (next.media?.overlap ?? .25) : 1,
    first: index === 0,
    last: index === scenes.length - 1,
    direction: scene.media?.direction ?? "up",
    exitDirection: next?.media?.direction ?? "up",
    zoom: scene.media?.zoom ?? 1.06,
    drift: scene.media?.drift,
    transition: scene.media?.transition ?? "slide",
    // A panel is replaced by a hard cut, not slid out from under one: drifting would expose
    // the plate behind it in the beat before the swap.
    exitCut: next?.media?.transition === "cut",
  };
}
export function sampleMediaPanel(p: number, w: PanelWindow, compact = false) {
  // A cut ignores the overlap window entirely: the frame is simply there from its own boundary,
  // with no blend, no drift and no reveal. Authored slides use it to change hard.
  const isCut = w.transition === "cut";
  // The mask builder eases the reveal itself, so it is handed the raw ratio. Easing here as
  // well stacked two smoothsteps and packed the whole image change into the middle of the
  // window -- which is what read as an abrupt swap however long the handover was.
  const enterRaw = w.first || (isCut && p >= w.start) ? 1 : isCut ? 0
    : clamp((p - w.enterStart) / Math.max(.000001,w.start-w.enterStart));
  const enter = w.first || (isCut && p >= w.start) ? 1 : isCut ? 0 : ease(enterRaw);
  const leave = w.last ? 0 : ease((p-w.exitStart)/Math.max(.000001,w.end-w.exitStart));
  const exitDirection = w.exitDirection ?? w.direction;
  const axis = axisOf(w.direction), exitAxis = axisOf(exitDirection);
  const sign = signOf(w.direction), exitSign = signOf(exitDirection);
  const travel = compact ? 4 : 12;
  const transition = w.transition ?? "slide";
  const phase = clamp(enter * (1 - leave));
  const slideIn = transition === "slide" ? sign * (1 - enter) * 100 : 0;
  const slideOut = transition === "slide" && !w.exitCut ? exitSign * leave * 35 : 0;
  const driftIn = isCut ? 0 : -sign * (1 - enter) * travel;
  const driftOut = isCut ? 0 : exitSign * leave * travel;
  // The frame's own move across its chapter, independent of the handover travel: a push in, a
  // pan, a rise, a pull back, or nothing at all where stillness is the point.
  const sceneT = ease((p - w.start) / Math.max(.000001, w.end - w.start));
  const lerp = (a: number, b: number) => a + (b - a) * sceneT;
  const drift = w.drift;
  const driftScale = drift ? lerp(drift.from.zoom, drift.to.zoom) : null;
  const driftPanX = drift ? lerp(drift.from.x, drift.to.x) : 0;
  const driftPanY = drift ? lerp(drift.from.y, drift.to.y) : 0;
  return {
    visible: p >= (isCut ? w.start : w.enterStart) && (w.last ? p <= w.end : p < w.end),
    panelY: (axis === "y" ? slideIn : 0) - (exitAxis === "y" ? slideOut : 0),
    panelX: (axis === "x" ? slideIn : 0) - (exitAxis === "x" ? slideOut : 0),
    imageY: (axis === "y" ? driftIn : 0) + (exitAxis === "y" ? driftOut : 0) + driftPanY,
    imageX: (axis === "x" ? driftIn : 0) + (exitAxis === "x" ? driftOut : 0) + driftPanX,
    // A leaving frame settles back a little as the next one comes over it, so the imagery
    // collapses into the handover instead of simply being covered. A cut does not: it changes.
    scale: (isCut ? 1 : 1 - leave * 0.075) * (isCut ? 1
      : driftScale !== null ? driftScale
      : transition === "zoom"
        ? 1 + (Math.min(w.zoom, compact ? 1.06 : 1.18) - 1) * (1 - phase)
        : 1 + (Math.min(w.zoom,compact?1.04:1.18)-1)*(1-clamp((p-w.enterStart)/Math.max(.000001,w.end-w.enterStart)))),
    opacity: transition === "dissolve" || transition === "zoom" ? phase : 1,
    blur: transition === "dissolve" ? (1 - phase) * (compact ? 3 : 5.5) : 0,
    clip: transition === "curtain" || transition === "wipe" ? (1 - enter) * 100 : 0,
    clipAxis: axis,
    clipSign: sign,
    reveal: enterRaw,
    transition,
  };
}
