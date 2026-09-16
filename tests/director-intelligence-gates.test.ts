import test from "node:test";
import assert from "node:assert/strict";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { applyTasteCalibration, createTasteProfile, recordPreference, tasteAdjustment } from "../src/platform/director-intelligence/taste";

const brief = {
  projectName: "Gate Test",
  projectType: "brand" as const,
  tier: "cinematic" as const,
  client: "Gate Test Client",
  audience: "A defined audience evaluating a premium brand with clear evidence and a meaningful reason to engage.",
  objective: "Create preference and move qualified visitors toward a direct conversation.",
  primaryAction: "Start a conversation",
  brandTruth: "The brand wins through disciplined clarity and a distinctive product truth that competitors cannot credibly own.",
  differentiators: ["A defensible product truth", "A recognizable owned brand behavior"],
  constraints: ["Avoid generic category spectacle", "Preserve mobile meaning"],
  existingAssets: [{ id: "hero", label: "Hero brand asset", type: "brand" as const, notes: "Recognizable hero-quality owned brand asset." }],
  references: [{ label: "Editorial precedent", lesson: "Use scale contrast and restraint; do not copy typography or palette." }],
};

test("Director never authorizes production without explicit territory lock", () => {
  const result = runDirectorIntelligence({ brief });
  const territoryGate = result.humanGates.gates.find((gate) => gate.id === "territory-lock");
  assert.equal(territoryGate?.required, true);
  assert.equal(territoryGate?.satisfied, false);
  assert.equal(result.productionPlan.readiness.readyForProduction, false);
});

test("human territory approval is explicit and tied to the selected territory", () => {
  const first = runDirectorIntelligence({ brief });
  const selectedId = first.report.treatment.selectedTerritoryId;
  const approved = runDirectorIntelligence({ brief, approvals: { lockedTerritoryId: selectedId, brandTruthConfirmed: true, assetSpendApproved: true } });
  const territoryGate = approved.humanGates.gates.find((gate) => gate.id === "territory-lock");
  assert.equal(territoryGate?.satisfied, approved.report.treatment.selectedTerritoryId === selectedId);
});

test("taste calibration is capped and cannot overpower core evaluation", () => {
  let profile = createTasteProfile();
  for (let i = 0; i < 20; i++) profile = recordPreference(profile, { id: `pref-${i}`, winnerId: "restrained", loserId: "spectacle", reasons: ["Prefer concept-specific restraint over repeated spectacle."], dimensions: { restraintVsSpectacle: 1, familiarVsNovel: 1 }, createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` });
  const adjustment = tasteAdjustment(profile, { restraintVsSpectacle: 1, familiarVsNovel: 1 });
  assert.ok(adjustment.adjustment <= 0.5);
  const scores = {
    novelty: 8, value: 8, brandAdherence: 8, emotionalResonance: 8, aestheticCoherence: 8, conceptualClarity: 8, memorability: 8, distinctiveness: 8, audienceRelevance: 8, structuralExpression: 8, motionCameraJustification: 8, interactionPurpose: 8, productionFeasibility: 8, mobileIntegrity: 8, commercialAlignment: 8, portfolioNovelty: 8, assetRealism: 8,
  };
  const calibrated = applyTasteCalibration(scores, adjustment.adjustment);
  assert.ok(Math.abs(calibrated.aestheticCoherence - scores.aestheticCoherence) <= 0.5);
  assert.equal(calibrated.brandAdherence, scores.brandAdherence);
  assert.equal(calibrated.productionFeasibility, scores.productionFeasibility);
});
