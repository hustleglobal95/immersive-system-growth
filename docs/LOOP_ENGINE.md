# Forge Loop Engine

Forge Loop Engine is the control plane for bounded autonomous improvement.

It does not mean "run the agent again." A loop is an explicit contract:

```text
goal
→ freeze incumbent
→ capture evidence
→ diagnose
→ generate bounded candidates
→ deterministic verification
→ pairwise comparison
→ candidate tournament
→ candidate / hold / stop / escalate
→ project memory
→ optional human promotion
```

The authoritative project is never overwritten by a loop.

## Why this exists

Forge already had the worker pieces:

- deterministic incumbent/candidate rendering;
- Visual Director findings;
- bounded presentation/camera/motion repairs;
- functional verification;
- motion-quality verification;
- reversed-order pairwise visual comparison;
- forced optimization;
- Project Vault and production memory.

Loop Engine standardizes the orchestration around them:

- one typed loop definition;
- explicit budget;
- explicit stop policy;
- fresh compact context each candidate;
- multi-candidate search;
- evidence ledger;
- human approval boundary;
- run/project/global memory separation.

## Commands

List available loop contracts:

```bash
npm run loop:list
```

Run an executable loop from a durable Project Vault checkpoint:

```bash
npm run loop:run -- --loop visual-polish --project my-project
npm run loop:run -- --loop mobile-translation --project my-project
npm run loop:run -- --loop motion-polish --project my-project
```

Optional bounds can be tightened per run:

```bash
npm run loop:run -- --loop visual-polish --project my-project --cycles 2 --candidates 2
```

A file can be used instead of Project Vault for engineering experiments:

```bash
npm run loop:run -- --loop visual-polish --experience config/experience.json
```

File-based runs produce evidence and a candidate artifact but have no durable project target for promotion.

The legacy command remains available:

```bash
npm run autonomy:repair-loop
```

It is now a one-cycle/one-candidate compatibility wrapper over Loop Engine.

## Executable loops

### Visual Polish

Runs three candidate strategies by default:

- hierarchy first;
- camera first;
- cadence first.

All candidates must preserve functional, motion, mobile and visual gates.

### Mobile Translation

Judges narrow-viewport equivalence first:

- mobile composition;
- mobile camera;
- mobile cadence.

The purpose is reinterpretation, not deletion of the desktop concept.

### Motion Polish

Optimizes:

- continuity;
- camera cadence;
- typography timing.

Forward/reverse determinism and scene-boundary motion gates remain authoritative.

## Contract-only loops

Performance, Asset Quality and Construction have complete loop contracts, budgets, verifier requirements, human gates and memory policy, but are deliberately marked non-executable.

Forge does not expose a loop as executable until its repair worker can:

1. operate on bounded production state;
2. produce reversible changes;
3. generate machine-readable evidence;
4. pass relevant deterministic gates;
5. compare against the incumbent;
6. fail closed when evidence is missing.

This prevents fake autonomy.

## Candidate tournament

Every cycle freezes one incumbent and may generate several independent repair directions.

Each candidate receives a fresh context containing only:

- loop objective;
- candidate strategy;
- project context;
- unresolved evidence;
- recent repair signatures;
- preservation rules.

The entire prior transcript is not replayed into each candidate.

A candidate is eligible only when:

- no hard gate failed;
- it is not a duplicate;
- pairwise comparison says candidate > incumbent;
- preference agreement meets the loop threshold.

Eligible candidates are ranked by:

1. pairwise agreement;
2. motion score;
3. stable candidate id tie-break.

Only one candidate can become the next incumbent.

## Stop policy

Loop Engine can stop for:

### Saturation

No candidate proves a safe improvement for the configured no-progress limit.

This is a successful terminal condition: the incumbent remains authoritative.

### Attempt budget

Candidate-attempt budget is exhausted.

### Cycle budget

Maximum cycles are reached.

### Wall-time budget

The loop exceeds its configured wall-time limit.

### Reported-cost budget

A loop can define a maximum reported cost. The guard activates only when a worker reports measured cost. Current visual workers do not pretend to know provider billing when that telemetry is unavailable.

### Oscillation

A promoted incumbent fingerprint repeats an earlier promoted incumbent state.

Forge escalates instead of bouncing between preferences.

### Repeated repair

The same repair signature recurs repeatedly without improvement.

Forge escalates the blocker instead of retrying the same edit.

## Evidence layout

Every run writes under:

```text
test-results/forge-loops/<timestamp>-<loop-id>/
```

The run contains:

```text
run-report.json
current-incumbent.json
current-candidate.json
accepted-experience.json     # human-review artifact only when improvement was proved
cycle-01/
  incumbent/
  incumbent-motion.json
  c1-01-<strategy>/
    repair/
    capture/
    functional.json
    motion.json
    comparison.json
...
```

`run-report.json` is the canonical loop ledger.

It records:

- definition and objective;
- source Project Vault version/file;
- candidate attempts;
- proven candidate improvements;
- incumbent/candidate fingerprints;
- repair signatures;
- hard-gate failures;
- functional result;
- motion score;
- pairwise outcome;
- agreement;
- stop reason;
- learning candidate;
- human-approval requirement.

## Human approval

A loop winner is an artifact, not production.

For a Project Vault run, inspect the evidence and accepted artifact, then explicitly promote it:

```bash
npm run loop:accept -- --report test-results/forge-loops/<run>/run-report.json --actor "Kevin" --approve
```

Acceptance:

- requires a Project Vault source;
- requires at least one proven improvement;
- requires an explicit actor;
- requires `--approve`;
- writes a new validated Project Vault version;
- preserves project, asset manifest and interaction graph;
- records the acceptance in project history.

Loop Engine never changes `config/experience.json` itself.

## Memory model

### Run memory

`run-report.json` and cycle evidence.

It exists to prevent repeated repairs, detect saturation/oscillation, and explain the decision.

### Project memory

Project Vault journal records:

- loop start;
- loop candidate prepared for review;
- loop saturation/stop;
- loop escalation;
- explicit human acceptance.

A loop-generated learning statement remains project-scoped by default.

### Forge memory

Loop Engine does not automatically rewrite global Director doctrine.

A project lesson may be promoted into Forge-wide knowledge only after separate evidence shows it generalizes across multiple projects. This keeps one client's taste from becoming a universal rule.

## Studio

Studio exposes **Loops** beside Guided Build and Vault.

The panel shows:

- executable vs contract-only status;
- objective;
- budgets;
- verifiers;
- candidate strategies;
- stop/escalation policy;
- Project Vault checkpoint readiness;
- visual critic readiness;
- exact command for the current project.

The browser does not launch the long-running local loop. The runner needs a persistent local process, Playwright, the candidate-aware preview runtime and server-only critic credentials. Studio therefore prepares and explains the operation while the repo runner owns execution.

## Worker architecture

The current visual-family loop worker reuses:

```text
autonomy-candidate-capture
autonomy-visual-director
autonomy-functional-verify
autonomy-motion-review
autonomy-compare
```

These remain specialized workers/verifiers.

Loop Engine owns:

```text
loop definition
budget
context
candidate tournament
stop policy
evidence ledger
memory policy
human gate
```

Future workers should plug into that contract rather than creating new top-level repair-loop scripts.

## Release rule

Loop Engine is evidence infrastructure, not permission to skip release gates.

A human-approved loop candidate still requires the normal Forge release contract:

- project validation;
- asset durability;
- browser verification;
- performance evidence;
- accessibility/reduced-motion behavior;
- real-device checks where required;
- review PR before production.
