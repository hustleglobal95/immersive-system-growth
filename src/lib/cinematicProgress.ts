/** Frame publication bridges the persistent R3F world to DOM without React renders. */
export function createProgressChannel() {
  const listeners = new Set<(progress: number) => void>();
  return {
    publish(progress: number) {
      if (!Number.isFinite(progress)) return;
      const p = Math.max(0, Math.min(1, progress));
      listeners.forEach((listener) => listener(p));
    },
    subscribe(listener: (progress: number) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
export const cinematicProgress = createProgressChannel();

/** Exact seeks are history independent, including backwards and skipped scenes. */
export function cueProgress(progress: number, range: readonly [number, number]) {
  const [start, end] = range;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || end <= start) {
    throw new RangeError("Motion cue requires 0 <= start < end <= 1");
  }
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}
