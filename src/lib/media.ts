export function seekTarget(progress: number, duration: number) {
  return (
    Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) *
    Math.max(0, duration - 0.02)
  );
}
export function shouldSeek(current: number, target: number, seeking: boolean) {
  return !seeking && Math.abs(current - target) > 0.04;
}
