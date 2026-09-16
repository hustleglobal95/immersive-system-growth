import type { DirectorEvidence } from "@/src/platform/director-intelligence/types";

export interface ResearchFinding { id: string; topic: "category-convention" | "competitor-positioning" | "cultural-context" | "visual-trend" | "precedent" | "distinctive-asset" | "audience-language" | "product-fact"; claim: string; source: string; sourceAuthority: "primary" | "authoritative-secondary" | "secondary" | "community"; retrievedAt: string; }

export function researchFindingToEvidence(finding: ResearchFinding): DirectorEvidence {
  const confidenceByAuthority: Record<ResearchFinding["sourceAuthority"], number> = { primary: 0.95, "authoritative-secondary": 0.85, secondary: 0.7, community: 0.5 };
  return { id: finding.id, claim: finding.claim, evidenceClass: "public-research", sourceIds: [finding.source], confidence: confidenceByAuthority[finding.sourceAuthority], verified: finding.sourceAuthority === "primary" || finding.sourceAuthority === "authoritative-secondary", affects: [finding.topic] };
}

export function buildResearchBrief(projectName: string, industry: string, objective: string) {
  return {
    projectName,
    queries: [
      `Current ${industry} visual and interaction conventions to avoid`,
      `${industry} competitors positioning and distinctive brand assets`,
      `Cross-medium creative precedents relevant to ${objective}`,
      `Cultural or geographic context materially relevant to the brief`,
      `Audience language and factual product/category claims requiring verification`,
    ],
    rule: "Research supplies evidence. It never automatically becomes creative direction; every finding must preserve source provenance and confidence.",
  };
}

export function auditResearchFindings(findings: ResearchFinding[]) {
  const blockers: string[] = [];
  for (const finding of findings) {
    if (!finding.source || !/^https?:\/\//.test(finding.source)) blockers.push(`${finding.id}: missing source URL.`);
    if (!finding.claim.trim()) blockers.push(`${finding.id}: empty research claim.`);
  }
  return blockers;
}
