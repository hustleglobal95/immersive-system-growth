import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import { buildConstructionDirectives } from "../src/platform/director-intelligence/constructionKnowledge";
import { planImmersiveConstruction } from "../src/platform/director-intelligence/constructionPlanner";

function brief(
  projectType: "brand" | "product" | "portfolio" | "saas",
  assets: Array<{ id: string; label: string; type: "model" | "image" | "video"; notes: string }>,
) {
  return {
    projectName: `Construction Planner ${projectType}`,
    projectType,
    tier: "signature" as const,
    client: "Planner Test",
    audience: "Design-aware visitors evaluating a premium experience with a clear reason to engage.",
    objective: "Create preference through a memorable immersive story while keeping comprehension and conversion direct.",
    primaryAction: "Start a project",
    brandTruth: "The brand is strongest when one distinctive subject or idea remains legible throughout the journey.",
    differentiators: ["A recognizable owned visual system", "A clear primary subject"],
    constraints: ["Do not use 3D without a reason", "Mobile must preserve the core idea"],
    existingAssets: assets,
    references: [],
  };
}

test("construction planner chooses an experience mode and one decision per emotional beat", () => {
  const treatment = directProject(
    brief("product", [
      { id: "hero", label: "Hero GLB product model", type: "model", notes: "Hero-quality product model." },
    ]),
  );
  const directives = buildConstructionDirectives(treatment);
  const plan = planImmersiveConstruction(treatment, directives);

  assert.equal(plan.sceneDecisions.length, treatment.emotionalArc.length);
  assert.ok(["spatial-hybrid", "persistent-world"].includes(plan.mode));
  assert.ok(plan.persistentCanvasRecommended);
  assert.ok(plan.sceneDecisions.every((scene) => scene.continuityAnchor.length > 0));
  assert.ok(plan.sceneDecisions.every((scene) => scene.depthStrategy.length > 0));
  assert.ok(plan.sceneDecisions.every((scene) => scene.motionStrategy.length > 0));
});

test("planner does not force heavy rendering into every information chapter", () => {
  const treatment = directProject(
    brief("saas", [
      { id: "hero", label: "Hero product interface image", type: "image", notes: "High-resolution interface capture." },
    ]),
  );
  const plan = planImmersiveConstruction(treatment);

  assert.ok(plan.sceneDecisions.some((scene) => scene.medium === "dom"));
  assert.ok(
    plan.sceneDecisions
      .filter((scene) => {
        const beat = treatment.emotionalArc.find((item) => item.id === scene.sceneId);
        return (beat?.informationDensity ?? 0) >= 8;
      })
      .every((scene) => scene.medium === "dom" || scene.medium === "hybrid"),
  );
});

test("signature scene receives stronger prewarm/performance direction when heavy", () => {
  const treatment = directProject(
    brief("brand", [
      { id: "hero", label: "Hero 3D sculpture model", type: "model", notes: "Hero-quality GLB." },
    ]),
  );
  const plan = planImmersiveConstruction(treatment);
  const signatureIds = new Set(
    treatment.emotionalArc.filter((beat) => beat.intensity >= 9).map((beat) => beat.id),
  );
  const signatureScenes = plan.sceneDecisions.filter((scene) => signatureIds.has(scene.sceneId));

  assert.ok(signatureScenes.length >= 1);
  assert.ok(
    signatureScenes.some((scene) =>
      scene.performancePolicy.some((rule) => /prewarm/i.test(rule)),
    ),
  );
});

test("every scene carries a mobile interpretation rather than a hide instruction", () => {
  const treatment = directProject(
    brief("portfolio", [
      { id: "hero", label: "Project film", type: "video", notes: "Cinematic project reel." },
    ]),
  );
  const plan = planImmersiveConstruction(treatment);

  assert.ok(plan.sceneDecisions.every((scene) => scene.mobileTranslation.length >= 1));
  assert.ok(
    plan.sceneDecisions
      .flatMap((scene) => scene.mobileTranslation)
      .every((rule) => !/hide the (scene|experience)/i.test(rule)),
  );
});


test("aggressive research patterns change construction policy instead of staying metadata", () => {
  const treatment = directProject(
    brief("product", [
      { id: "hero", label: "Hero GLB product model", type: "model", notes: "Hero-quality product model." },
      { id: "film", label: "Interactive product film", type: "video", notes: "Product motion footage intended for tactile scrubbing." },
    ]),
  );
  const base = buildConstructionDirectives(treatment);
  const directives = {
    ...base,
    patternIds: Array.from(new Set([
      ...base.patternIds,
      "scrubbable-media-delivery",
      "offscreen-render-worker",
      "input-work-on-demand",
      "scroll-distance-pacing",
      "directional-cut-continuity",
      "dcc-semantic-naming-contract",
      "static-geometry-batching",
      "audio-reactive-semantic-band",
    ])),
  };
  const plan = planImmersiveConstruction(treatment, directives);

  assert.ok(plan.globalRules.some((rule) => /travel distance|view-height/i.test(rule)));
  assert.ok(plan.globalRules.some((rule) => /film cuts/i.test(rule)));
  assert.ok(plan.globalRules.some((rule) => /DCC node names/i.test(rule)));
  assert.ok(plan.globalRules.some((rule) => /Batch static/i.test(rule)));
  assert.ok(plan.globalRules.some((rule) => /audio energy/i.test(rule)));
  assert.ok(
    plan.sceneDecisions.some((scene) =>
      scene.performancePolicy.some((rule) => /raycast|hit testing/i.test(rule)),
    ),
  );
});

test("orthographic diorama knowledge can select a persistent-world construction mode", () => {
  const treatment = directProject(
    brief("portfolio", [
      { id: "room", label: "Orthographic 3D room model", type: "model", notes: "Persistent miniature room." },
    ]),
  );
  const base = buildConstructionDirectives(treatment);
  const directives = {
    ...base,
    patternIds: Array.from(new Set([...base.patternIds, "orthographic-diorama-staging"])),
  };
  const plan = planImmersiveConstruction(treatment, directives);

  assert.equal(plan.mode, "persistent-world");
  assert.ok(plan.persistentCanvasRecommended);
  assert.ok(
    plan.sceneDecisions.every((scene) =>
      /Persistent world\/subject/.test(scene.continuityAnchor),
    ),
  );
});