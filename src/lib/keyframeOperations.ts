export interface TimedSelection {
  token: string;
  at: number;
}

export type RetimeOperation = "distribute" | "reverse";

export function retimeSelection(
  selection: readonly TimedSelection[],
  operation: RetimeOperation,
): Record<string, number> {
  const sorted = [...selection]
    .filter((item) => Number.isFinite(item.at))
    .sort((a, b) => a.at - b.at || a.token.localeCompare(b.token));
  if (sorted.length < 2) return Object.fromEntries(sorted.map((item) => [item.token, clamp01(item.at)]));
  const start = clamp01(sorted[0].at);
  const end = clamp01(sorted[sorted.length - 1].at);
  if (operation === "reverse") {
    return Object.fromEntries(sorted.map((item) => [item.token, start + end - clamp01(item.at)]));
  }
  const step = (end - start) / Math.max(1, sorted.length - 1);
  return Object.fromEntries(sorted.map((item, index) => [item.token, start + step * index]));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
