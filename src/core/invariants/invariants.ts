export type InvariantLevel = "error" | "warning";

export interface InvariantViolation {
  code: string;
  message: string;
  level: InvariantLevel;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ForgeInvariant<TState> {
  id: string;
  check(state: TState): InvariantViolation[];
}

export function validateInvariants<TState>(state: TState, invariants: readonly ForgeInvariant<TState>[]) {
  return invariants.flatMap((invariant) => invariant.check(state).map((violation) => ({ ...violation, details: { invariant: invariant.id, ...violation.details } })));
}

export function assertInvariants<TState>(state: TState, invariants: readonly ForgeInvariant<TState>[]) {
  const violations = validateInvariants(state, invariants).filter((violation) => violation.level === "error");
  if (!violations.length) return;
  const error = new Error(`Forge invariant failure: ${violations.map((item) => `${item.code}: ${item.message}`).join("; ")}`);
  Object.assign(error, { violations });
  throw error;
}
