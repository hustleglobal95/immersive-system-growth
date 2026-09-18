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

  // This brief asks for one staged subject, restraint until a single reveal, and an anchor
  // carried between chapters. Assert that the selection answers those, not that it returns
  // particular ids: which pattern supplies an intent is a corpus decision and moves as the
  // corpus grows.
  assert.ok(selected.length >= 3);
  assert.ok(
    selected.every((pattern) => !pattern.projectTypes?.length || pattern.projectTypes.includes("brand")),
    "every selected pattern should be type-agnostic or applicable to the brief's project type",
  );

  const composition = selected.flatMap((pattern) => pattern.composition);
  const motion = selected.flatMap((pattern) => pattern.motion);
  const transitions = selected.flatMap((pattern) => pattern.transitions);

  assert.ok(
    composition.some((rule) => /subject|hero object|dominant/i.test(rule)),
    "expected composition direction for staging a dominant subject",
  );
  assert.ok(
    [...motion, ...composition].some((rule) => /single|one .*(peak|signature|reveal)|restraint|stillness/i.test(rule)),
    "expected direction protecting a single signature peak",
  );
  assert.ok(
    transitions.some((rule) => /carry|anchor|persist/i.test(rule)),
    "expected an anchor carried across transitions",
  );
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
