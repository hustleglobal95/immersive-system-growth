export interface SequencerTransport {
  playing: boolean;
  loop: boolean;
  rate: number;
  range: [number, number];
  duration: number;
}

export const curvePresets = [
  { id: "gentle", label: "Gentle", value: [0.33, 0, 0.67, 1] },
  { id: "cinematic", label: "Cinematic", value: [0.16, 1, 0.3, 1] },
  { id: "accelerate", label: "Accelerate", value: [0.55, 0, 1, 0.45] },
  { id: "decelerate", label: "Decelerate", value: [0, 0.55, 0.45, 1] },
  { id: "overshoot", label: "Overshoot", value: [0.2, 1.35, 0.35, 1] },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  value: readonly [number, number, number, number];
}>;

export function normalizePlaybackRange(range: [number, number]): [number, number] {
  const start = clamp01(Math.min(range[0], range[1]));
  const end = clamp01(Math.max(range[0], range[1]));
  return end - start < 0.001 ? [start, Math.min(1, start + 0.001)] : [start, end];
}

export function advancePlayhead(
  playhead: number,
  elapsedSeconds: number,
  transport: SequencerTransport,
): { playhead: number; ended: boolean } {
  const [start, end] = normalizePlaybackRange(transport.range);
  if (!transport.playing || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return { playhead: clamp(playhead, start, end), ended: false };
  }
  const duration = Math.max(0.1, transport.duration);
  const rate = clamp(transport.rate, 0.1, 4);
  const next = Math.max(start, playhead) + elapsedSeconds * rate / duration;
  if (next < end) return { playhead: next, ended: false };
  if (!transport.loop) return { playhead: end, ended: true };
  const span = Math.max(0.001, end - start);
  return { playhead: start + ((next - start) % span), ended: false };
}

function clamp01(value: number) {
  return clamp(Number.isFinite(value) ? value : 0, 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
