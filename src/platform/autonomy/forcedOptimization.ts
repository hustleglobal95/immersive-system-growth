export type ComparisonWinner = "incumbent" | "candidate" | "tie" | "invalid";

export interface PairwiseJudgment {
  judgeId: string;
  firstId: string;
  secondId: string;
  winnerId?: string;
  hardGateFailures: string[];
  reasons: string[];
  confidence: number;
}

export interface ForcedOptimizationDecision {
  accepted: boolean;
  winner: ComparisonWinner;
  reason: string;
  agreement: number;
  judgments: PairwiseJudgment[];
}

export function forcedOptimizationDecision(input: {
  incumbentId: string;
  candidateId: string;
  judgments: PairwiseJudgment[];
  candidateHardGateFailures?: string[];
}): ForcedOptimizationDecision {
  const hardFailures = input.candidateHardGateFailures ?? [];
  if (hardFailures.length) {
    return { accepted:false, winner:"invalid", reason:"Candidate failed hard gates: " + hardFailures.join("; "), agreement:1, judgments:input.judgments };
  }
  const valid = input.judgments.filter((item) => !item.hardGateFailures.length && item.confidence >= 0.5);
  if (!valid.length) return { accepted:false, winner:"tie", reason:"No sufficiently confident pairwise judgment is available.", agreement:0, judgments:input.judgments };
  const candidateWins = valid.filter((item) => item.winnerId === input.candidateId).length;
  const incumbentWins = valid.filter((item) => item.winnerId === input.incumbentId).length;
  const denominator = Math.max(1,candidateWins+incumbentWins);
  const agreement = Number((Math.max(candidateWins,incumbentWins)/denominator).toFixed(2));
  if (candidateWins > incumbentWins && candidateWins >= Math.ceil(valid.length/2)) {
    return { accepted:true, winner:"candidate", reason:"Candidate wins the blinded comparison and preserves all hard gates.", agreement, judgments:input.judgments };
  }
  if (incumbentWins > candidateWins) return { accepted:false, winner:"incumbent", reason:"Incumbent remains stronger under pairwise comparison.", agreement, judgments:input.judgments };
  return { accepted:false, winner:"tie", reason:"Candidate did not establish a reliable improvement over the incumbent.", agreement, judgments:input.judgments };
}
