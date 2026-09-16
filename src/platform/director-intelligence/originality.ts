import type { DirectorBrief, DirectorTerritory, DirectorTreatment } from "@/src/platform/directorSchema";
import type { ClicheScan, OriginalityFingerprint, PortfolioCollision } from "@/src/platform/director-intelligence/types";

function clamp(value: number) { return Math.max(0, Math.min(10, Number(value.toFixed(1)))); }
function lexicalNovelty(text: string) {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((token) => token.length > 3);
  if (!tokens.length) return 0;
  return Math.min(10, 4 + new Set(tokens).size / Math.max(4, tokens.length) * 6);
}

export function buildOriginalityFingerprint(brief: DirectorBrief, treatment: DirectorTreatment, territory: DirectorTerritory, collisions: PortfolioCollision[], cliches: ClicheScan): OriginalityFingerprint {
  const collision = collisions[0]?.dimensions;
  const collisionPenalty = collision ? collision.overall / 20 : 0;
  const categoryPenalty = cliches.density / 2;
  const sources: string[] = [];
  if (territory.thesis.toLowerCase().includes(brief.brandTruth.toLowerCase().slice(0, 20))) sources.push("brand-truth amplification");
  if (territory.signatureMoment.length > 100) sources.push("signature mechanism");
  if (treatment.grammar.interaction.length) sources.push("interaction grammar");
  if (treatment.grammar.spatial.length) sources.push("spatial grammar");
  if (sources.length === 0) sources.push("surface differentiation only — revise");
  return {
    conceptual: clamp(lexicalNovelty(`${territory.thesis} ${territory.strategicReason}`) - collisionPenalty * 0.8),
    narrative: clamp(lexicalNovelty(`${territory.experientialPremise} ${treatment.emotionalArc.map((beat) => beat.label).join(" ")}`) - collisionPenalty * 0.5),
    spatial: clamp(6 + Math.min(3, treatment.grammar.spatial.length * 0.6) - (collision?.spatialLogic ?? 0) / 30),
    interaction: clamp(6 + Math.min(3, treatment.grammar.interaction.length * 0.55) - (collision?.interaction ?? 0) / 30),
    motion: clamp(6 + Math.min(3, treatment.grammar.motion.length * 0.5) - (collision?.motion ?? 0) / 28),
    camera: clamp(6 + Math.min(3, treatment.grammar.camera.length * 0.5) - (collision?.camera ?? 0) / 28),
    composition: clamp(6 + Math.min(3, treatment.grammar.composition.length * 0.5) - (collision?.composition ?? 0) / 30),
    typographyBehavior: clamp(6 + Math.min(3, treatment.grammar.typography.length * 0.6) - (collision?.typography ?? 0) / 30),
    signatureMechanism: clamp(territory.scores.memorability - (collision?.signature ?? 0) / 22),
    portfolio: clamp(10 - (collision?.overall ?? 0) / 10),
    category: clamp(10 - categoryPenalty),
    sources,
  };
}

export function originalityBlockers(fingerprint: OriginalityFingerprint) {
  const blockers: string[] = [];
  if (fingerprint.conceptual < 7.5) blockers.push("Conceptual novelty is too low; styling differences are carrying too much of the direction.");
  if (fingerprint.portfolio < 7) blockers.push("Portfolio novelty is too low; the concept collides with prior Forge work.");
  if (fingerprint.category < 6.5) blockers.push("Category cliché density is too high.");
  if (fingerprint.signatureMechanism < 7.5) blockers.push("Signature mechanism is not sufficiently ownable or differentiated.");
  return blockers;
}
