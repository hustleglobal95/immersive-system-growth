import test from "node:test";
import assert from "node:assert/strict";
import { auditStructure, createStructurePlan, recommendStructure, structureArchetypeCatalog, structureTierCatalog } from "../src/platform/siteStructure";

test("every archetype and tier creates a valid baseline structure", () => {
  for (const archetype of structureArchetypeCatalog) {
    for (const tier of structureTierCatalog) {
      const plan = createStructurePlan(archetype.id, tier.id);
      assert.equal(plan.sections[0]?.role, "hero");
      assert.equal(plan.sections.at(-1)?.role, "footer");
      assert.ok(plan.sections.some((section) => section.role === "conversion"));
      assert.ok(plan.targetSceneRange[0] <= plan.targetSceneRange[1]);
      const ids = new Set(plan.sections.map((section) => section.id));
      assert.equal(ids.size, plan.sections.length);
      const audit = auditStructure(plan);
      assert.ok(audit.score >= 75, `${plan.id} scored ${audit.score}`);
      assert.equal(audit.issues.some((issue) => issue.level === "error"), false, `${plan.id} should not have errors`);
    }
  }
});

test("higher tiers never reduce structural depth", () => {
  for (const archetype of structureArchetypeCatalog) {
    const counts = structureTierCatalog.map((tier) => createStructurePlan(archetype.id, tier.id).sections.length);
    for (let index = 1; index < counts.length; index++) assert.ok(counts[index] >= counts[index - 1], `${archetype.id} regressed at tier ${index}`);
  }
});

test("recommendation maps common project language to the expected archetype", () => {
  assert.equal(recommendStructure({ projectType: "luxury condo tower in Miami" }).archetype, "property-development");
  assert.equal(recommendStructure({ projectType: "boutique hotel and resort" }).archetype, "hospitality-destination");
  assert.equal(recommendStructure({ projectType: "B2B SaaS analytics platform" }).archetype, "saas-product");
  assert.equal(recommendStructure({ projectType: "creative agency portfolio" }).archetype, "portfolio-studio");
  assert.equal(recommendStructure({ projectType: "luxury watch product" }).archetype, "product-launch");
});
