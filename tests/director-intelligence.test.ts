import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { fingerprintTreatment, compareFingerprints } from "../src/platform/director-intelligence/portfolioMemory";
import { createTasteProfile, recordPreference } from "../src/platform/director-intelligence/taste";
import { scanCategoryCliches } from "../src/platform/director-intelligence/cliches";
import { runStressLab } from "../src/platform/director-intelligence/stressTests";
import { createDecisionLedger, proposeDecision, lockDecision } from "../src/platform/director-intelligence/decisionLedger";
import { recordClientFeedback } from "../src/platform/director-intelligence/clientReview";
import { reviewProduction } from "../src/platform/director-intelligence/continuousCritic";
import { synthesizePostmortem } from "../src/platform/director-intelligence/learning";
import { buildResearchBrief, auditResearchFindings } from "../src/platform/director-intelligence/research";

const brief = {
  projectName: "Aurelia Tower",
  projectType: "property" as const,
  tier: "signature" as const,
  client: "Aurelia Development",
  audience: "Affluent buyers comparing waterfront residences who value privacy, view, material quality and a credible sense of place.",
  objective: "Create preference for the tower and convert qualified visitors into private sales inquiries.",
  primaryAction: "Request private presentation",
  brandTruth: "The tower's value is the progressive separation from city noise into private waterfront elevation.",
  differentiators: ["Uninterrupted waterfront view corridors", "Private arrival sequence separates public city from residential life"],
  constraints: ["Avoid generic gold luxury treatment", "Do not use gratuitous building orbiting", "Mobile must preserve the ascent idea"],
  existingAssets: [{ id: "tower", label: "Hero tower model", type: "model" as const, notes: "Hero-quality GLB with facade and residence levels." }, { id: "mark", label: "Aurelia horizon mark", type: "brand" as const, notes: "Recognizable horizontal brand symbol used across sales materials." }],
  references: [{ label: "Architectural film", lesson: "Stable horizon and patient threshold movement; do not copy grading or composition." }],
};

test("advanced Director runs full intelligence pipeline", () => {
  const result = runDirectorIntelligence({ brief });
  assert.equal(result.report.evaluations.length, 3);
  assert.equal(result.report.selectedEvaluation.critiques.length, 12);
  assert.equal(result.debate.pairwise.length, 3);
  assert.ok(result.report.stress.results.length >= 12);
  assert.ok(result.report.precedents.some((item) => !item.precedent.industries.includes("property")));
  assert.ok(result.report.whyLadders.every((ladder) => ladder.valid));
  assert.ok(result.productionPlan.creativePlan.scenes.length >= 5);
  assert.ok(["LOCK", "REVISE", "RESEARCH REQUIRED", "ASSET BLOCKED", "REJECT"].includes(result.report.verdict));
});

test("portfolio collision catches identical prior work", () => {
  const treatment = directProject(brief);
  const fingerprint = fingerprintTreatment(treatment, "current");
  const collision = compareFingerprints(fingerprint, { ...fingerprint, projectId: "previous" });
  assert.equal(collision.verdict, "reject");
  assert.equal(collision.dimensions.overall, 100);
});

test("category cliché scan surfaces property defaults", () => {
  const treatment = directProject(brief);
  const territory = { ...treatment.territories[0], visualPremise: treatment.territories[0].visualPremise + " generic gold luxury treatment and gratuitous building orbit" };
  const scan = scanCategoryCliches(brief, treatment, territory);
  assert.ok(scan.detected.length >= 1);
});

test("stress lab includes brand-swap and mobile gates", () => {
  const treatment = directProject(brief);
  const report = runStressLab(brief, treatment, treatment.territories[0]);
  assert.ok(report.results.some((item) => item.id === "brand-swap"));
  assert.ok(report.results.some((item) => item.id === "mobile"));
});

test("taste profile learns pairwise preference without absolute scores", () => {
  const profile = recordPreference(createTasteProfile(), { id: "pref-1", winnerId: "a", loserId: "b", reasons: ["A is more restrained and concept-specific."], dimensions: { restraintVsSpectacle: -0.8, familiarVsNovel: 0.5 }, createdAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(profile.preferences.length, 1);
  assert.ok(profile.dimensions.restraintVsSpectacle < 0);
});

test("creative decisions can be proposed and explicitly locked", () => {
  let ledger = createDecisionLedger();
  ledger = proposeDecision(ledger, { decision: "Keep horizon fixed through ascent", whyLadder: ["creative", "brand", "audience", "emotion", "medium", "production"], evidenceIds: ["brief-brand-truth"], affectedSystems: ["camera"], rejectedAlternatives: [{ decision: "Free orbit", reason: "Turns architecture into a product turntable." }], author: "director" });
  ledger = lockDecision(ledger, "decision-001", "human-creative-director");
  assert.equal(ledger.decisions[0].status, "locked");
});

test("client feedback distinguishes facts from preference", () => {
  assert.equal(recordClientFeedback("The floor count is incorrect").classification, "factual-correction");
  assert.equal(recordClientFeedback("I prefer the logo bigger").classification, "preference");
});

test("continuous critic becomes stricter late in production", () => {
  const treatment = directProject(brief);
  const review = reviewProduction(treatment, 90, createDecisionLedger(), { implementedSystems: ["camera", "motion"], signatureStrength: 7.5 });
  assert.ok(review.blockers.length >= 1);
});

test("postmortem stores low-confidence observations rather than fake laws", () => {
  const observations = synthesizePostmortem({ projectId: "aurelia", selectedTerritoryId: "rise", revisions: 1, outcomes: ["Client praised the quiet transition into the residence."] });
  assert.ok(observations.length >= 1);
  assert.ok(observations.every((item) => item.confidence === "low"));
});

test("research helper requires provenance", () => {
  const research = buildResearchBrief("Aurelia", "property", brief.objective);
  assert.ok(research.queries.length >= 3);
  assert.ok(auditResearchFindings([{ id: "x", topic: "precedent", claim: "Useful claim", source: "not-a-url", sourceAuthority: "secondary", retrievedAt: "2026-01-01" }]).length >= 1);
});
