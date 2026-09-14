import type { StackConfig } from "@/src/lib/cinematic/schema";

export interface StackSample { scale: number; shade: number; translateZ: number; progress: number }
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };

export function sampleStack(progress: number, config: StackConfig): StackSample {
  const p = smooth(progress);
  return { progress: p, scale: 1 + (config.scaleTo - 1) * p, shade: config.darkenTo * p, translateZ: -config.depth * p };
}

export function stackCssVariables(sample: StackSample) {
  return {
    "--forge-stack-scale": sample.scale.toFixed(5),
    "--forge-stack-shade": sample.shade.toFixed(5),
    "--forge-stack-z": `${sample.translateZ.toFixed(2)}px`,
  } as Record<string, string>;
}
