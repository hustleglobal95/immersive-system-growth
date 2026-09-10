import { clamp01 } from "@/src/lib/math";

function parseHex(hex: string) {
  const value = hex.replace("#", "").trim();
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((x) => x + x)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [0, 0, 0] as const;
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ] as const;
}

export function lerpHex(a: string, b: string, t: number) {
  const x = clamp01(t);
  const ca = parseHex(a);
  const cb = parseHex(b);
  const channels = ca.map((value, index) =>
    Math.round(value + (cb[index] - value) * x),
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
