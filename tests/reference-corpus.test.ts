import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import {
  getLayersTemplateCorpus,
  retrieveImmersiveReferences,
} from "../src/platform/director-intelligence/referenceCorpus";
import { buildConstructionDirectives } from "../src/platform/director-intelligence/constructionKnowledge";

const brief = {
  projectName: "Corpus Test",
  projectType: "saas" as const,
  tier: "signature" as const,
  client: "Corpus Client",
  audience: "Design-aware buyers evaluating a premium software product with a strong visual identity.",
  objective: "Create preference with one persistent immersive world while keeping product understanding and conversion clear.",
  primaryAction: "Start a project",
  brandTruth: "The product turns a complex system into one legible persistent environment.",
  differentiators: ["A single spatial model", "A distinctive controlled interaction"],
  constraints: ["Do not reset the central subject between sections", "Mobile must preserve the same idea"],
  existingAssets: [
    {
      id: "hero",
      label: "Hero spatial asset",
      type: "model" as const,
      notes: "Hero-quality GLB.",
    },
  ],
  references: [],
};

test("current GetLayers template corpus tracks all 49 public catalog templates", () => {
  assert.equal(getLayersTemplateCorpus.length, 49);
  assert.equal(
    new Set(getLayersTemplateCorpus.map((reference) => reference.id)).size,
    49,
  );
});

test("48 public template previews are visually reviewed and unresolved catalog entries stay evidence-empty", () => {
  const reviewed = getLayersTemplateCorpus.filter(
    (reference) => reference.evidenceLevel !== "catalog",
  );
  const catalogOnly = getLayersTemplateCorpus.filter(
    (reference) => reference.evidenceLevel === "catalog",
  );

  assert.equal(reviewed.length, 48);
  assert.equal(catalogOnly.length, 1);
  assert.equal(catalogOnly[0]?.id, "northwall");
  assert.ok(
    catalogOnly.every(
      (reference) =>
        reference.observedTraits.length === 0 &&
        reference.transferableLessons.length === 0 &&
        reference.constructionPatternIds.length === 0,
    ),
  );
});

test("deep references carry evidence-backed transferable construction lessons", () => {
  const supported = getLayersTemplateCorpus.filter(
    (reference) => reference.evidenceLevel !== "catalog",
  );
  assert.equal(supported.length, 48);
  assert.ok(
    supported.every(
      (reference) =>
        reference.observedTraits.length > 0 &&
        reference.transferableLessons.length > 0 &&
        reference.evidenceNotes.length > 0 &&
        reference.confidence >= 0.72,
    ),
  );
});

test("reference retrieval excludes catalog-only guesses", () => {
  const treatment = directProject(brief);
  const retrieved = retrieveImmersiveReferences(treatment, 8);
  assert.ok(retrieved.length > 0);
  assert.ok(
    retrieved.every(({ reference }) => reference.evidenceLevel !== "catalog"),
  );
  assert.ok(
    retrieved.some(({ reference }) => reference.id === "ascend"),
  );
});

test("construction directives are grounded in both patterns and corpus precedents", () => {
  const treatment = directProject(brief);
  const directives = buildConstructionDirectives(treatment, 7);
  assert.ok(directives.referenceIds.length > 0);
  assert.ok(directives.referenceLessons.length > 0);
  assert.ok(directives.patternIds.includes("continuous-visual-anchor"));
  assert.ok(
    directives.patternIds.includes("single-world-under-interface") ||
      directives.patternIds.includes("scroll-reposition-not-reset"),
  );
});
