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
npm run loop:run -- --loop performance --project my-project
npm run loop:run -- --loop asset-quality --project my-project
npm run loop:run -- --loop construction --project my-project
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

### Performance

Profiles representative desktop/mobile states before proposing a change. The worker currently produces bounded runtime-budget candidates around DPR, pixel ceilings and preload pressure, then profiles the candidate again.

A performance candidate can advance only when it establishes a measurable relative improvement and still survives functional, mobile and visual comparison. Headless measurements are explicitly comparative evidence; physical-device release checks remain separate.

### Asset Quality

Profiles the experience against its registered manifest, then runs only bounded asset changes Forge can prove are reversible:

- reuse an already-registered lower-byte derivative when explicit source lineage exists and savings are material;
- consolidate exact SHA-256 duplicate aliases inside the same asset class;
- preserve source masters and identity-critical content;
- reject missing/unregistered local assets and material visual/performance regressions.

Asset Quality does not silently download, recompress or replace arbitrary remote client artwork. Image derivatives created by Forge record source path, operation, format, width and quality. Model/video optimization still requires an authored production toolchain.

### Construction

Runs a grounded Director → construction-plan → candidate pipeline. Candidate strategies focus on hierarchy, camera structure and signature-budget concentration.

Construction may coordinate motion, change camera interpolation semantics, and reduce decorative pressure in supporting chapters. It preserves client copy, semantic scene boundaries and authored camera/lens endpoints. It fails closed on unresolved scene-asset blockers.

Construction uses the full verifier stack: schema, functional journey, assets, motion, mobile, performance, accessibility and visual comparison.

All six Loop families are executable. Forge still exposes a worker only when it can operate on bounded production state, generate machine-readable evidence, compare against the incumbent and fail closed when evidence is missing.

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
current-incumbent-asset-manifest.json
current-incumbent-interaction-graph.json
current-candidate.json
current-candidate-asset-manifest.json
current-candidate-interaction-graph.json
accepted-experience.json
accepted-asset-manifest.json
accepted-interaction-graph.json       # human-review bundle only when improvement was proved
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
- incumbent/candidate full-state fingerprints across experience, asset manifest and interaction graph;
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
- verifies the accepted experience/manifest/interaction bundle against the tournament fingerprint;
- writes a new validated Project Vault version atomically;
- preserves the Studio project configuration while promoting the verified experience, asset manifest and interaction graph together;
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

Loop Engine is no longer permanent top-level Studio navigation. Ordinary operators reach it through outcome-level Control Plane capabilities such as **Polish**, **Fix mobile**, **Optimize runtime**, **Improve asset** or **Rebuild**, or through **Improvement evidence** in the command palette.

The panel remains an expert evidence surface and shows:

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

The visual-family loop worker reuses:

```text
autonomy-candidate-capture
autonomy-visual-director
autonomy-functional-verify
autonomy-motion-review
autonomy-compare
```

Performance adds:

```text
autonomy-performance-profile
autonomy-performance-repair
```

Asset Quality adds:

```text
autonomy-asset-profile
autonomy-asset-repair
```

Construction adds:

```text
autonomy-construction
autonomy-accessibility-verify
```

All families then reuse functional, motion, performance, asset and pairwise visual verifiers as required by their contract. Renderer evidence includes frame interval percentiles, draw calls, primitive counts, program count, drawing-buffer pixels and pixel ratio. These remain bounded diagnostic signals rather than claimed GPU timings.

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
