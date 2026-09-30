import {
  loopRunReportSchema,
  type LoopRunReport,
} from "@/src/platform/loops/loopSchema";

export interface Interactive3DLoopEvidence {
  code: number;
  reportPath: string;
  report: unknown;
}

export interface Interactive3DAutobuildReadiness {
  ready: boolean;
  blockers: string[];
  totalAcceptedImprovements: number;
  construction: Interactive3DLoopSummary | null;
  visualPolish: Interactive3DLoopSummary | null;
}

export interface Interactive3DLoopSummary {
  status: LoopRunReport["status"];
  candidateAttempts: number;
  acceptedImprovements: number;
  hardGateFailures: string[];
  acceptedExperiencePath?: string;
}

export function evaluateInteractive3DAutobuildReadiness(input: {
  materialized: boolean;
  signatureReady: boolean;
  aiRequested: boolean;
  aiConfigured: boolean;
  aiUsed: boolean;
  construction?: Interactive3DLoopEvidence | null;
  visualPolish?: Interactive3DLoopEvidence | null;
}): Interactive3DAutobuildReadiness {
  const blockers: string[] = [];
  if (!input.materialized) blockers.push("Interactive 3D experience was not materialized.");
  if (!input.signatureReady) blockers.push("Signature-critical hero asset is not production-ready.");
  if (!input.aiRequested || !input.aiConfigured || !input.aiUsed) {
    blockers.push("Bounded AI spatial planning was not executed.");
  }

  const construction = summarizeLoop("construction", input.construction, blockers);
  const visualPolish = summarizeLoop("visual-polish", input.visualPolish, blockers);
  const totalAcceptedImprovements =
    (construction?.acceptedImprovements ?? 0) +
    (visualPolish?.acceptedImprovements ?? 0);

  if (construction && visualPolish && totalAcceptedImprovements < 1) {
    blockers.push(
      "Rendered autonomous loops did not prove any accepted visual/construction improvement over their incumbents.",
    );
  }

  return {
    ready: blockers.length === 0,
    blockers,
    totalAcceptedImprovements,
    construction,
    visualPolish,
  };
}

function summarizeLoop(
  expectedLoopId: "construction" | "visual-polish",
  evidence: Interactive3DLoopEvidence | null | undefined,
  blockers: string[],
): Interactive3DLoopSummary | null {
  if (!evidence) {
    blockers.push("Missing " + expectedLoopId + " rendered-loop evidence.");
    return null;
  }
  if (evidence.code !== 0) {
    blockers.push(expectedLoopId + " loop exited with code " + evidence.code + ".");
    return null;
  }

  const parsed = loopRunReportSchema.safeParse(evidence.report);
  if (!parsed.success) {
    blockers.push(expectedLoopId + " loop evidence did not validate against the Forge Loop schema.");
    return null;
  }
  const report = parsed.data;
  if (report.loopId !== expectedLoopId) {
    blockers.push(
      "Expected " + expectedLoopId + " evidence but received " + report.loopId + ".",
    );
  }
  if (!["completed", "converged"].includes(report.status)) {
    blockers.push(
      expectedLoopId + " loop did not finish cleanly (status " + report.status + ").",
    );
  }
  if (report.candidateAttempts < 1) {
    blockers.push(expectedLoopId + " loop produced no rendered candidate attempts.");
  }

  const hardGateFailures = unique(
    report.cycles.flatMap((cycle) =>
      cycle.candidates.flatMap((candidate) => candidate.hardGateFailures),
    ),
  );
  if (hardGateFailures.length) {
    blockers.push(
      expectedLoopId + " loop retained hard-gate failures in its evidence: " +
      hardGateFailures.slice(0, 4).join("; "),
    );
  }

  return {
    status: report.status,
    candidateAttempts: report.candidateAttempts,
    acceptedImprovements: report.acceptedImprovements,
    hardGateFailures,
    ...(report.acceptedExperiencePath
      ? { acceptedExperiencePath: report.acceptedExperiencePath }
      : {}),
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}
