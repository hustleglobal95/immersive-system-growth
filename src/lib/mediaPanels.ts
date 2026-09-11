export interface PanelWindow { start: number; end: number; enterStart: number; exitStart: number; first: boolean; last: boolean; direction: "up" | "down"; exitDirection?: "up" | "down"; zoom: number }
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function sampleMediaPanel(p: number, w: PanelWindow, compact = false) {
  const enter = w.first ? 1 : clamp((p - w.enterStart) / Math.max(.000001,w.start-w.enterStart));
  const leave = w.last ? 0 : clamp((p-w.exitStart)/Math.max(.000001,w.end-w.exitStart));
  const sign = w.direction === "up" ? 1 : -1;
  const exitSign = (w.exitDirection ?? w.direction) === "up" ? 1 : -1;
  const travel = compact ? 4 : 12;
  return {
    visible: p >= w.enterStart && (w.last ? p <= w.end : p < w.end),
    panelY: sign * (1-enter)*100-exitSign*leave*35,
    imageY: -sign*(1-enter)*travel + exitSign*leave*travel,
    scale: 1 + (Math.min(w.zoom,compact?1.04:1.18)-1)*(1-clamp((p-w.enterStart)/Math.max(.000001,w.end-w.enterStart))),
  };
}
