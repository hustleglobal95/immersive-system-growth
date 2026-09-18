import type { AutonomyContract, AutonomyLevel } from "@/src/platform/autonomy/types";

const descriptions: Record<AutonomyLevel, string> = {
  1: "Plan only: infer the brief and return a production strategy.",
  2: "Plan + configure: author a validated Forge production candidate.",
  3: "Plan + configure + create missing production assets.",
  4: "Build + verify + compare rendered output and repair regressions.",
  5: "Full autonomous final-cut candidate with forced-improvement repair loops.",
};

export function autonomyContract(level: AutonomyLevel): AutonomyContract {
  return {
    level,
    description: descriptions[level],
    requires: {
      promptIntelligence: true,
      assetPlanning: level >= 2,
      assetGeneration: level >= 3,
      browserVerification: level >= 4,
      visualComparison: level >= 4,
      repairLoop: level >= 4,
      finalCut: level >= 5,
    },
    hardGates: [
      "No unresolved Director or hierarchy blockers.",
      "No unsupported factual claims treated as verified truth.",
      "No missing hero/signature-critical asset presented as complete.",
      "Mobile preserves the defining idea.",
      ...(level >= 4 ? ["Functional browser verification passes.", "A repair candidate may replace the incumbent only if it wins comparison without breaking hard gates."] : []),
      ...(level >= 5 ? ["Final-cut review completed against rendered output.", "Performance and accessibility release gates pass."] : []),
    ],
  };
}
