import type { TasteDimension, TastePreference, TasteProfile } from "@/src/platform/director-intelligence/types";

const dimensions: TasteDimension[] = ["restraintVsSpectacle", "literalVsAbstract", "cinematicVsEditorial", "continuousVsChaptered", "typographyVsImage", "darkVsLight", "denseVsSparse", "directedVsExploratory", "realismVsStylization", "emotionalVsRational", "familiarVsNovel"];

export function createTasteProfile(): TasteProfile {
  return { version: 1, dimensions: Object.fromEntries(dimensions.map((dimension) => [dimension, 0])) as Record<TasteDimension, number>, preferences: [], confidence: 0, antiCollapsePenalty: 0 };
}

export function recordPreference(profile: TasteProfile, preference: TastePreference): TasteProfile {
  const next = { ...profile, dimensions: { ...profile.dimensions }, preferences: [...profile.preferences, preference] };
  for (const [dimension, value] of Object.entries(preference.dimensions) as Array<[TasteDimension, number | undefined]>) {
    if (value === undefined) continue;
    const bounded = Math.max(-1, Math.min(1, value));
    next.dimensions[dimension] = Number((next.dimensions[dimension] * 0.75 + bounded * 0.25).toFixed(3));
  }
  next.confidence = Number(Math.min(1, next.preferences.length / 20).toFixed(2));
  const repetitionSignals = next.preferences.slice(-8).flatMap((item) => item.reasons).filter((reason) => /same|again|repeat|similar|familiar/i.test(reason)).length;
  next.antiCollapsePenalty = Number(Math.min(1, repetitionSignals / 8).toFixed(2));
  return next;
}

export function tasteAdjustment(profile: TasteProfile | undefined, traits: Partial<Record<TasteDimension, number>>) {
  if (!profile || profile.confidence < 0.15) return { adjustment: 0, reasons: ["Taste profile confidence is too low to influence judgment."] };
  let total = 0; let weight = 0; const reasons: string[] = [];
  for (const [dimension, trait] of Object.entries(traits) as Array<[TasteDimension, number | undefined]>) {
    if (trait === undefined) continue;
    total += profile.dimensions[dimension] * trait; weight += Math.abs(trait);
    if (Math.abs(profile.dimensions[dimension]) >= 0.35) reasons.push(`${dimension}: calibrated studio tendency ${profile.dimensions[dimension].toFixed(2)}.`);
  }
  const raw = weight ? total / weight : 0;
  const capped = Math.max(-0.5, Math.min(0.5, raw * profile.confidence - profile.antiCollapsePenalty * 0.15));
  return { adjustment: Number(capped.toFixed(2)), reasons };
}

export function comparePairwiseScores(a: Record<string, number>, b: Record<string, number>, priority: string[]) {
  let aWins = 0; let bWins = 0; const reasons: string[] = [];
  for (const key of priority) {
    const av = a[key] ?? 0; const bv = b[key] ?? 0;
    if (Math.abs(av - bv) < 0.5) continue;
    if (av > bv) { aWins++; reasons.push(`A stronger on ${key} (${av.toFixed(1)} vs ${bv.toFixed(1)}).`); }
    else { bWins++; reasons.push(`B stronger on ${key} (${bv.toFixed(1)} vs ${av.toFixed(1)}).`); }
  }
  return { winner: aWins === bWins ? "tie" : aWins > bWins ? "a" : "b", aWins, bWins, reasons };
}
