# Forge Visual Director

Forge Visual Director is the rendered-output review and repair layer for Autonomy Level 4.

It does not score code elegance and it does not let a newer generation overwrite the current best build automatically.

The loop is:

incumbent config
→ identical review-surface captures
→ specialist visual findings
→ bounded repair plan
→ isolated candidate config
→ identical candidate captures
→ reversed-order pairwise judgment
→ hard-gate check
→ accept candidate or keep incumbent

## Specialist critics

The Visual Director review contract covers:

- composition
- typography
- camera
- motion
- continuity
- brand specificity
- interaction
- mobile equivalence
- performance

Each finding must contain:

- exact capture ID
- severity
- concrete finding
- visible evidence
- affected Forge systems
- actionable repair
- confidence

Vague feedback such as "make it premium" is invalid.

## Bounded repair surface

Autonomous visual repair may use only registered reversible Forge commands.

Current automatic repair commands:

- scene.adjustPresentation
- camera.applyChoreography
- motion.applyArchetype

scene.adjustPresentation is intentionally narrow. It can make bounded changes to:

- exposure
- ambient/key/rim intensity
- bloom
- vignette
- hero scale
- hero x/y framing
- desktop media position
- mobile media position

It cannot change:

- scene IDs
- scene ranges
- semantic copy
- CTAs
- hotspots
- project structure
- asset identity
- factual claims

Unsupported or low-confidence findings remain unresolved rather than becoming arbitrary code edits.

## Isolated candidate rendering

The review route is /studio/autonomy-preview.

It is unavailable unless FORGE_AUTONOMY_PREVIEW=1.

The route can read two server-only config paths:

- FORGE_AUTONOMY_INCUMBENT_PATH
- FORGE_AUTONOMY_CANDIDATE_PATH

The browser never receives arbitrary filesystem access. The server selects the already configured incumbent or candidate file and validates it with the normal Forge experience schema.

Incumbent and candidate are captured through the same route, viewport, progress state, preview component, runtime and image dimensions.

A/B review is invalid if the two versions were captured from different surfaces.

## Multimodal critic transport

Forge does not hardwire the Visual Director to one model provider.

Configure FORGE_VISUAL_CRITIC_URL.

Optional bearer credential: FORGE_VISUAL_CRITIC_TOKEN.

### Single-frame request

Forge POSTs JSON with version 1, mode single, capture, projectContext, criticBriefs, rules and image { mimeType, data }.

The endpoint returns findings and an optional summary. Every finding is validated by visualCriticFindingSchema.

### Pairwise request

Forge POSTs version 1, mode pairwise, captureId, firstId, secondId, projectContext, rules, firstImage and secondImage.

The endpoint returns winner, confidence, reasons, firstHardGateFailures and secondHardGateFailures.

Each capture is judged twice with order reversed. Candidate-specific hard-gate failures invalidate the candidate globally.

## Forced optimization

The candidate cannot replace the incumbent because it is newer or because one critic likes it.

Acceptance requires:

1. candidate capture succeeds;
2. candidate has no runtime or overflow hard-gate failures;
3. no pairwise judge reports a candidate hard-gate failure;
4. reversed-order comparisons provide enough valid evidence;
5. candidate wins aggregate comparison;
6. the repair remained inside the bounded non-structural command surface.

If those conditions are not met, the incumbent remains authoritative.

## Commands

Review incumbent captures and create a bounded candidate:

npm run autonomy:visual-review

Capture an isolated preview variant:

npm run autonomy:preview:capture

Compare incumbent and candidate:

npm run autonomy:compare

Run the complete local loop:

npm run autonomy:repair-loop

The full loop starts an isolated local review server, captures the incumbent, asks the Visual Director for specialist findings, builds a bounded candidate, captures the candidate on the same surface, performs reversed-order pairwise review and writes an accepted artifact only when forced optimization passes.

Accepted output defaults to test-results/autonomy-loop/accepted-experience.json.

The script does not overwrite config/experience.json. Promotion remains an explicit project/repository action.

## Fail-closed behavior

Without FORGE_VISUAL_CRITIC_URL, Forge may still collect deterministic runtime and overflow findings, but the repair loop will not self-approve a visual candidate.

This is deliberate. A missing creative judge is not evidence that a candidate improved.

## Remaining Autonomy Level 4 work

The Visual Director loop now covers rendered visual review and bounded repair.

The next reliability layers are:

- browser execution of the full functional-verification plan on accepted candidates;
- fixed-timestep motion/video comparison rather than key-frame-only review;
- stronger visual judge calibration against human studio choices;
- multi-candidate repair search instead of one repair candidate per pass;
- measured performance traces attached to pairwise review.
