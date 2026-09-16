import type { DirectorBrief, DirectorTerritory, DirectorTreatment } from "@/src/platform/directorSchema";
import type { StressLabReport, StressResult, StressStatus } from "@/src/platform/director-intelligence/types";

function result(id: string, label: string, status: StressStatus, reason: string, mitigation?: string): StressResult { return { id, label, status, reason, mitigation }; }
function has3dDependency(text: string) { return /webgl|3d|orbit|model|glb|shader|geometry|camera path|spatial/i.test(text); }
function statusFrom(condition: boolean, severe = false): StressStatus { return condition ? (severe ? "FATAL" : "REQUIRES REVISION") : "PASS"; }

export function runStressLab(brief: DirectorBrief, treatment: DirectorTreatment, territory: DirectorTerritory): StressLabReport {
  const text = [territory.thesis, territory.experientialPremise, territory.signatureMoment, ...treatment.grammar.camera, ...treatment.grammar.motion, ...treatment.grammar.interaction].join(" ");
  const strongAssets = treatment.assets.filter((asset) => asset.quality === "hero" || asset.quality === "strong");
  const heroDependent = has3dDependency(territory.signatureMoment) && strongAssets.some((asset) => asset.label.toLowerCase().includes("model") || asset.role.toLowerCase().includes("hero"));
  const mobileExplicit = treatment.mobileInterpretation.length >= 2;
  const utilityExplicit = treatment.conversionArc.length > 0 && brief.primaryAction.length > 0;
  const signatureWords = new Set(territory.signatureMoment.toLowerCase().split(/\s+/).filter((token) => token.length > 4));
  const thesisWords = new Set(territory.thesis.toLowerCase().split(/\s+/).filter((token) => token.length > 4));
  let signatureThesisOverlap = 0; for (const token of signatureWords) if (thesisWords.has(token)) signatureThesisOverlap++;

  const results: StressResult[] = [
    result("no-3d", "No-3D test", has3dDependency(text) && territory.thesis.length < 45 ? "FATAL" : has3dDependency(text) ? "PASS WITH DEGRADATION" : "PASS", has3dDependency(text) ? "The concept uses spatial/3D language, but the thesis must remain legible in semantic DOM/media fallback." : "The concept is not dependent on 3D spectacle.", "Preserve thesis through copy, composition and media if WebGL is unavailable."),
    result("mobile", "Mobile test", mobileExplicit ? "PASS" : "REQUIRES REVISION", mobileExplicit ? "Treatment contains explicit mobile interpretation rules." : "Mobile interpretation is too thin to prove concept equivalence.", "Define the same idea using reduced simultaneous motion and tighter framing."),
    result("reduced-motion", "Reduced-motion test", treatment.mobileInterpretation.some((rule) => /reduced|static|poster|simpl/i.test(rule)) ? "PASS" : "PASS WITH DEGRADATION", "Meaning must remain accessible when cinematic movement is reduced.", "Add explicit static/reduced-motion equivalence for the signature sequence."),
    result("half-budget", "Half-budget test", treatment.productionPriorities.length >= 3 ? "PASS WITH DEGRADATION" : "REQUIRES REVISION", treatment.productionPriorities.length >= 3 ? "The project has enough priority structure to preserve the thesis under budget reduction." : "Production priorities are too vague to know what survives a 50% cut.", "Name the one hero moment and two supporting systems that survive first."),
    result("double-content", "Double-content test", treatment.emotionalArc.length <= 12 ? "PASS" : "PASS WITH DEGRADATION", "Structure must remain coherent if content volume doubles.", "Protect chapter roles; route extra content into proof/utility layers rather than adding more emotional peaks."),
    result("weak-asset", "Weak-asset test", heroDependent && strongAssets.length <= 1 ? "REQUIRES REVISION" : "PASS", heroDependent ? "The signature depends materially on a limited hero asset set." : "The concept is not critically dependent on one irreplaceable hero asset.", "Define a poster/media fallback and a replacement asset brief."),
    result("brand-swap", "Brand-swap test", territory.scores.brandFit < 8 || brief.differentiators.length === 0 ? "FATAL" : "PASS", territory.scores.brandFit < 8 || brief.differentiators.length === 0 ? "The concept lacks enough client-specific evidence to resist a competitor logo/copy swap." : "The territory is anchored in stated brand truth/differentiators."),
    result("signature-removal", "Signature-removal test", territory.thesis.length < 30 || treatment.emotionalArc.length < 5 ? "FATAL" : "PASS", "The project must remain conceptually coherent even if the hero trick is removed."),
    result("skeptical-client", "Skeptical-client test", territory.strategicReason.length < 80 ? "REQUIRES REVISION" : "PASS", territory.strategicReason.length < 80 ? "The strategic rationale is too thin for a non-creative stakeholder." : "The territory has enough rationale to explain in a short stakeholder review."),
    result("utility", "Utility test", utilityExplicit ? "PASS" : "REQUIRES REVISION", utilityExplicit ? "Primary action and conversion arc remain explicit." : "High-intent utility is not explicit enough."),
    result("time", "20%-exposure test", treatment.emotionalArc[0]?.purpose.length > 25 && treatment.emotionalArc[1]?.purpose.length > 25 ? "PASS" : "REQUIRES REVISION", "A visitor who sees only the first fifth should still understand a meaningful brand/product truth."),
    result("performance", "Performance-budget test", has3dDependency(text) && brief.tier === "cinematic" ? "PASS WITH DEGRADATION" : "PASS", "The idea should survive performance constraints without deleting its core meaning.", "Use progressive enhancement for optional immersive systems."),
  ];
  if (signatureThesisOverlap === 0) results.push(result("signature-link", "Signature-to-thesis link", "REQUIRES REVISION", "The signature moment shares little explicit language with the controlling thesis.", "Rewrite the signature so its mechanism directly expresses the thesis."));
  const blockers = results.filter((item) => item.status === "FATAL").map((item) => `${item.label}: ${item.reason}`);
  const weights: Record<StressStatus, number> = { PASS: 10, "PASS WITH DEGRADATION": 8, "REQUIRES REVISION": 5, FATAL: 0 };
  const resilienceScore = Number((results.reduce((sum, item) => sum + weights[item.status], 0) / results.length).toFixed(1));
  return { territoryId: territory.id, results, blockers, resilienceScore };
}
