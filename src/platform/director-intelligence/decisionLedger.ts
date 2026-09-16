import type { CreativeDecision, DecisionLedger, WhyLadder } from "@/src/platform/director-intelligence/types";

export function createDecisionLedger(): DecisionLedger { return { version: 1, decisions: [] }; }

export function proposeDecision(ledger: DecisionLedger, input: Omit<CreativeDecision, "id" | "status" | "createdAt"> & { status?: CreativeDecision["status"]; createdAt?: string }): DecisionLedger {
  const id = `decision-${String(ledger.decisions.length + 1).padStart(3, "0")}`;
  const decision: CreativeDecision = { ...input, id, status: input.status ?? "proposed", createdAt: input.createdAt ?? new Date().toISOString() };
  return { ...ledger, decisions: [...ledger.decisions, decision] };
}

export function lockDecision(ledger: DecisionLedger, id: string, approvedBy: string): DecisionLedger {
  const found = ledger.decisions.some((decision) => decision.id === id); if (!found) throw new Error(`Unknown creative decision: ${id}`);
  return { ...ledger, decisions: ledger.decisions.map((decision) => decision.id === id ? { ...decision, status: "locked" as const, approvedBy } : decision) };
}

export function reviseDecision(ledger: DecisionLedger, id: string, replacement: Omit<CreativeDecision, "id" | "status" | "createdAt" | "supersedes">, approvedBy?: string): DecisionLedger {
  const original = ledger.decisions.find((decision) => decision.id === id); if (!original) throw new Error(`Unknown creative decision: ${id}`);
  const superseded = ledger.decisions.map((decision) => decision.id === id ? { ...decision, status: "superseded" as const } : decision);
  const nextId = `decision-${String(superseded.length + 1).padStart(3, "0")}`;
  return { version: 1, decisions: [...superseded, { ...replacement, id: nextId, status: approvedBy ? "locked" : "revised", approvedBy, createdAt: new Date().toISOString(), supersedes: id }] };
}

export function decisionFromWhyLadder(ladder: WhyLadder, evidenceIds: string[], affectedSystems: string[], author = "forge-director"): Omit<CreativeDecision, "id" | "status" | "createdAt"> {
  return { decision: ladder.decision, whyLadder: [ladder.creativeReason, ladder.brandReason, ladder.audienceReason, ladder.emotionalReason, ladder.mediumReason, ladder.productionReason], evidenceIds, affectedSystems, rejectedAlternatives: [], author };
}

export function validateLockedDecisions(ledger: DecisionLedger, proposedChanges: Array<{ system: string; description: string }>) {
  const violations: string[] = [];
  for (const change of proposedChanges) {
    for (const decision of ledger.decisions.filter((item) => item.status === "locked" && item.affectedSystems.includes(change.system))) {
      const requiredTerms = decision.decision.toLowerCase().split(/\s+/).filter((token) => token.length > 5).slice(0, 4);
      if (requiredTerms.length && !requiredTerms.some((token) => change.description.toLowerCase().includes(token))) violations.push(`${change.system} change may violate ${decision.id}: ${decision.decision}`);
    }
  }
  return violations;
}
