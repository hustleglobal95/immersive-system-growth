# Forge Autonomy System

Forge autonomy is a closed-loop production discipline, not a larger prompt.

The target loop is:

short prompt → prompt intelligence → Director → decision-time guidance → asset/production planning → build → functional verification → rendered visual review → candidate repair → pairwise comparison → keep only improvements → final cut → learning.

## Current foundation

Autonomy v1 establishes:

- grounded short-prompt intelligence instead of a hardcoded generic brand brief;
- confidence, hypotheses, unknowns and research needs before Director runs;
- project-type and production-tier inference;
- registered asset evidence carried into the Director brief;
- decision-time routing across the immersive construction pattern library and technical doctrine;
- five explicit autonomy levels;
- a 30-case one-line commercial prompt benchmark;
- deterministic desktop/mobile render-review capture planning;
- functional verification scenarios derived from the inferred commercial intent;
- forced optimization: a repair candidate cannot replace the incumbent unless it wins comparison and preserves hard gates.

## Autonomy levels

### Level 1 — Plan
Infer the brief and return a production strategy.

### Level 2 — Configure
Produce a validated Forge production candidate with explicit asset planning.

### Level 3 — Create
Generate/source missing production assets and keep asset blockers explicit.

### Level 4 — Verify and repair
Run browser verification, rendered visual review and repair candidates. Newer is not automatically better.

### Level 5 — Final cut
Require rendered final-cut review, performance/accessibility release gates and forced-improvement repair loops.

## Forced optimization

The current best build is the incumbent.

A repair produces a candidate. The candidate must:

1. pass all hard gates;
2. be compared against the incumbent rather than scored in isolation;
3. survive order-reversed or multi-judge pairwise evaluation when available;
4. win strongly enough to replace the incumbent.

If it does not prove improvement, discard it.

## Prompt intelligence

The short-prompt compiler must never silently fabricate a high-confidence generic brief. Every important inference carries:

- value;
- confidence;
- evidence class;
- evidence;
- whether human confirmation is still required.

Unknown brand rules, product claims and final conversion actions remain explicit unknowns.

## Decision-time guidance

Do not load all 108 construction patterns and all technical doctrine into every decision.

Route only the patterns relevant to the current problem:

- camera;
- motion;
- transition;
- interaction;
- mobile;
- performance;
- asset production;
- visual repair.

Stable architecture stays global. Situation-specific knowledge arrives when the decision is being made.

## Render review

Visual review operates on deterministic capture states from the normalized Forge timeline. At minimum review:

- composition;
- typography;
- camera;
- motion;
- continuity;
- brand specificity;
- interaction;
- mobile equivalence;
- performance.

Findings must point to a capture, affected Forge systems and an actionable repair. Avoid vague feedback such as "make it more premium."

## Functional verification

A visually strong candidate still fails autonomy if:

- the experience cannot boot;
- the narrative becomes trapped;
- reverse progression breaks;
- the primary action is unreachable;
- mobile deletes the defining idea;
- reduced-motion loses meaning.

Functional verification and creative visual judgment are separate review channels.

## Benchmark

Run:

npm run autonomy:benchmark

With a production/dev server running, capture deterministic review frames with:

npm run autonomy:capture

The capture runner writes desktop/mobile screenshots plus `test-results/autonomy/review-report.json`, including runtime errors and horizontal-overflow findings.

The benchmark currently measures short-prompt interpretation across at least 30 commercial prompts. It is part of npm run check and must remain at or above the release threshold.

Future benchmark revisions should add rendered pairwise quality, browser task success, repair monotonicity, performance and human preference rather than collapsing everything into one aesthetic score.

## Visual Director and repair loop

Autonomy v2 adds the rendered-output repair path documented in [VISUAL_DIRECTOR.md](VISUAL_DIRECTOR.md): specialist visual findings, bounded reversible repairs, isolated incumbent/candidate preview rendering, reversed-order pairwise judging and fail-closed forced optimization.

Run the full local loop with:

npm run autonomy:repair-loop

The accepted candidate is written as an artifact; the loop never overwrites the checked-in production experience automatically.

## Next implementation stages

1. Browser execution of the full functional-verification plan against accepted candidates.
2. Fixed-timestep motion/video comparison.
3. Multi-candidate repair search and tournament selection.
4. Multi-candidate asset generation and selection.
5. Pairwise studio-taste learning.
6. Production-trace clustering and failure-pattern mining.
