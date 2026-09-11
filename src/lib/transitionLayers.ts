import { remap01 } from "@/src/lib/math";
import type { TransitionLayerDefinition } from "@/src/types/experience";

export function sampleTransitionLayer(
  progress: number,
  sceneRange: [number, number],
  layer: TransitionLayerDefinition,
) {
  const sceneProgress = remap01(progress, sceneRange[0], sceneRange[1]);
  const local = remap01(sceneProgress, layer.range[0], layer.range[1]);
  const envelope = Math.sin(local * Math.PI);
  const motion = layer.motion === "parallax-up"
    ? (1 - local) * 12
    : layer.motion === "parallax-down"
      ? (local - 1) * 12
      : 0;
  return {
    visible: sceneProgress >= layer.range[0] && sceneProgress <= layer.range[1],
    opacity: Math.max(0, envelope) * layer.opacity,
    translateY: motion,
    scale: layer.motion === "scale" ? .92 + local * .16 : 1,
  };
}
