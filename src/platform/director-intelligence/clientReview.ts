import type { DirectorBrief, DirectorTerritory } from "@/src/platform/directorSchema";
import type { ClientFeedbackRecord, DefensePacket, FeedbackClass } from "@/src/platform/director-intelligence/types";

export function classifyClientFeedback(text: string): FeedbackClass {
  const value = text.toLowerCase();
  if (/wrong|incorrect|fact|date|number|name/.test(value)) return "factual-correction";
  if (/budget|deadline|legal|must|cannot|contract/.test(value)) return "business-constraint";
  if (/brand|logo|guideline|tone|identity/.test(value)) return "brand-constraint";
  if (/copy|photo|video|section|content|amenit|feature/.test(value)) return "content-request";
  if (/confus|hard to use|can't find|cannot find|usab|navigation/.test(value)) return "usability-concern";
  if (/scope|extra page|new feature|also build|integration/.test(value)) return "scope-change";
  if (/ceo|founder|board|stakeholder|investor|partner/.test(value)) return "stakeholder-politics";
  if (/don't like|prefer|favorite|colour|color|font|bigger|smaller/.test(value)) return "preference";
  return "creative-disagreement";
}

export function feedbackEvidenceWeight(classification: FeedbackClass) {
  const weights: Record<FeedbackClass, number> = { "factual-correction": 1, "business-constraint": 1, "brand-constraint": 0.95, "content-request": 0.7, preference: 0.35, "stakeholder-politics": 0.55, "usability-concern": 0.9, "creative-disagreement": 0.5, "scope-change": 0.85 };
  return weights[classification];
}

export function recordClientFeedback(text: string, affects: string[] = []): ClientFeedbackRecord {
  const classification = classifyClientFeedback(text);
  return { id: `feedback-${Date.now().toString(36)}`, text, classification, evidenceWeight: feedbackEvidenceWeight(classification), affects, createdAt: new Date().toISOString() };
}

export function buildDefensePacket(brief: DirectorBrief, territory: DirectorTerritory): DefensePacket {
  const make = (question: string, answer: string, tradeoff: string, fallback: string) => ({ question, answer, evidence: ["brief.brandTruth", "brief.objective", ...brief.differentiators.map((_, index) => `brief.differentiators.${index}`)], tradeoff, fallback });
  return {
    territoryId: territory.id,
    likelyQuestions: [
      make("Why this idea?", `Because the thesis turns the stated brand truth into a behavior: ${territory.thesis}`, "A more familiar category solution may be easier to explain but less ownable.", "Reduce execution ambition without changing the thesis."),
      make("Why so much or so little motion?", `Motion is subordinate to the experience premise: ${territory.experientialPremise}`, "More motion can increase spectacle while reducing hierarchy.", "Move secondary moments to static/editorial treatment."),
      make("Will this work on mobile?", "The concept must preserve its thesis even when simultaneous motion and spatial depth are reduced.", "Mobile may use different framing and pacing rather than identical choreography.", "Use equivalent semantic/media treatment for the signature moment."),
      make("Is this too risky?", `The territory's known risk is: ${territory.risk}`, "Reducing creative risk can also reduce memorability and differentiation.", "Preserve the core thesis while simplifying the highest-risk production device."),
      make("How does this help the business?", `The experience is designed around the objective: ${brief.objective}; the primary action remains ${brief.primaryAction}.`, "Over-optimizing immediate conversion can weaken brand desire; over-optimizing spectacle can hide utility.", "Keep direct utility available while storytelling unfolds."),
    ],
  };
}
