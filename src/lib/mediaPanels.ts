export type MediaTransition = "slide" | "curtain" | "zoom" | "dissolve" | "wipe";
export interface PanelWindow { start: number; end: number; enterStart: number; exitStart: number; first: boolean; last: boolean; direction: "up" | "down"; exitDirection?: "up" | "down"; zoom: number; transition?: MediaTransition }
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function sampleMediaPanel(p: number, w: PanelWindow, compact = false) {
  const enter = w.first ? 1 : clamp((p - w.enterStart) / Math.max(.000001,w.start-w.enterStart));
  const leave = w.last ? 0 : clamp((p-w.exitStart)/Math.max(.000001,w.end-w.exitStart));
  const sign = w.direction === "up" ? 1 : -1;
  const exitSign = (w.exitDirection ?? w.direction) === "up" ? 1 : -1;
  const travel = compact ? 4 : 12;
  const transition = w.transition ?? "slide";
  const phase = clamp(enter * (1 - leave));
  return {
    visible: p >= w.enterStart && (w.last ? p <= w.end : p < w.end),
    panelY: transition === "slide" ? sign * (1-enter)*100-exitSign*leave*35 : 0,
    imageY: -sign*(1-enter)*travel + exitSign*leave*travel,
    scale: transition === "zoom"
      ? 1 + (Math.min(w.zoom, compact ? 1.06 : 1.18) - 1) * (1 - phase)
      : 1 + (Math.min(w.zoom,compact?1.04:1.18)-1)*(1-clamp((p-w.enterStart)/Math.max(.000001,w.end-w.enterStart))),
    opacity: transition === "dissolve" || transition === "zoom" ? phase : 1,
    blur: transition === "dissolve" ? (1 - phase) * (compact ? 5 : 10) : 0,
    clip: transition === "curtain" || transition === "wipe" ? (1 - phase) * 100 : 0,
    transition,
  };
}
