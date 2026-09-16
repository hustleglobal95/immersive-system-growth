import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { DirectorEvidence, EvidenceReport } from "@/src/platform/director-intelligence/types";

function evidence(id: string, claim: string, evidenceClass: DirectorEvidence["evidenceClass"], sourceIds: string[], confidence: number, verified: boolean, affects: string[]): DirectorEvidence {
  return { id, claim, evidenceClass, sourceIds, confidence: Math.max(0, Math.min(1, confidence)), verified, affects };
}

export function buildEvidenceReport(brief: DirectorBrief, treatment?: DirectorTreatment): EvidenceReport {
  const items: DirectorEvidence[] = [];
  items.push(evidence("brief-audience", brief.audience, "client-brief", ["brief.audience"], 1, true, ["audience", "territories"]));
  items.push(evidence("brief-objective", brief.objective, "client-brief", ["brief.objective"], 1, true, ["objective", "conversion"]));
  items.push(evidence("brief-brand-truth", brief.brandTruth, "client-brief", ["brief.brandTruth"], brief.brandTruth.length > 40 ? 0.95 : 0.72, true, ["thesis", "brandAdherence"]));
  brief.differentiators.forEach((claim, index) => items.push(evidence(`brief-diff-${index + 1}`, claim, "client-brief", [`brief.differentiators.${index}`], 0.95, true, ["distinctiveness", "territories"])));
  brief.constraints.forEach((claim, index) => items.push(evidence(`brief-constraint-${index + 1}`, claim, "client-brief", [`brief.constraints.${index}`], 1, true, ["feasibility", "production"])));
  brief.existingAssets.forEach((asset, index) => items.push(evidence(`asset-${index + 1}`, `${asset.label} (${asset.type})${asset.notes ? `: ${asset.notes}` : ""}`, "client-asset", [asset.id], 1, true, ["assets", "ceiling", "production"])));
  brief.references.forEach((reference, index) => items.push(evidence(`reference-${index + 1}`, `${reference.label}: ${reference.lesson}`, "reference", [`brief.references.${index}`], 0.8, true, ["precedents", "territories"])));

  if (treatment) {
    items.push(evidence("hypothesis-thesis", treatment.thesis, "creative-hypothesis", ["treatment.thesis"], 0.68, false, ["thesis", "structure", "signature"]));
    items.push(evidence("hypothesis-memory", treatment.memoryStatement, "creative-hypothesis", ["treatment.memoryStatement"], 0.62, false, ["memorability"]));
    items.push(evidence("hypothesis-signature", treatment.signatureMoment.description, "creative-hypothesis", ["treatment.signatureMoment"], 0.62, false, ["signature", "production"]));
  }

  const unknowns: string[] = [];
  if (brief.differentiators.length === 0) unknowns.push("No explicit differentiators were supplied.");
  if (brief.existingAssets.length === 0) unknowns.push("No existing assets were supplied or inventoried.");
  if (brief.references.length === 0) unknowns.push("No external creative references were supplied.");
  if (brief.brandTruth.length < 40) unknowns.push("Brand truth is unusually short and may need client confirmation before lock.");
  if (!brief.client) unknowns.push("Client identity is not explicitly included in the brief.");

  const assumptions = items.filter((item) => item.evidenceClass === "creative-hypothesis" || item.evidenceClass === "director-inference");
  const unsupportedClaims = assumptions.filter((item) => !item.verified && item.confidence < 0.7).map((item) => item.claim);
  const verifiedWeight = items.length ? items.reduce((sum, item) => sum + (item.verified ? item.confidence : item.confidence * 0.55), 0) / items.length : 0;
  return { evidence: items, unknowns, assumptions, unsupportedClaims, confidence: Number(verifiedWeight.toFixed(2)) };
}

export function requireEvidenceForLock(report: EvidenceReport) {
  const blockers: string[] = [];
  if (report.confidence < 0.65) blockers.push(`Evidence confidence ${report.confidence.toFixed(2)} is below lock threshold 0.65.`);
  if (report.unsupportedClaims.length > 3) blockers.push("Too many unsupported creative assumptions materially affect the direction.");
  if (report.unknowns.some((item) => item.toLowerCase().includes("differentiator"))) blockers.push("Differentiation evidence is missing; territory lock would be weakly grounded.");
  return blockers;
}
