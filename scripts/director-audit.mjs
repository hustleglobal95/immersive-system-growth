import { directProject } from "../src/platform/directorEngine.ts";
import { compileDirectorTreatment } from "../src/platform/directorCompiler.ts";

const projectTypes = ["brand", "product", "property", "hospitality", "portfolio", "saas", "commerce", "campaign", "automotive", "fashion"];
const tiers = ["cinematic", "immersive", "signature", "flagship"];
const failures = [];
let treatments = 0;
let plans = 0;

for (const projectType of projectTypes) {
  for (const tier of tiers) {
    const brief = {
      projectName: `audit-${projectType}-${tier}`,
      projectType,
      tier,
      audience: "A defined premium audience with a clear reason to evaluate this experience.",
      objective: "Create preference, prove value and move qualified visitors toward conversion.",
      primaryAction: "Start a conversation",
      brandTruth: "Specific craft, clarity and a defensible point of view.",
      differentiators: ["Specific product truth", "Distinctive creative opportunity"],
      constraints: ["Avoid generic category conventions"],
      existingAssets: [{ id: "hero", label: "Hero master asset", type: "model", notes: "Hero-quality master asset" }],
      references: [],
    };
    try {
      const treatment = directProject(brief);
      treatments++;
      if (treatment.territories.length !== 3) failures.push(`${projectType}/${tier}: expected exactly three territories`);
      if (!treatment.territories.some((territory) => territory.id === treatment.selectedTerritoryId)) failures.push(`${projectType}/${tier}: selected territory missing`);
      if (!treatment.memoryStatement.startsWith("People will remember")) failures.push(`${projectType}/${tier}: memory statement missing`);
      const peaks = treatment.emotionalArc.filter((beat) => beat.intensity >= 9).length;
      if (peaks < 1 || peaks > 3) failures.push(`${projectType}/${tier}: invalid intensity peak count ${peaks}`);
      const allocation = Object.values(treatment.budgetAllocation).reduce((sum, value) => sum + value, 0);
      if (Math.abs(allocation - 100) > 0.001) failures.push(`${projectType}/${tier}: budget allocation ${allocation}`);
      if (treatment.critique.blockers.length) failures.push(`${projectType}/${tier}: treatment has critique blockers: ${treatment.critique.blockers.join(" | ")}`);
      if (treatment.critique.overall < 8) failures.push(`${projectType}/${tier}: critique score ${treatment.critique.overall}`);
      const compiled = compileDirectorTreatment(treatment);
      plans++;
      if (compiled.creativePlan.scenes.length !== treatment.emotionalArc.length) failures.push(`${projectType}/${tier}: compiled beat mismatch`);
    } catch (error) {
      failures.push(`${projectType}/${tier}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (failures.length) {
  console.error(`Forge Director audit failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Forge Director audit passed: ${treatments} treatments, ${plans} executable creative plans, ${projectTypes.length} project types × ${tiers.length} tiers.`);
