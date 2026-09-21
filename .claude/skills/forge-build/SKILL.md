---
name: forge-build
description: End-to-end Forge project execution from a short client/project prompt. Use when the user asks to build, create, redesign, improve, reproduce the behavior of, or finish a cinematic/interactive website or major experience chapter.
allowed-tools: Bash, Read, Grep, Glob, Edit, Write, WebFetch
---

# Forge build

This is the default production workflow for substantial site creation. Do not jump from a short prompt directly into arbitrary code.

## 1. Establish operational state

Run:

```bash
STUDIO_AUTH_ENABLED=false FORGE_LOCAL_STORAGE_ENABLED=true npm run forge:readiness -- --profile=local --strict
```

If this fails, fix the repository/runtime blocker before creative implementation.

Inspect the active project:

- `config/experience.json`
- `config/studio-project.json`
- `config/asset-manifest.json`
- `config/interaction-graph.json`
- `config/cinematic-systems.json`
- `CLAUDE.md`

Never assume an asset, service or project fact that is not present.

## 2. Compile the Forge Build Packet

Convert the user's instruction into one execution contract:

```bash
npm run forge:build-packet -- --name="<project name>" --prompt="<user request>" --output=test-results/forge-build-packet.md
```

Read the entire packet before editing production code.

The packet owns:

- controlling thesis
- primary signature moment
- Creative DNA
- art direction
- hierarchy
- scene construction
- camera/motion/mobile rules
- asset reality
- known blockers
- implementation order
- acceptance contract

Do not replace the thesis with an easier generic concept.

## 3. Write the implementation map

Before editing, state the production mapping for every major scene/chapter:

- dominant subject
- semantic copy
- negative-space region
- camera start/end/path
- object state
- lighting/material state
- typography behavior
- scroll/pointer/tap behavior
- transition in/out
- mobile reinterpretation
- required/preloaded assets
- Forge-native system that owns each behavior

If a behavior has no existing Forge owner, identify the genuinely missing primitive before creating new architecture.

Before a specialist task, compile a task-scoped Context Capsule instead of reloading the entire project:

```bash
npm run forge:context -- --domain="<camera|motion|composition|typography|interaction|asset|mobile|performance|engineering|director>" --scene="<scene-id>" --objective="<specific task>" --prompt="<original user request>" --name="<project name>" --output=test-results/forge-context.json
```

Read the capsule before making the specialist change. Respect its allowed systems, registered capabilities, denied actions and verification requirements. A worker may reason about anything, but it may mutate only what its capability route permits.

## 4. Build with existing Forge systems first

Prefer, in order:

1. semantic DOM + existing design system
2. GSAP/ScrollTrigger and deterministic motion tracks
3. existing camera choreography
4. interaction graph
5. media/mask/visual-physics systems
6. persistent R3F/Three Canvas
7. a bounded new primitive only when the packet cannot be expressed correctly otherwise

Never add a second animation clock or competing Canvas.

Do not add a library merely because a reference used one.

## 5. Prove the signature slice first

Implement enough of the experience to prove:

- visual thesis
- signature moment
- section-to-section continuity
- typography/subject hierarchy
- camera grammar
- mobile equivalent

Render it before spreading the language across the rest of the site.

The Build Packet's Signature Slice Gate is mandatory. If the signature slice has a blocker or loses a pairwise comparison, do not expand full-site production. Fix or replace the slice first. More sections do not rescue a weak core idea.

## 6. Complete the experience

Extend the proven grammar to supporting chapters.

Protect contrast:
- one primary spectacle peak
- quieter supporting beats
- readable proof/conversion moments
- no effect soup
- no equal-intensity section sequence

Preserve client facts and existing conversion requirements.

## 7. Render and inspect

Do not declare completion from source code.

Run the relevant repository gates and capture rendered desktop/mobile evidence.

At minimum:

```bash
npm run check
npm run build
npm run test:browser -- --max-failures=1
```

Use the Loop Engine for bounded refinement when appropriate.

If a custom visual critic or AI Gateway critic is configured, use comparative rendered judgment.
If not, stay in human-review mode; never fabricate a visual win.

## 8. Repair

Fix rendered deviations in this order:

1. broken functionality/accessibility
2. focal hierarchy / crop / copy collisions
3. camera motivation and framing
4. signature-moment timing
5. continuity
6. mobile equivalence
7. first-use performance
8. materials/lighting/micro-craft

Do not polish tiny details while a major hierarchy or asset problem remains.

## 9. Final gate

Run:

```bash
npm run verify
```

Completion requires:

- packet intent visibly survives implementation
- signature moment is the strongest beat
- desktop and mobile are both deliberately composed
- first-use behavior is smooth
- reverse traversal reconstructs valid states
- primary actions remain semantic and usable
- required gates pass
- remaining unknowns are explicitly reported

A green build is necessary, never sufficient.
