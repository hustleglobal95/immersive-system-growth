# Forge Director

Forge Director is the creative authority layer above Structure, Creative Plan, Motion, Camera, Type, Assets and Runtime.

Its job is not to add effects. Its job is to decide what the project should become, why it should exist in that form, where ambition should be concentrated, and what must be removed to keep the work memorable.

## Operating principle

> Director decides what deserves to exist. Forge builds it.

Director runs before production and returns a structured treatment that can be compiled into the existing Forge creative/runtime pipeline.

## Inputs

A Director brief contains:

- project name
- project type
- production tier
- audience
- business objective
- primary conversion action
- brand truth
- differentiators
- constraints
- existing assets
- references and lessons

Supported project types:

- brand
- product
- property
- hospitality
- portfolio
- SaaS
- editorial commerce
- campaign
- automotive
- fashion

Supported tiers:

- cinematic
- immersive
- signature
- flagship

## Director treatment

Every treatment includes:

1. exactly three creative territories;
2. one Director-selected territory;
3. a single controlling thesis;
4. a memory statement;
5. an emotional arc;
6. an intensity curve;
7. one protected signature moment;
8. an art bible;
9. camera, motion, typography, color, material, lighting, imagery, interaction, transition, sound, spatial and mobile grammar;
10. a shot bible;
11. asset assessments and production decisions;
12. budget/effort allocation;
13. explicit no-go rules;
14. originality rules that fight the generic "Forge look";
15. conversion and mobile direction;
16. production priorities;
17. a quality bar;
18. critique questions;
19. a scored Director critique.

## Creative territories

Director always presents three genuinely different strategic territories and recommends one using weighted scores for:

- distinctiveness
- brand fit
- memorability
- feasibility
- conversion fit

The recommendation is not irreversible. A human can select another territory in `/director`; the thesis, memory statement, signature moment and critique are recalculated for the selected direction.

## Thesis

The thesis is a production rule, not marketing copy.

Examples:

- property: `Make vertical elevation the emotional journey.`
- product: `Reveal value layer by layer until the object feels inevitable.`
- hospitality: `Let the outside world gradually disappear.`
- SaaS: `Collapse complexity into one obvious workflow.`

Every major production decision should be defensible against the thesis.

## Memory test

Every project receives:

> People will remember [project] because [...].

If the sentence is not compelling at final cut, the project is not creatively finished.

## Intensity discipline

Director scores every emotional beat from 0–10.

9–10 intensity is intentionally scarce. The system rejects treatments with more than three 9–10 peaks and the default Director profiles are designed around one dominant signature moment.

This is how Forge protects contrast instead of making every section compete for attention.

## Signature moment

Every treatment declares one primary signature moment and records:

- what happens;
- why it is memorable;
- prerequisites;
- what must not dilute it.

Higher production tiers allocate a larger share of effort toward this moment.

## Asset direction

Director does not assume every supplied asset deserves screen time.

Assets are classified as:

- hero
- strong
- supporting
- weak
- missing

And receive one production decision:

- use
- upgrade
- replace
- create
- omit

Weak assets should never occupy hero roles simply because a client supplied them.

## Budget / effort allocation

Director allocates 100% of production emphasis across:

- signature moment
- opening
- core story
- asset creation
- art direction / UI
- supporting utility

The allocation changes by project type and tier.

This is not an accounting invoice. It is a production-priority model designed to prevent equal effort from being spent on unequal moments.

## Critique

Director critiques its own treatment across:

- thesis clarity
- signature-moment strength
- pacing contrast
- visual coherence
- brand specificity
- interaction purpose
- mobile integrity
- conversion integrity
- originality
- asset discipline

The critique produces:

- blockers
- warnings
- cuts
- Director directives

Production readiness requires:

- Director creative score >= 9/10;
- Structure score >= 90/100;
- no Director or Structure blockers.

## Structure handoff

`createDirectorProductionPlan()` maps Director project types to Structure Engine archetypes and aligns website sections to the emotional arc.

Examples:

- property -> property-development
- hospitality -> hospitality-destination
- automotive -> product-launch
- fashion -> editorial-commerce

Each structural section receives an emotional responsibility, including the intended intensity and visitor question.

## Creative Plan handoff

`compileDirectorTreatment()` converts the treatment into the existing `CreativePlan` contract.

It transfers:

- thesis -> concept / north star
- emotional arc -> creative scenes
- shot bible -> scene direction
- grammar -> artDirection rules
- no-go rules -> negative directives / forbidden patterns
- intensity -> motion preset selection
- signature moment -> primary motion archetype
- asset direction -> asset requirements
- mobile interpretation -> mobile notes
- immersive construction knowledge -> composition, motion, transition, interaction, implementation, mobile and forbidden-pattern directives

The result can use the existing Forge creative compiler without inventing a parallel runtime.

## Immersive construction intelligence

Director does not treat a reference as a request to import its implementation stack. Before reference-driven production, Forge deconstructs the observable construction: composition, typography, depth, scroll choreography, persistent anchors, interaction physics, DOM/WebGL responsibilities, mobile translation and first-use performance costs.

Reusable construction knowledge lives in `src/platform/director-intelligence/constructionKnowledge.ts` and is compiled into the existing Creative Plan. The current research pool contains **170 evidence-graded immersive references** and **92 executable construction patterns**, spanning composition, typography, camera direction, interaction causality, DOM/WebGL coordination, asset pipelines, mobile translation, transition budgeting and first-use performance.

These are **construction rules, not component presets**. They describe how to use Forge's existing camera, motion, R3F, shader, media, mask and interaction systems. They do not prescribe a proprietary palette, typeface, branded layout or signature interaction from a reference.

For manual or agent-led reference study, use `docs/IMMERSIVE_REFERENCE_DECONSTRUCTION_TEMPLATE.md` and the `/study-reference` command. The governing method is documented in `docs/IMMERSIVE_CONSTRUCTION_INTELLIGENCE.md`. The corpus itself is split between `docs/IMMERSIVE_REFERENCE_CORPUS.md` and `docs/IMMERSIVE_EXTERNAL_REFERENCE_CORPUS.md`.

Director does not simply retrieve the highest-scoring examples. It diversifies sources and ranks recurring construction patterns by evidence weight, reference count and independent source-host support so one studio or marketplace cannot become the default visual answer.

## Director room

Visit:

`/director`

The UI exposes:

- brief controls
- three creative territories
- Director's Pick
- thesis and memory statement
- signature moment
- intensity curve
- art / shot bible
- asset decisions
- budget allocation
- critique
- production readiness
- Structure/Emotion alignment
- exports for treatment, structure, creative plan and full production plan

## Headless use

Generate a complete production handoff from a brief:

```bash
npm run director:generate -- --input config/director-brief.example.json --output artifacts/director
```

Outputs:

```text
artifacts/director/<project>/
  director-treatment.json
  structure-plan.json
  creative-plan.json
  production-plan.json
```

The command prints thesis, memory statement, selected territory, signature moment, creative score, structure score, readiness and blockers.

## Audit

Run:

```bash
npm run director:audit
```

The audit generates and compiles every matrix combination:

- 10 project types
- 4 tiers
- 40 treatments
- 40 executable Creative Plans

It verifies:

- exactly three territories;
- valid selected territory;
- memory statement;
- intensity discipline;
- 100% budget allocation;
- no default critique blockers;
- minimum creative score;
- executable Creative Plan conversion.

`director:audit` is part of the default `npm run check` gate.

## Relationship to the rest of Forge

```text
Client brief / assets / business objective
                ↓
          FORGE DIRECTOR
   thesis · territories · treatment
   emotional arc · art/shot bible
   signature moment · critique
                ↓
          STRUCTURE ENGINE
      hierarchy · section grammar
                ↓
          CREATIVE PLAN
   scene intent · art direction · runtime hints
                ↓
  Motion · Camera · Type · Assets · Interaction
                ↓
          FORGE RUNTIME
```

Director is intentionally upstream of implementation.

It should be difficult to add a major cinematic technique after the treatment is locked unless the technique strengthens the thesis, signature moment or visitor understanding.

## Final-cut rule

Before final production sign-off, answer all of the following:

- Is the thesis visible without reading the strategy document?
- Is the signature moment still the strongest moment?
- Is there enough quiet before the climax?
- Are we explaining something that should be shown?
- Are we using 3D because the story requires it or because Forge can?
- Does every interaction reveal meaning, evidence or control?
- Does mobile preserve the same idea?
- Could this be mistaken for a reskin of another Forge project?
- Are weak assets receiving too much attention?
- Can a visitor describe one memorable idea after leaving?

If the answer to the last question is no, Director sends the project back into creative development.
