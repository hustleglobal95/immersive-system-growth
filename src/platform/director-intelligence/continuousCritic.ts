import type { DirectorTreatment } from "@/src/platform/directorSchema";
import type { ContinuousReview, DecisionLedger, ReviewStage } from "@/src/platform/director-intelligence/types";

function stageQuestions(stage: ReviewStage) {
  const questions: Record<ReviewStage, string[]> = {
    25: ["Can we already see the core idea?", "Are early scenes drifting into generic Forge patterns?"],
    50: ["Do structure, typography, camera, motion and assets express one idea?", "Is effort concentrated correctly?"],
    75: ["Does this look unmistakably like this client?", "Is the signature genuinely the strongest moment?"],
    90: ["What should be removed?", "Which effect exists only because Forge can do it?", "Where can stillness improve contrast?"],
    100: ["What would an elite studio cut?", "Would this enter the portfolio?", "Does mobile preserve the same idea?"],
  };
  return questions[stage];
}

export function reviewProduction(treatment: DirectorTreatment, stage: ReviewStage, ledger: DecisionLedger, state: { implementedSystems?: string[]; notes?: string[]; portfolioCollision?: number; mobileEquivalent?: boolean; signatureStrength?: number } = {}): ContinuousReview & { questions: string[] } {
  const implemented = new Set(state.implementedSystems ?? []);
  const locked = ledger.decisions.filter((decision) => decision.status === "locked");
  const decisionViolations = locked.filter((decision) => decision.affectedSystems.length && decision.affectedSystems.every((system) => !implemented.has(system))).map((decision) => `${decision.id} is locked but none of its affected systems are represented in the review state.`);
  const cuts: string[] = [];
  const blockers: string[] = [];
  if (stage >= 75 && (state.signatureStrength ?? treatment.critique.signatureMomentStrength) < 8.5) blockers.push("Signature moment is not yet strong enough for late-stage production.");
  if (stage >= 90) {
    treatment.noGoRules.slice(0, 3).forEach((rule) => cuts.push(`Cut anything that violates: ${rule}`));
    if (treatment.emotionalArc.filter((beat) => beat.intensity >= 8).length > 3) cuts.push("Too many high-intensity moments; remove or quiet at least one supporting peak.");
  }
  if ((state.portfolioCollision ?? 0) >= 70) blockers.push("Late-stage portfolio collision is too high.");
  if (stage === 100 && state.mobileEquivalent === false) blockers.push("Final cut fails mobile-equivalence requirement.");
  const driftScore = Math.max(0, Math.min(10, Number((10 - decisionViolations.length * 1.5 - blockers.length * 2 - Math.max(0, (state.portfolioCollision ?? 0) - 50) / 10).toFixed(1))));
  const recommendation: ContinuousReview["recommendation"] = blockers.length ? (stage >= 90 ? "stop" : "revise") : stage === 100 ? "final-cut" : decisionViolations.length ? "revise" : "continue";
  return { stage, driftScore, decisionViolations, cuts, blockers, recommendation, questions: stageQuestions(stage) };
}
