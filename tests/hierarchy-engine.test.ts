import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import { buildHierarchyReport, hierarchyApprovalBlockers } from "../src/platform/director-intelligence/hierarchy";

const brief = {
  projectName: "Hierarchy Test",
  projectType: "product" as const,
  tier: "flagship" as const,
  client: "Hierarchy Test Client",
  audience: "Design-aware buyers evaluating a premium product through a cinematic but legible experience.",
  objective: "Create desire for the product and move qualified visitors toward ownership.",
  primaryAction: "Configure product",
  brandTruth: "The product earns attention through material engineering and controlled reveal rather than decorative spectacle.",
  differentiators: ["Material engineering", "Precision construction", "Recognizable silhouette"],
  constraints: ["Preserve mobile meaning", "Keep one dominant signature moment"],
  existingAssets: [],
  references: [],
};

test("hierarchy engine reports all eight priority layers", () => {
  const treatment = directProject(brief);
  const report = buildHierarchyReport(brief, treatment);
  assert.equal(report.levels.length, 8);
  assert.deepEqual(report.recommendedNarrative, ["Desire", "reveal", "craftsmanship", "proof", "ownership"]);
  assert.ok(report.overallScore >= 0 && report.overallScore <= 10);
  assert.equal(report.primaryAction, brief.primaryAction);
  assert.ok(report.attentionRules.length >= 3);
});

test("hierarchy approval blockers are namespaced for Director readiness", () => {
  const treatment = directProject(brief);
  const report = buildHierarchyReport(brief, {
    ...treatment,
    grammar: { ...treatment.grammar, composition: [] },
  });
  assert.ok(report.blockers.length >= 1);
  assert.ok(hierarchyApprovalBlockers(report).every((item) => item.startsWith("Hierarchy: ")));
});
