import type { DirectorBrief, DirectorTerritory } from "@/src/platform/directorSchema";

export interface TrendSignal { id: string; label: string; category: DirectorBrief["projectType"] | "global"; status: "emerging" | "common" | "saturated"; strategicUse?: string; sourceIds: string[]; }

export function assessTrendUse(brief: DirectorBrief, territory: DirectorTerritory, signals: TrendSignal[]) {
  const relevant = signals.filter((signal) => signal.category === "global" || signal.category === brief.projectType);
  const text = `${territory.thesis} ${territory.visualPremise} ${territory.experientialPremise}`.toLowerCase();
  const used = relevant.filter((signal) => signal.label.toLowerCase().split(/\s+/).filter((token) => token.length > 3).some((token) => text.includes(token)));
  const saturated = used.filter((signal) => signal.status === "saturated");
  return {
    used,
    saturated,
    originalityPenalty: Math.min(2.5, saturated.length * 0.5),
    warnings: saturated.map((signal) => `Trend "${signal.label}" is saturated; retain it only with a clear thesis/brand justification.`),
  };
}

export function culturalContextReview(references: Array<{ label: string; lesson: string }>) {
  const sensitive = references.filter((reference) => /sacred|ritual|indigenous|tribal|religious|ceremonial|ethnic|historical trauma|national symbol/i.test(`${reference.label} ${reference.lesson}`));
  return sensitive.map((reference) => ({ reference: reference.label, status: "review-required" as const, reason: "Reference may carry cultural or historical meaning that should be verified before creative lock." }));
}
