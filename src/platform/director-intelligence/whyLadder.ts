import type { DirectorBrief, DirectorTerritory } from "@/src/platform/directorSchema";
import type { WhyLadder } from "@/src/platform/director-intelligence/types";

export function buildWhyLadder(brief: DirectorBrief, territory: DirectorTerritory, decision: string, productionReason = "Use existing Forge-native systems and available assets before commissioning a custom mechanism."): WhyLadder {
  const creativeReason = territory.thesis;
  const brandReason = brief.brandTruth;
  const audienceReason = `The direction must make ${brief.audience} care about the stated objective: ${brief.objective}`;
  const emotionalReason = territory.memory;
  const mediumReason = `The web medium can express this through structure, interaction, time, motion and responsive composition rather than static explanation.`;
  const reasons = [creativeReason, brandReason, audienceReason, emotionalReason, mediumReason, productionReason];
  const breaksAt = reasons.findIndex((value) => !value || value.trim().length < 18);
  return { decision, creativeReason, brandReason, audienceReason, emotionalReason, mediumReason, productionReason, valid: breaksAt === -1, ...(breaksAt >= 0 ? { breaksAt: ["creative", "brand", "audience", "emotional", "medium", "production"][breaksAt] } : {}) };
}

export function validateWhyLadders(ladders: WhyLadder[]) {
  return ladders.flatMap((ladder) => ladder.valid ? [] : [`Decision "${ladder.decision}" breaks at ${ladder.breaksAt ?? "unknown"} justification.`]);
}
