import assert from "node:assert/strict";
import test from "node:test";
import { createDirectorProductionPlan, createProductionPlanFromTreatment } from "../src/platform/directorProductionPlan";
import { directProject } from "../src/platform/directorEngine";

const brief = {
  projectName: "Production Test",
  projectType: "property" as const,
  tier: "signature" as const,
  audience: "Design-conscious premium residence buyers.",
  objective: "Create preference and qualified inquiries.",
  primaryAction: "Request availability",
  brandTruth: "Architectural restraint and elevation above the city.",
  differentiators: ["Architecture", "Views"],
  constraints: ["Avoid generic luxury conventions"],
  existingAssets: [
    { id: "tower", label: "Tower master GLB", type: "model" as const, notes: "Hero-quality architectural model" },
  ],
  references: [],
};

test("Director production plan joins treatment, structure and creative execution", () => {
  const plan = createDirectorProductionPlan(brief);
  assert.equal(plan.treatment.projectName, brief.projectName);
  assert.equal(plan.structure.archetype, "property-development");
  assert.equal(plan.creativePlan.concept, plan.treatment.thesis);
  assert.ok(plan.alignment.length > 0);
  assert.ok(plan.alignment.every((item) => item.sectionId && item.emotionalBeatId));
  assert.equal(plan.readiness.blockers.length, 0);
  assert.ok(plan.readiness.creativeScore >= 8);
  assert.ok(plan.readiness.structureScore >= 80);
});

test("manual territory selection is preserved in production handoff", () => {
  const treatment = directProject(brief);
  const alternate = treatment.territories.find((territory) => territory.id !== treatment.selectedTerritoryId)!;
  const changed = {
    ...treatment,
    selectedTerritoryId: alternate.id,
    thesis: alternate.thesis,
    memoryStatement: `People will remember ${treatment.projectName} because ${alternate.memory}.`,
    signatureMoment: {
      ...treatment.signatureMoment,
      description: alternate.signatureMoment,
      whyMemorable: alternate.memory,
    },
    artBible: { ...treatment.artBible, northStar: alternate.thesis },
  };
  const plan = createProductionPlanFromTreatment(changed);
  assert.equal(plan.treatment.selectedTerritoryId, alternate.id);
  assert.equal(plan.creativePlan.concept, alternate.thesis);
  assert.equal(plan.creativePlan.artDirection?.northStar, alternate.thesis);
});

test("structure alignment spans from opening emotion to late conversion emotion", () => {
  const plan = createDirectorProductionPlan(brief);
  assert.equal(plan.alignment[0].emotionalBeatId, plan.treatment.emotionalArc[0].id);
  const finalAlignment = plan.alignment.at(-1)!;
  const finalBeat = plan.treatment.emotionalArc.at(-1)!;
  assert.equal(finalAlignment.emotionalBeatId, finalBeat.id);
});
