import type { CalibrationCase, CouncilCritique, EvaluationReport } from "@/src/platform/director-intelligence/types";

export const calibrationCases: CalibrationCase[] = [
  { id: "exceptional-specific", label: "Exceptional, specific, feasible", expectedDisposition: "ADVANCE", benchmarkScores: { conceptualClarity: 9.2, brandAdherence: 9.3, distinctiveness: 9.1, productionFeasibility: 8.4 }, notes: ["Strong idea and brand ownership."] },
  { id: "beautiful-generic", label: "Beautiful but generic", expectedDisposition: "REJECT", benchmarkScores: { aestheticCoherence: 9.4, brandAdherence: 5.5, portfolioNovelty: 5.8, distinctiveness: 6 }, notes: ["Aesthetics cannot compensate for weak ownership."] },
  { id: "original-impossible", label: "Original but impossible", expectedDisposition: "REVISE", benchmarkScores: { novelty: 9.5, productionFeasibility: 4.8, assetRealism: 4.5 }, notes: ["Preserve idea; redesign execution."] },
  { id: "feasible-boring", label: "Feasible but boring", expectedDisposition: "REVISE", benchmarkScores: { productionFeasibility: 9.3, novelty: 5.2, memorability: 5.5 }, notes: ["Feasibility is not creative quality."] },
  { id: "branded-unusable", label: "Highly branded but unusable", expectedDisposition: "REVISE", benchmarkScores: { brandAdherence: 9.4, interactionPurpose: 4.9, mobileIntegrity: 5.2 }, notes: ["Brand fit cannot erase user harm."] },
];

export function evaluatePlanningCalibration(actual: EvaluationReport[], cases: CalibrationCase[] = calibrationCases) {
  const byId = new Map(actual.map((report) => [report.territoryId, report]));
  let matched = 0; const failures: string[] = [];
  for (const item of cases) {
    const report = byId.get(item.id);
    if (!report) continue;
    if (report.recommendation === item.expectedDisposition) matched++;
    else failures.push(`${item.id}: expected ${item.expectedDisposition}, got ${report.recommendation}.`);
  }
  const scored = cases.filter((item) => byId.has(item.id)).length;
  return { scored, matched, agreement: scored ? matched / scored : 0, failures };
}

export function detectCouncilInflation(critiques: CouncilCritique[]) {
  const allScores = critiques.flatMap((critique) => Object.values(critique.scores).filter((value): value is number => typeof value === "number"));
  if (!allScores.length) return { inflated: false, average: 0, spread: 0, warning: undefined as string | undefined };
  const average = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const spread = Math.max(...allScores) - Math.min(...allScores);
  const inflated = average > 8.8 && spread < 1.2;
  return { inflated, average: Number(average.toFixed(2)), spread: Number(spread.toFixed(2)), warning: inflated ? "Council scores are unusually high and compressed; require human calibration review." : undefined };
}
