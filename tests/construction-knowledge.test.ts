import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import {
  buildConstructionDirectives,
  selectConstructionPatterns,
} from "../src/platform/director-intelligence/constructionKnowledge";

const brief = {
  projectName: "Immersive Construction Test",
  projectType: "brand" as const,
  tier: "cinematic" as const,
  client: "Test Brand",
  audience: "Design-aware buyers evaluating a premium product and the thinking behind it.",
  objective: "Create preference through a premium immersive narrative and move visitors toward a direct conversation.",
  primaryAction: "Start a project",
  brandTruth: "The product is defined by precision, material quality and a distinctive physical interaction.",
  differentiators: [
    "A recognizable physical product",
    "A material system that reacts strongly to controlled light",
  ],
  constraints: [
    "Avoid generic particle spectacle",
    "Mobile must preserve the central subject and interaction idea",
  ],
  existingAssets: [
    {
      id: "hero-model",
      label: "Hero product model",
      type: "model" as const,
      notes: "Hero-quality GLB with material separation.",
    },
  ],
  references: [
    {
      label: "Immersive editorial reference",
      lesson: "One staged object against oversized typography; motion is restrained until a single signature reveal.",
    },
  ],
};

test("construction intelligence selects reusable immersive patterns", () => {
  const treatment = directProject(brief);
  const selected = selectConstructionPatterns(treatment);
  const ids = selected.map((pattern) => pattern.id);

  assert.ok(ids.includes("continuous-visual-anchor"));
  assert.ok(ids.includes("staged-subject-hero"));
  assert.ok(ids.includes("single-signature-peak"));
});

test("construction directives translate visual knowledge into implementation rules", () => {
  const treatment = directProject(brief);
  const directives = buildConstructionDirectives(treatment);

  assert.ok(directives.compositionRules.length > 0);
  assert.ok(directives.motionRules.length > 0);
  assert.ok(directives.implementationRules.some((rule) => rule.includes("Forge")));
  assert.ok(directives.mobileRules.some((rule) => rule.toLowerCase().includes("mobile") || rule.toLowerCase().includes("portrait")));
  assert.ok(directives.forbiddenPatterns.some((rule) => rule.toLowerCase().includes("orbit") || rule.toLowerCase().includes("particles")));
});
