import type { DirectorTerritory } from "@/src/platform/directorSchema";
import type { EvaluationReport } from "@/src/platform/director-intelligence/types";
import { comparePairwiseScores } from "@/src/platform/director-intelligence/taste";
import { defendTerritory } from "@/src/platform/director-intelligence/divergence";

export interface DebateRound { round: string; notes: string[]; }
export interface DebateResult { rounds: DebateRound[]; rankings: EvaluationReport[]; winnerId?: string; disposition: "LOCK" | "REVISE" | "RESEARCH REQUIRED" | "ASSET BLOCKED" | "REJECT ALL"; pairwise: Array<{ a: string; b: string; winner: string; reasons: string[] }>; defenses: ReturnType<typeof defendTerritory>[]; }

const priorities = ["brandAdherence", "conceptualClarity", "distinctiveness", "memorability", "portfolioNovelty", "commercialAlignment", "productionFeasibility"];

export function runCreativeDebate(territories: DirectorTerritory[], reports: EvaluationReport[]): DebateResult {
  const byId = new Map(reports.map((report) => [report.territoryId, report]));
  const defenses = territories.map(defendTerritory);
  const pairwise: DebateResult["pairwise"] = [];
  for (let i = 0; i < territories.length; i++) {
    for (let j = i + 1; j < territories.length; j++) {
      const a = byId.get(territories[i].id); const b = byId.get(territories[j].id); if (!a || !b) continue;
      const result = comparePairwiseScores(a.scores, b.scores, priorities);
      pairwise.push({ a: a.territoryId, b: b.territoryId, winner: result.winner === "a" ? a.territoryId : result.winner === "b" ? b.territoryId : "tie", reasons: result.reasons });
    }
  }
  const winCount = new Map<string, number>();
  for (const match of pairwise) if (match.winner !== "tie") winCount.set(match.winner, (winCount.get(match.winner) ?? 0) + 1);
  const rankings = [...reports].sort((a, b) => (winCount.get(b.territoryId) ?? 0) - (winCount.get(a.territoryId) ?? 0) || averagePriority(b) - averagePriority(a));
  const viable = rankings.filter((report) => report.recommendation !== "REJECT");
  const winner = viable[0];
  let disposition: DebateResult["disposition"] = "REJECT ALL";
  if (winner) disposition = winner.recommendation === "LOCK" ? "LOCK" : winner.recommendation;
  const rounds: DebateRound[] = [
    { round: "independent-generation", notes: territories.map((territory) => `${territory.id}: ${territory.thesis}`) },
    { round: "specialist-critique", notes: reports.flatMap((report) => report.critiques.filter((critique) => critique.blockers.length).map((critique) => `${report.territoryId}/${critique.role}: ${critique.blockers.join("; ")}`)) },
    { round: "defense", notes: defenses.map((defense) => `${defense.territoryId}: ${defense.strongestReason}`) },
    { round: "pairwise-tournament", notes: pairwise.map((match) => `${match.a} vs ${match.b} → ${match.winner}`) },
    { round: "hybrid-prohibition", notes: ["No automatic hybridization. Merge concepts only if one singular thesis becomes stronger, never to preserve stakeholder compromise."] },
    { round: "adversarial-final", notes: winner ? winner.blockers.length ? winner.blockers : ["Winning territory survived current hard gates."] : ["No territory survived adversarial review."] },
  ];
  return { rounds, rankings, winnerId: winner?.territoryId, disposition, pairwise, defenses };
}

function averagePriority(report: EvaluationReport) {
  return priorities.reduce((sum, key) => sum + (report.scores[key as keyof typeof report.scores] ?? 0), 0) / priorities.length;
}
