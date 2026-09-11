import { applyEasing } from "@/src/lib/easing";
import { clamp01, lerp, lerpVec3 } from "@/src/lib/math";
import type { ProductTrack, Vec3 } from "@/src/types/experience";

type TransformTrack = Extract<ProductTrack, { property: "position" | "rotation" | "scale" }>;
type OpacityTrack = Extract<ProductTrack, { property: "opacity" }>;
type VisibilityTrack = Extract<ProductTrack, { property: "visible" }>;

function segment<T extends { at: number; easing?: "linear" | "smooth" | "cinematic" }>(
  frames: readonly T[],
  progress: number,
) {
  const p = clamp01(Number.isFinite(progress) ? progress : 0);
  if (p <= frames[0].at) return { from: frames[0], to: frames[0], t: 0 };
  if (p >= frames[frames.length - 1].at)
    return { from: frames[frames.length - 1], to: frames[frames.length - 1], t: 0 };
  const next = frames.findIndex((frame) => frame.at >= p);
  const from = frames[next - 1];
  const to = frames[next];
  return {
    from,
    to,
    t: applyEasing((p - from.at) / (to.at - from.at), from.easing ?? "smooth"),
  };
}

export function sampleTransformTrack(track: TransformTrack, progress: number): Vec3 {
  const { from, to, t } = segment(track.keyframes, progress);
  return lerpVec3(from.value, to.value, t);
}

export function sampleOpacityTrack(track: OpacityTrack, progress: number) {
  const { from, to, t } = segment(track.keyframes, progress);
  return lerp(from.value, to.value, t);
}

export function sampleVisibilityTrack(track: VisibilityTrack, progress: number) {
  const p = clamp01(Number.isFinite(progress) ? progress : 0);
  let value = track.keyframes[0].value;
  for (const frame of track.keyframes) {
    if (frame.at > p) break;
    value = frame.value;
  }
  return value;
}

export function sampleProductTrack(track: ProductTrack, progress: number) {
  if (track.property === "opacity") return sampleOpacityTrack(track, progress);
  if (track.property === "visible") return sampleVisibilityTrack(track, progress);
  return sampleTransformTrack(track, progress);
}
