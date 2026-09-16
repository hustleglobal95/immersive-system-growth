import type { ClientFeedbackRecord, CreativeMemoryGraph, LearningObservation } from "@/src/platform/director-intelligence/types";
import { addLesson } from "@/src/platform/director-intelligence/memory";

export function synthesizePostmortem(input: { projectId: string; selectedTerritoryId: string; revisions: number; productionHours?: number; assetSpend?: number; performanceIssues?: number; clientFeedback?: ClientFeedbackRecord[]; outcomes?: string[]; }): LearningObservation[] {
  const observations: LearningObservation[] = [];
  const now = new Date().toISOString();
  const add = (observation: string, sampleSize: number, confidence: LearningObservation["confidence"], action: string, evidenceIds: string[] = []) => observations.push({ id: `lesson-${observations.length + 1}`, observation, sampleSize, confidence, evidenceIds, action, createdAt: now });
  if (input.revisions <= 1) add(`Selected territory ${input.selectedTerritoryId} required very little concept revision.`, 1, "low", "Store as a positive hypothesis; do not generalize until repeated across projects.");
  if (input.revisions >= 4) add(`Selected territory ${input.selectedTerritoryId} generated ${input.revisions} revision rounds.`, 1, "low", "Inspect whether thesis explanation, brand evidence or stakeholder alignment was weak.");
  if ((input.performanceIssues ?? 0) > 0) add(`Creative production encountered ${input.performanceIssues} performance issue(s).`, 1, "low", "Compare the original signature dependency against runtime budget before reusing similar mechanisms.");
  if ((input.assetSpend ?? 0) > 0 && (input.productionHours ?? 0) > 0) add(`Asset spend was $${input.assetSpend} across approximately ${input.productionHours} production hours.`, 1, "low", "Use as production-cost evidence, not as a causal creative-quality rule.");
  const feedback = input.clientFeedback ?? [];
  const highEvidence = feedback.filter((item) => item.evidenceWeight >= 0.85);
  if (highEvidence.length) add(`${highEvidence.length} high-evidence client feedback item(s) materially constrained the direction.`, highEvidence.length, highEvidence.length >= 4 ? "medium" : "low", "Feed factual/business/brand constraints into future brief discovery earlier.", highEvidence.map((item) => item.id));
  for (const outcome of input.outcomes ?? []) add(outcome, 1, "low", "Retain as an observation until corroborated by multiple projects.");
  return observations;
}

export function writeLearningToMemory(graph: CreativeMemoryGraph, projectId: string, observations: LearningObservation[]): CreativeMemoryGraph {
  return observations.reduce((current, observation) => addLesson(current, projectId, `${observation.observation} Action: ${observation.action}`, observation.confidence === "high" ? 0.9 : observation.confidence === "medium" ? 0.65 : 0.4), graph);
}

export function aggregateObservations(observations: LearningObservation[]) {
  const grouped = new Map<string, LearningObservation[]>();
  for (const observation of observations) {
    const key = observation.observation.toLowerCase().replace(/\d+/g, "#").split(/\s+/).slice(0, 8).join(" ");
    grouped.set(key, [...(grouped.get(key) ?? []), observation]);
  }
  return [...grouped.values()].map((items) => ({
    observation: items[0].observation,
    samples: items.reduce((sum, item) => sum + item.sampleSize, 0),
    confidence: items.length >= 5 ? "high" : items.length >= 3 ? "medium" : "low",
    caution: items.length < 3 ? "Treat as hypothesis; sample is too small for a creative rule." : "Use as evidence with context, not as an automatic design prescription.",
  }));
}
