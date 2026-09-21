import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";

const projectTypes = ["brand", "product", "property", "hospitality", "portfolio", "saas", "commerce", "campaign", "automotive", "fashion"];
const tiers = ["cinematic", "immersive", "signature", "flagship"];
const failures = [];
let runs = 0;
for (const projectType of projectTypes) {
  for (const tier of tiers) {
    const brief = {
      projectName: `intelligence-${projectType}-${tier}`,
      projectType,
      tier,
      client: `Audit ${projectType}`,
      audience: "A defined premium audience comparing options and seeking credible proof before acting.",
      objective: "Create preference, prove a specific differentiated value, and move qualified visitors toward action.",
      primaryAction: "Start a conversation",
      brandTruth: `This ${projectType} project earns attention through one specific client truth rather than category spectacle.`,
      differentiators: ["A distinctive client-specific product or brand truth", "A credible proof point unavailable to generic competitors"],
      constraints: ["Avoid category clichés", "Preserve mobile meaning", "Keep one protected signature moment"],
      existingAssets: [{ id: "hero", label: "Hero master asset", type: projectType === "saas" ? "image" : "model", notes: "Hero-quality asset with enough fidelity for the primary reveal." }, { id: "brand", label: "Distinctive brand symbol", type: "brand", notes: "Recognizable client-owned visual asset." }],
      references: [{ label: "Cross-medium precedent", lesson: "Use pacing and controlled revelation; do not copy surface style." }],
    };
    try {
      const result = runDirectorIntelligence({ brief });
      runs++;
      if (result.report.evaluations.length !== 3) failures.push(`${projectType}/${tier}: expected three evaluations`);
      if (result.report.selectedEvaluation.critiques.length !== 12) failures.push(`${projectType}/${tier}: expected 12 deterministic planning lenses`);
      if (result.report.stress.results.length < 12) failures.push(`${projectType}/${tier}: stress lab incomplete`);
      if (result.report.whyLadders.some((ladder) => !ladder.valid)) failures.push(`${projectType}/${tier}: invalid why ladder`);
      if (result.report.precedents.length < 2) failures.push(`${projectType}/${tier}: precedent retrieval too thin`);
      if (!result.productionPlan.creativePlan?.scenes?.length) failures.push(`${projectType}/${tier}: production plan did not compile`);
      if (result.debate.pairwise.length !== 3) failures.push(`${projectType}/${tier}: pairwise tournament incomplete`);
      if (!result.creativeDNA?.northStar || result.creativeDNA.northStar.length < 12) failures.push(`${projectType}/${tier}: Creative DNA missing north star`);
      if (result.visualLanguages?.length !== 3) failures.push(`${projectType}/${tier}: expected three visual-language worlds`);
      if (new Set((result.visualLanguages ?? []).map((item) => item.modeId)).size !== 3) failures.push(`${projectType}/${tier}: visual-language modes collapsed`);
      if (result.visualLanguageDivergence?.matrix?.length !== 3) failures.push(`${projectType}/${tier}: visual-language distance matrix incomplete`);
      if (result.artDirection?.sceneFrames?.length !== result.report.treatment.emotionalArc.length) failures.push(`${projectType}/${tier}: Art Director scene coverage incomplete`);
      if (Object.keys(result.disciplineDirections ?? {}).length !== 8) failures.push(`${projectType}/${tier}: specialist creative directors incomplete`);
      if ((result.creativeMutations?.length ?? 0) < 5) failures.push(`${projectType}/${tier}: mutation set too shallow`);
      if (Object.keys(result.creativeCeiling?.dimensions ?? {}).length !== 13) failures.push(`${projectType}/${tier}: Creative Ceiling V2 dimension coverage incomplete`);
      if (result.creativeCeiling && result.creativeCeiling.projected < result.creativeCeiling.current) failures.push(`${projectType}/${tier}: projected creative ceiling regressed`);
      if (!result.productionPlan.creativeIntelligence?.dna?.northStar) failures.push(`${projectType}/${tier}: production plan dropped Creative DNA`);
      if (result.report.verdict !== "UNVERIFIED") failures.push(`${projectType}/${tier}: heuristic-only run issued a creative verdict`);
      if (result.report.judgment.status !== "unverified") failures.push(`${projectType}/${tier}: heuristic-only run fabricated judgment evidence`);
      if (result.productionPlan.readiness.readyForProduction) failures.push(`${projectType}/${tier}: production authorized without rendered judgment`);
      if (result.report.selectedEvaluation.scoreSemantics !== "deterministic-planning-proxy") failures.push(`${projectType}/${tier}: evaluation semantics are not explicit`);
      if (result.report.selectedEvaluation.critiques.some((critique)=>critique.basis !== "deterministic-lens")) failures.push(`${projectType}/${tier}: planning lens misrepresented as independent judgment`);
    } catch (error) {
      failures.push(`${projectType}/${tier}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
if (failures.length) {
  console.error(`Director Intelligence audit failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Director Intelligence audit passed: ${runs} full runs across ${projectTypes.length} project types × ${tiers.length} tiers.`);
