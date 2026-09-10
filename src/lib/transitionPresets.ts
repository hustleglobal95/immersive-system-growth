import { clamp01 } from "@/src/lib/math";
import { easeCinematic, easeSmooth } from "@/src/lib/easing";

export interface HandoffWeights { outgoing: number; incoming: number; cover: number; }

export function thresholdHandoff(t: number): HandoffWeights {
  const x = clamp01(t);
  return {
    outgoing: 1 - easeSmooth(clamp01((x - 0.42) / 0.28)),
    incoming: easeSmooth(clamp01((x - 0.48) / 0.28)),
    cover: Math.sin(Math.PI * clamp01((x - 0.35) / 0.42)),
  };
}

export function occlusionHandoff(t: number): HandoffWeights {
  const x = clamp01(t);
  const cover = Math.pow(Math.sin(Math.PI * x), 6);
  return { outgoing: 1 - easeCinematic(clamp01((x - 0.34) / 0.22)), incoming: easeCinematic(clamp01((x - 0.44) / 0.22)), cover };
}

export function modelExchange(t: number): HandoffWeights {
  const x = clamp01(t);
  return { outgoing: 1 - easeSmooth(clamp01((x - 0.4) / 0.2)), incoming: easeSmooth(clamp01((x - 0.4) / 0.2)), cover: 0 };
}

export function surfaceDive(t: number) {
  const x = easeCinematic(clamp01(t));
  return { scale: 1 + x * 5, blur: x * 8, incoming: easeSmooth(clamp01((x - 0.68) / 0.24)) };
}
