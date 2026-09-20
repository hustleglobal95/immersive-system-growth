import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { AssetGapReport, DecisionLedger, EvidenceReport, EvaluationReport } from "@/src/platform/director-intelligence/types";

export type DirectorHumanGateId = "brand-truth" | "territory-lock" | "asset-spend" | "decision-reversal" | "final-cut";
export interface DirectorHumanApprovals {
  brandTruthConfirmed?: boolean;
  lockedTerritoryId?: string;
  assetSpendApproved?: boolean;
  approvedDecisionReversals?: string[];
  finalCutApproved?: boolean;
}
export interface DirectorHumanGate {
  id: DirectorHumanGateId;
  label: string;
  required: boolean;
  satisfied: boolean;
  reason: string;
}

export function evaluateHumanGates(input: {
  brief: DirectorBrief;
  treatment: DirectorTreatment;
  evidence: EvidenceReport;
  selectedEvaluation: EvaluationReport;
  assetGap: AssetGapReport;
  decisions: DecisionLedger;
  approvals?: DirectorHumanApprovals;
  finalCutRequested?: boolean;
}) {
  const approvals = input.approvals ?? {};
  const brandUncertain = input.evidence.unknowns.some((item) => /brand truth|differentiator/i.test(item)) || input.evidence.coverage < 0.72;
  const majorAssetSpend = input.assetGap.items.some((item) => !item.exists && (item.assetClass === "hero-critical" || item.assetClass === "signature-critical"));
  const lockedRevisions = input.decisions.decisions.filter((decision) => decision.status === "locked" && decision.supersedes);
  const gates: DirectorHumanGate[] = [
    {
      id: "brand-truth",
      label: "Confirm brand truth / brief interpretation",
      required: brandUncertain,
      satisfied: !brandUncertain || approvals.brandTruthConfirmed === true,
      reason: brandUncertain ? "Evidence coverage or differentiation is insufficient for advancing the thesis without human confirmation." : "Brief evidence is sufficiently grounded for creative evaluation.",
    },
    {
      id: "territory-lock",
      label: "Human territory lock",
      required: true,
      satisfied: approvals.lockedTerritoryId === input.treatment.selectedTerritoryId,
      reason: "The selected creative territory is a high-value human decision and may never be silently locked by Director.",
    },
    {
      id: "asset-spend",
      label: "Approve major asset / scope increase",
      required: majorAssetSpend,
      satisfied: !majorAssetSpend || approvals.assetSpendApproved === true,
      reason: majorAssetSpend ? "The selected direction requires missing hero/signature-critical production assets." : "No major new hero/signature asset spend is currently required.",
    },
    {
      id: "decision-reversal",
      label: "Approve locked-decision reversal",
      required: lockedRevisions.length > 0,
      satisfied: lockedRevisions.length === 0 || lockedRevisions.every((decision) => approvals.approvedDecisionReversals?.includes(decision.id)),
      reason: lockedRevisions.length ? "One or more locked creative decisions are being superseded and require explicit approval." : "No locked decision reversal is pending.",
    },
    {
      id: "final-cut",
      label: "Human final-cut approval",
      required: input.finalCutRequested === true,
      satisfied: input.finalCutRequested !== true || approvals.finalCutApproved === true,
      reason: input.finalCutRequested ? "Final-cut approval remains a required human creative-authority gate." : "Final cut has not been requested in this run.",
    },
  ];
  const pending = gates.filter((gate) => gate.required && !gate.satisfied);
  const creativeEligible = input.selectedEvaluation.recommendation === "ADVANCE";
  return {
    gates,
    pending,
    creativeEligible,
    authorizedForProduction: creativeEligible && pending.length === 0,
  };
}
