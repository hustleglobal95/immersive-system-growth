import assert from "node:assert/strict";
import test from "node:test";
import { directProject, critiqueTreatment } from "../src/platform/directorEngine";
import { compileDirectorTreatment } from "../src/platform/directorCompiler";
import { parseDirectorTreatment, type DirectorBrief } from "../src/platform/directorSchema";

const projectTypes: DirectorBrief["projectType"][] = ["brand", "product", "property", "hospitality", "portfolio", "saas", "commerce", "campaign", "automotive", "fashion"];
const tiers: DirectorBrief["tier"][] = ["cinematic", "immersive", "signature", "flagship"];

function brief(projectType: DirectorBrief["projectType"], tier: DirectorBrief["tier"]): DirectorBrief {
  return {
    projectName: `${projectType}-${tier}`,
    projectType,
    tier,
    audience: "A clearly defined premium audience evaluating a high-consideration experience.",
    objective: "Create preference, prove value and move qualified visitors toward a deliberate conversion.",
    primaryAction: "Start a conversation",
    brandTruth: "Specific craft, clarity and a defensible point of view.",
    differentiators: ["Distinctive product truth", "Strong visual assets"],
    constraints: ["Do not imitate generic category conventions"],
    existingAssets: [
      { id: "hero", label: "Hero master asset", type: "model", notes: "Hero-quality master GLB / visual" },
      { id: "support", label: "Supporting campaign image", type: "image", notes: "High-resolution supporting material" },
    ],
    references: [],
  };
}

test("Director generates valid treatments and executable creative plans for every project type and tier", () => {
  for (const projectType of projectTypes) {
    for (const tier of tiers) {
      const treatment = directProject(brief(projectType, tier));
      assert.equal(parseDirectorTreatment(treatment).projectType, projectType);
      assert.equal(treatment.territories.length, 3);
      assert.ok(treatment.territories.some((territory) => territory.id === treatment.selectedTerritoryId));
      assert.match(treatment.memoryStatement, /^People will remember /);
      assert.ok(treatment.emotionalArc.length >= 5);
      assert.ok(treatment.emotionalArc.some((beat) => beat.intensity >= 9));
      assert.ok(treatment.emotionalArc.some((beat) => beat.intensity <= 4));
      assert.ok(treatment.noGoRules.length >= 3);
      assert.ok(treatment.critique.overall >= 8);
      const allocation = Object.values(treatment.budgetAllocation).reduce((sum, value) => sum + value, 0);
      assert.equal(allocation, 100);

      const compilation = compileDirectorTreatment(treatment);
      assert.equal(compilation.creativePlan.scenes.length, treatment.emotionalArc.length);
      assert.equal(compilation.creativePlan.concept, treatment.thesis);
      assert.equal(compilation.creativePlan.artDirection?.northStar, treatment.thesis);
      assert.ok(compilation.creativePlan.constraints.prohibited.length >= 3);
      assert.equal(compilation.provenance.construction, "director-intelligence.constructionKnowledge");
      assert.ok(compilation.creativePlan.scenes.some((scene) =>
        scene.direction?.implementationNotes.some((note) => note.startsWith("Construction patterns:")),
      ));
      assert.ok((compilation.creativePlan.artDirection?.forbiddenPatterns.length ?? 0) >= treatment.noGoRules.length);
    }
  }
});

test("Director concentrates more production emphasis into signature moments at higher tiers", () => {
  const cinematic = directProject(brief("product", "cinematic"));
  const flagship = directProject(brief("product", "flagship"));
  assert.ok(flagship.budgetAllocation.signatureMoment > cinematic.budgetAllocation.signatureMoment);
  assert.ok(flagship.shotBible.length >= cinematic.shotBible.length);
});

test("Director flags flattened pacing when every beat is made intense", () => {
  const treatment = directProject(brief("property", "signature"));
  const flattened = {
    ...treatment,
    emotionalArc: treatment.emotionalArc.map((beat, index) => ({ ...beat, intensity: index < 4 ? 9 : 8 })),
  };
  const critique = critiqueTreatment(flattened);
  assert.ok(critique.blockers.some((item) => item.includes("Too many climax-level beats")));
  assert.ok(critique.warnings.some((item) => item.includes("low-intensity reset")));
  assert.ok(critique.pacingContrast < treatment.critique.pacingContrast);
});

test("Director demotes weak supplied assets instead of blindly using them", () => {
  const input = brief("hospitality", "flagship");
  input.existingAssets.push({ id: "weak", label: "Old low-res lobby placeholder", type: "image", notes: "Generic stock placeholder" });
  const treatment = directProject(input);
  const weak = treatment.assets.find((asset) => asset.id === "weak");
  assert.equal(weak?.quality, "weak");
  assert.equal(weak?.productionDecision, "replace");
});

test("Director schema rejects budget allocations that do not total 100", () => {
  const treatment = directProject(brief("brand", "immersive"));
  assert.throws(() => parseDirectorTreatment({
    ...treatment,
    budgetAllocation: { ...treatment.budgetAllocation, opening: treatment.budgetAllocation.opening + 1 },
  }), /Budget allocation must total 100/);
});
