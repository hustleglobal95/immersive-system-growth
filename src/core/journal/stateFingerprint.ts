function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Forge state fingerprints require finite numbers.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const item = record[key];
      if (typeof item === "undefined" || typeof item === "function" || typeof item === "symbol") continue;
      out[key] = canonicalize(item);
    }
    return out;
  }
  if (typeof value === "undefined") return null;
  throw new Error(`Unsupported Forge fingerprint value: ${typeof value}`);
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function fnv1a32(text: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Fast, deterministic, runtime-safe project fingerprint.
 *
 * This is an integrity/change-detection hash, not a cryptographic signature.
 * It deliberately avoids Node-only crypto so the same value is produced in
 * Studio, browser runtime, tests and headless CLI execution.
 */
export function stateFingerprint(value: unknown): string {
  const serialized = stableSerialize(value);
  const left = fnv1a32(serialized, 0x811c9dc5).toString(16).padStart(8, "0");
  const right = fnv1a32(serialized, 0x9e3779b9).toString(16).padStart(8, "0");
  return `forge1:${left}${right}`;
}
