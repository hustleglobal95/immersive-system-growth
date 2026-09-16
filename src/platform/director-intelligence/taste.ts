import type { DirectorTerritory, DirectorTreatment } from "@/src/platform/directorSchema";
import type { EvaluationScores, TasteDimension, TastePreference, TasteProfile } from "@/src/platform/director-intelligence/types";

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

export function inferTasteTraits(treatment: DirectorTreatment, territory: DirectorTerritory): Partial<Record<TasteDimension, number>> {
  const text = `${territory.thesis} ${territory.visualPremise} ${territory.experientialPremise} ${territory.signatureMoment} ${treatment.grammar.motion.join(" ")} ${treatment.grammar.camera.join(" ")} ${treatment.grammar.typography.join(" ")}`.toLowerCase();
  const signal = (positive: RegExp, negative: RegExp) => positive.test(text) ? 1 : negative.test(text) ? -1 : 0;
  return {
    restraintVsSpectacle: signal(/restraint|quiet|still|withhold|minimal/, /spectacle|explosive|dramatic|maximal|intense/),
    literalVsAbstract: signal(/literal|real|product|architecture|interface|proof/, /abstract|metaphor|symbolic|surreal/),
    cinematicVsEditorial: signal(/camera|shot|lens|sequence|cinematic|spatial/, /editorial|grid|typography|page|layout/),
    continuousVsChaptered: signal(/continuous|uninterrupted|threshold|flow/, /chapter|cut|sequence|card|section/),
    typographyVsImage: signal(/typography|type-led|copy-led/, /image|photography|visual|render|film/),
    darkVsLight: signal(/dark|shadow|black|night/, /light|white|bright|day/),
    denseVsSparse: signal(/dense|layered|information-rich/, /sparse|quiet|whitespace|minimal/),
    directedVsExploratory: signal(/directed|guided|controlled|cinematic/, /explore|inspection|open|choose/),
    realismVsStylization: signal(/realism|physical|believable|actual|material/, /stylized|surreal|abstract|impossible/),
    emotionalVsRational: signal(/emotion|desire|awe|wonder|intimacy/, /proof|clarity|technical|rational|utility/),
    familiarVsNovel: signal(/novel|unexpected|anti-category|counterfactual|distinctive/, /familiar|conventional|expected|category/),
  };
}

export function tasteAdjustment(profile: TasteProfile | undefined, traits: Partial<Record<TasteDimension, number>>) {
  if (!profile || profile.confidence < 0.15) return { adjustment: 0, reasons: ["Taste profile confidence is too low to influence judgment."] };
  let total = 0; let weight = 0; const reasons: string[] = [];
  for (const [dimension, trait] of Object.entries(traits) as Array<[TasteDimension, number | undefined]>) {
    if (trait === undefined || trait === 0) continue;
    total += profile.dimensions[dimension] * trait; weight += Math.abs(trait);
    if (Math.abs(profile.dimensions[dimension]) >= 0.35) reasons.push(`${dimension}: calibrated studio tendency ${profile.dimensions[dimension].toFixed(2)}.`);
  }
  const raw = weight ? total / weight : 0;
  const capped = Math.max(-0.5, Math.min(0.5, raw * profile.confidence - profile.antiCollapsePenalty * 0.15));
  return { adjustment: Number(capped.toFixed(2)), reasons };
}

export function applyTasteCalibration(scores: EvaluationScores, adjustment: number): EvaluationScores {
  if (!adjustment) return scores;
  return {
    ...scores,
    aestheticCoherence: Math.max(0, Math.min(10, Number((scores.aestheticCoherence + adjustment).toFixed(1)))),
    emotionalResonance: Math.max(0, Math.min(10, Number((scores.emotionalResonance + adjustment * 0.5).toFixed(1)))),
  };
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
