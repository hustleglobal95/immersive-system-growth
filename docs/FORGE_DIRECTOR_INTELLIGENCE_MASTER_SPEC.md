# Forge Director Intelligence — Master Specification

Status: Implemented foundation + Creative Intelligence 2.0; real-project calibration remains ongoing
Scope: Creative intelligence, judgment, originality, critique, precedent reasoning, memory, calibration and learning
Owner: Forge Director
Depends on: Forge Director v1, Structure Engine, Creative Plan, Forge capability registry, project/versioning core

---

# 1. Mission

Forge Director must become the highest-leverage intelligence layer in the platform.

Its job is not to generate more ideas.

Its job is to make it increasingly difficult for a weak, generic, derivative, strategically irrelevant or poorly allocated idea to survive into production.

The target system should behave less like a prompt template and more like an experienced executive creative director supported by specialist directors, a reference library, a project memory, a skeptical review board, a production strategist and an evidence-aware learning loop.

The final standard is:

> Director should reduce the probability that Forge produces technically impressive but creatively ordinary work.

Director decides what deserves to exist. Forge builds it.

---

# 2. Target outcome

Director Intelligence is considered production-capable when it can reliably do all of the following. Creative Intelligence 2 now implements the visual-language, Art Director, mutation, layered-taste and multidimensional-ceiling portions of this specification; calibration against repeated human production use remains an ongoing requirement:

1. understand a client brief, business objective, audience, brand truth, asset set, constraints and production tier;
2. distinguish facts/evidence from hypotheses and creative invention;
3. retrieve useful precedents by underlying design problem, not merely visual similarity;
4. learn from Forge's own prior projects and avoid repeating them;
5. generate genuinely divergent territories that differ in concept, structure, spatial logic and emotional strategy—not only styling;
6. evaluate originality, usefulness, aesthetics, resonance, brand fit, feasibility and commercial purpose with separate reasoning;
7. run multiple specialist critiques rather than one model grading itself;
8. reject all initial territories when none deserve production;
9. detect category clichés and portfolio self-repetition;
10. explain why every major creative decision exists;
11. stress-test concepts under mobile, budget, asset and content constraints;
12. identify the true creative ceiling of the current brief/assets/budget;
13. identify the next production investment with the highest creative leverage;
14. preserve locked creative decisions throughout production;
15. critique work at 25%, 50%, 75%, 90% and final-cut milestones;
16. learn from human accept/reject decisions and calibrate toward studio taste without collapsing into repetition;
17. learn from client revisions, production cost and post-launch outcomes;
18. keep confidence calibrated and refuse to present unsupported assumptions as truth;
19. maintain a measurable anti-generic / anti-Forge-look objective;
20. produce an approved Treatment that still compiles cleanly into Structure and Creative Plan.

---

# 3. Core research principles

Director Intelligence should incorporate the following principles.

## 3.1 Creative evaluation is multi-dimensional

Do not collapse creative quality into one score.

Originality, usefulness/functionality, aesthetics, adherence/brand fit and resonance rely on different evaluative logics and should remain separable.

Director may publish an overall recommendation, but the underlying dimensions must remain visible.

## 3.2 AI judges can be systematically over-generous

AI creativity evaluators can show lower dispersion and higher average ratings than human expert panels.

Therefore Director must:

- use multiple independent critic roles;
- calibrate scores against human review history;
- track score distributions;
- prohibit self-authored critique scores from being trusted without recomputation;
- include explicit kill criteria, not only positive scoring.

## 3.3 Precedents should be stored as design reasoning

Reference knowledge should connect:

```text
issue → context → concept → principle → form → outcome → lesson
```

rather than only:

```text
website → visual style
```

This supports useful cross-category transfer without superficial copying.

## 3.4 Distinctiveness and memory matter

Creative direction should protect and strengthen distinctive brand assets and repeatable memory structures when the brand owns them.

Director should distinguish:

- useful continuity;
- intentional brand fluency;
- generic category conventions;
- portfolio repetition;
- accidental imitation.

## 3.5 Great direction includes deletion

Director must be rewarded for removing effects, scenes, assets and ideas that weaken the thesis.

More production is not automatically more quality.

---

# 4. Director Intelligence architecture

```text
                              FORGE DIRECTOR INTELLIGENCE

┌───────────────────────────────────────────────────────────────────────────┐
│                            EVIDENCE LAYER                                 │
│ brief · assets · brand system · references · research · constraints      │
│ evidence provenance · confidence · unknowns · assumptions                │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                         CREATIVE MEMORY GRAPH                             │
│ precedents · past Forge projects · decisions · client feedback           │
│ patterns · anti-patterns · outcomes · portfolio similarity               │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                          DIVERGENCE ENGINE                                │
│ territories · analogies · concept mutation · inversion · recombination   │
│ cross-industry transfer · counterfactuals                                │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                           DIRECTOR COUNCIL                                │
│ ECD · Art · Film · Experience · Brand · Conversion · Production · Skeptic│
│ Accessibility · Mobile · Cultural Context · Client Advocate              │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                    ADVERSARIAL EVALUATION SYSTEM                          │
│ originality fingerprint · cliché scan · why ladder · kill gate           │
│ stress tests · similarity · feasibility · brand distinctiveness          │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                         TASTE / CALIBRATION                               │
│ human accept/reject · pairwise rankings · preference profile             │
│ score calibration · disagreement tracking · confidence                   │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                          PRODUCTION DIRECTOR                              │
│ creative ceiling · asset gap · effort allocation · ROI of craft          │
│ tier fit · production priorities · decision ledger                       │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────────────┐
│                           CONTINUOUS CRITIC                               │
│ 25% · 50% · 75% · 90% · final cut · portfolio test · launch learning     │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ↓
                         STRUCTURE + CREATIVE PLAN
                                    ↓
                              FORGE RUNTIME
```

---

# 5. Evidence and confidence layer

This is mandatory.

Creative systems become dangerous when inference and fact are indistinguishable.

Director should model every important claim with provenance.

## 5.1 Evidence classes

```ts
type EvidenceClass =
  | "client-brief"
  | "client-asset"
  | "brand-system"
  | "reference"
  | "public-research"
  | "forge-history"
  | "director-inference"
  | "creative-hypothesis";
```

Each claim may include:

```ts
interface DirectorEvidence {
  id: string;
  claim: string;
  evidenceClass: EvidenceClass;
  sourceIds: string[];
  confidence: number; // 0..1
  verified: boolean;
  affects: string[];
}
```

## 5.2 Confidence requirements

Director must flag:

- unknown audience assumptions;
- unsupported product claims;
- invented business facts;
- inferred brand truths;
- unverified material/asset properties;
- ambiguous client terminology;
- assumptions that materially influence the thesis.

## 5.3 Creative hypothesis rule

Creative hypotheses are allowed.

They must be labeled as creative hypotheses, not presented as client truth.

Example:

```text
Hypothesis:
The strongest emotional value of this property may be separation from the city.

Evidence:
High-floor views, waterfront position, client emphasis on privacy.

Confidence:
0.72

Needs confirmation:
Yes, before final thesis lock.
```

---

# 6. Creative Memory Graph

Director needs memory across projects and precedents.

This should not be a flat vector store of screenshots.

It should be a graph of design problems, concepts and consequences.

## 6.1 Memory node types

```text
Project
Brief
Audience
BrandTruth
BusinessObjective
Constraint
Asset
Reference
Precedent
DesignIssue
Concept
Territory
CreativePrinciple
FormDecision
ArtDirection
VisualLanguage
CreativeMutation
SignatureMoment
CameraGrammar
MotionGrammar
TypographyGrammar
ColorGrammar
LightingGrammar
MaterialGrammar
ImageGrammar
SoundGrammar
InteractionGrammar
StructurePattern
DistinctiveAsset
ClientFeedback
ProductionDecision
Outcome
FailurePattern
Lesson
```

## 6.2 Relationship examples

```text
Project → HAS_OBJECTIVE → Objective
Project → USED_CONCEPT → Concept
Concept → SOLVED → DesignIssue
Concept → EXPRESSED_BY → FormDecision
Concept → INSPIRED_BY_PRINCIPLE → Precedent
Project → REJECTED_PATTERN → FailurePattern
ClientFeedback → CAUSED_REVISION_OF → Decision
Outcome → SUPPORTS → Lesson
Project → SIMILAR_TO → Project
```

## 6.3 Memory retention rules

Remember the reason behind a decision, not just the final appearance.

Poor memory:

```text
Heliot used a serif and vertical camera move.
```

Useful memory:

```text
Heliot reserved vertical ascent for the emotional climax because elevation was the project's primary value signal. The technique should be penalized in future property projects unless the new brief provides a different conceptual justification.
```

---

# 7. Precedent Library

The precedent library should become Director's external creative education.

## 7.1 Precedent schema

```ts
interface CreativePrecedent {
  id: string;
  title: string;
  creator?: string;
  industries: string[];
  mediums: string[];
  audience?: string;
  objective?: string;
  designIssues: string[];
  concept: string;
  principles: string[];
  formalDevices: string[];
  emotionalArc?: string[];
  interactionModel?: string;
  cameraGrammar?: string[];
  motionGrammar?: string[];
  typographyBehavior?: string[];
  signatureMoment?: string;
  distinctiveAssets?: string[];
  strongestDecision: string;
  weakestDecision?: string;
  outcomes?: string[];
  transferableLessons: string[];
  doNotCopy: string[];
  evidence: DirectorEvidence[];
}
```

## 7.2 Retrieval modes

Director should retrieve precedents using multiple modes:

### Problem similarity

> Find work that solved "how to make technical detail emotionally desirable."

### Emotional similarity

> Find work built around anticipation → release.

### Structural similarity

> Find experiences that move from public context to private intimacy.

### Medium transfer

> Find film/exhibition/editorial precedents that could inform a website.

### Anti-reference

> Find examples of the category clichés we explicitly want to avoid.

### Constraint similarity

> Find strong work created with limited assets, limited pages or mobile-first constraints.

## 7.3 Cross-domain requirement

At least one precedent used during territory generation should come from outside the client's industry for Signature and Flagship tiers.

For example:

- automotive ← fashion photography;
- watch ← museum exhibition;
- hotel ← cinema/environmental sound;
- SaaS ← information design;
- architecture ← editorial sequence;
- commerce ← gallery curation.

Director must transfer principles, not surface styling.

---

# 8. Portfolio Creative Memory

Every completed Forge project becomes a reference Director must compete against.

## 8.1 Portfolio fingerprint

Each project stores a creative fingerprint:

```ts
interface CreativeFingerprint {
  thesisEmbedding: number[];
  narrativePattern: string[];
  emotionalCurve: number[];
  structureRoles: string[];
  cameraDevices: string[];
  motionDevices: string[];
  interactionDevices: string[];
  transitionDevices: string[];
  typographyBehavior: string[];
  compositionPatterns: string[];
  distinctiveAssets: string[];
  signatureMechanism: string;
  colorMaterialDescriptors: string[];
  soundDescriptors: string[];
}
```

## 8.2 Similarity dimensions

Similarity must be scored separately for:

- concept;
- narrative;
- emotional curve;
- structure;
- spatial logic;
- camera;
- motion;
- interaction;
- transition;
- typography behavior;
- composition;
- signature mechanism;
- overall experience.

## 8.3 Portfolio collision gate

Example:

```text
PORTFOLIO COLLISION

Overall similarity to Heliot: 72%

High-overlap dimensions:
Camera      84%
Structure   79%
Signature   88%

Decision:
REJECT / REWRITE

Reason:
The proposed experience repeats a prior Forge solution in the three dimensions most visible to users.
```

High similarity in brand-continuity work may be acceptable when intentional and documented.

---

# 9. Taste Calibration Model

Director must learn studio taste without becoming a style-cloning machine.

## 9.1 Inputs

Capture explicit human decisions:

- accepted territory;
- rejected territory;
- pairwise preference;
- "stronger/weaker" critique;
- reason for rejection;
- requested revision;
- final approval;
- elements the human insists on preserving;
- elements the human repeatedly removes.

## 9.2 Pairwise preference over absolute rating

Prefer asking:

> Which of these two directions is stronger, and why?

rather than:

> Rate this 1–10.

Pairwise preferences produce a more useful relative taste signal.

## 9.3 Taste dimensions

Track preferences across dimensions such as:

- restraint vs spectacle;
- literal vs abstract;
- cinematic vs editorial;
- continuous spatial journey vs chapter cuts;
- typography-led vs image-led;
- dark vs light;
- dense vs sparse;
- directed vs exploratory;
- physical realism vs stylization;
- emotional vs rational proof;
- familiar fluency vs radical novelty.

## 9.4 Anti-collapse rule

Taste calibration must never become "repeat what Kevin liked before."

The model should learn standards and preference tendencies while the originality engine penalizes direct repetition.

The goal is:

> consistent quality judgment, variable creative expression.

Creative Intelligence 2 implements this as three explicitly separate taste layers: studio, operator and project. Studio taste is the durable majority influence; operator and project taste remain secondary. All layers are confidence-weighted and none may override client facts, brand truth, accessibility, production constraints or originality gates.

---

# 10. Director Council

Director should not be one voice grading itself.

The Council is a set of independent evaluators with different objectives.

## 10.1 Required roles

### Executive Creative Director

Primary question:

> Is there actually a powerful idea here?

Evaluates:

- thesis;
- conceptual economy;
- memorability;
- originality;
- creative ambition;
- overall coherence.

### Brand Director

Primary question:

> Could this belong uniquely to this client?

Evaluates:

- brand truth;
- distinctive assets;
- category differentiation;
- brand fluency;
- claim integrity.

### Art Director

Primary question:

> Does the visual system express the idea with taste and discipline?

Evaluates:

- typography;
- composition;
- color;
- material;
- image treatment;
- visual hierarchy;
- restraint.

### Film Director

Primary question:

> Does every shot do emotional or narrative work?

Evaluates:

- camera motivation;
- framing;
- lens language;
- temporal rhythm;
- reveals;
- continuity;
- signature sequence.

### Experience Director

Primary question:

> Does the visitor understand where they are, why they should care and what happens next?

Evaluates:

- journey;
- pacing;
- navigation;
- interaction burden;
- content hierarchy;
- accessibility of meaning.

### Interaction Director

Primary question:

> Does participation create meaning or merely create work?

Evaluates:

- purposeful interaction;
- agency;
- responsiveness;
- discoverability;
- device fit.

### Conversion Director

Primary question:

> Does the experience eventually help the business without compromising the idea?

Evaluates:

- proof placement;
- CTA timing;
- friction;
- high-intent utility;
- audience confidence.

### Production Director

Primary question:

> Are we spending effort where people will notice?

Evaluates:

- feasibility;
- asset dependencies;
- budget concentration;
- performance cost;
- production risk;
- schedule risk.

### Mobile / Accessibility Director

Primary question:

> Does the concept survive without desktop spectacle?

Evaluates:

- mobile equivalence;
- reduced motion;
- keyboard/semantic integrity;
- hierarchy retention;
- alternative media.

### Cultural Context Director

Primary question:

> Is any symbolism, reference, trope or representation contextually careless or misleading?

Evaluates:

- cultural meaning;
- geographic context;
- stereotype risk;
- appropriateness of references;
- client-market context.

### Client Advocate

Primary question:

> Can the client understand, defend and buy this idea?

Evaluates:

- explanation clarity;
- connection to brief;
- stakeholder objections;
- proof of rationale;
- revision resilience.

### Skeptic

Primary question:

> What is mediocre, unnecessary, derivative or dishonest about this?

The Skeptic is explicitly rewarded for finding reasons to reject.

---

# 11. Evaluation framework

Do not use one opaque score.

## 11.1 Primary creative dimensions

Every territory receives separate scores for:

```text
Novelty
Value / usefulness
Brand adherence
Emotional resonance
Aesthetic coherence
Conceptual clarity
Memorability
Distinctiveness
Audience relevance
Structural expression
Motion/camera justification
Interaction purpose
Production feasibility
Mobile integrity
Commercial alignment
Portfolio novelty
Asset realism
```

## 11.2 Hierarchical evaluation

Not every score should compensate for another.

Some failures are fatal.

Example:

```text
Novelty            9.4
Aesthetic          9.1
Brand adherence    4.8
```

This should not average into a respectable 7.8.

It should fail because the idea does not belong to the client.

## 11.3 Hard gates

Suggested minimums for production lock:

```text
Conceptual clarity      >= 8.5
Brand adherence         >= 8.5
Distinctiveness         >= 8.5
Portfolio novelty       >= 8.0
Production feasibility  >= 7.5
Mobile integrity        >= 7.5
No unresolved blocker   required
```

Signature/Flagship tiers should use stricter thresholds.

---

# 12. Divergence Engine

Generating three variations of one idea is not divergence.

Director should use deliberate ideation operators.

## 12.1 Territory operators

### Truth amplification

Take the strongest brand/product truth and exaggerate it into the experience model.

### Inversion

Ask what the category normally does, then test the opposite.

### Constraint as concept

Use a real limitation as the organizing device.

### Spatial metaphor

Translate an abstract promise into movement/space.

### Temporal metaphor

Translate the idea into change over time.

### Material metaphor

Express the thesis through transformation of material/light/surface.

### Interface as concept

Make navigation/interaction itself prove the idea.

### Evidence-led concept

Build the narrative entirely around proof.

### Cultural analogy

Borrow an organizing principle from film, exhibition, music, architecture, publishing or performance.

### Radical simplification

Remove everything except the one gesture that carries the idea.

### Counterfactual

Ask how the site would behave if the brand's central truth were literally true in the interface.

### Anti-category

Explicitly remove the category's three most common visual behaviors and ideate from the remaining space.

## 12.2 Territory diversity requirement

The three initial territories must differ in at least four of:

- concept;
- narrative model;
- spatial model;
- interaction model;
- camera grammar;
- motion grammar;
- visual hierarchy;
- signature mechanism;
- emotional arc.

If they differ primarily in styling, regenerate.

---

# 13. Creative Debate Protocol

Territories must survive debate before recommendation.

## Round 1 — Independent generation

Generate three territories without access to each other's wording.

## Round 2 — Specialist critique

Each Council role independently critiques each territory.

## Round 3 — Defense

Each territory receives a constrained defense:

- strongest reason it deserves production;
- strongest answer to the Skeptic;
- what it would remove to become clearer;
- what new asset it most needs.

## Round 4 — Revision

Each surviving territory may make one revision pass.

## Round 5 — Pairwise tournament

Compare A vs B, B vs C, A vs C across the primary dimensions.

## Round 6 — Hybrid prohibition test

Do not automatically merge the top ideas.

A hybrid is allowed only if it creates a stronger singular thesis rather than compromise.

## Round 7 — Adversarial final review

The winning territory is attacked again by Skeptic, Production, Brand and Client Advocate.

## Round 8 — Lock or reject

Possible outputs:

```text
LOCK
REVISE
RESEARCH REQUIRED
ASSET BLOCKED
REJECT ALL / GENERATE NEW ROUND
```

---

# 14. Kill Gate

Director must be allowed to conclude that none of the ideas are good enough.

## 14.1 Automatic kill conditions

Reject a territory if any of the following are materially true:

- memory statement could fit many competitors;
- thesis is just a visual treatment;
- signature moment is an effect without strategic meaning;
- idea depends entirely on desktop/3D spectacle;
- client brand truth is barely visible;
- concept cannot influence structure;
- concept cannot influence motion/camera/interaction in a meaningful way;
- strongest decision repeats a recent Forge project;
- concept requires unavailable assets with no realistic production path;
- the idea cannot explain its connection to business objective;
- the territory is only a category cliché with better polish;
- mobile version loses the central idea;
- concept has no clear restraint/no-go logic;
- the why ladder breaks within three steps;
- the final result would still work after swapping client logo/copy/colors.

## 14.2 Kill output

```text
DIRECTOR VERDICT: REJECTED

Fatal issue:
Execution-led, not concept-led.

Supporting evidence:
- structure unchanged from category default
- signature is generic product orbit
- no client-specific distinctive asset used

Required next round:
Generate from brand truth + material behavior, not product category.
```

---

# 15. Why Ladder

Every major creative decision should contain a causal justification.

Required chain:

```text
Decision
→ Creative reason
→ Brand reason
→ Audience reason
→ Emotional reason
→ Medium reason
→ Production reason
```

Example:

```text
Decision:
Map vertical scroll to ascent.

Creative reason:
The experience is about rising above the city.

Brand reason:
Height/view/privacy are core property value signals.

Audience reason:
Prospective buyers need to imagine the perceptual difference of higher floors.

Emotional reason:
Ascent changes orientation into aspiration.

Medium reason:
Scroll is naturally directional and continuous.

Production reason:
The building asset supports a continuous facade path without requiring a new environment.
```

If the ladder becomes:

```text
Decision: orbit the building
Reason: it looks cinematic
```

Director should flag it.

---

# 16. Originality Engine

Originality is not style variation.

## 16.1 Originality fingerprint

Score independently:

- conceptual novelty;
- narrative novelty;
- spatial novelty;
- interaction novelty;
- motion novelty;
- camera novelty;
- compositional novelty;
- typography-behavior novelty;
- signature-mechanism novelty;
- portfolio novelty;
- category novelty.

## 16.2 Novelty without value is not enough

Director should explicitly reject novelty that harms:

- comprehension;
- usability;
- brand fit;
- product truth;
- conversion;
- performance;
- accessibility.

## 16.3 Novelty source explanation

Every high originality score must state where novelty actually comes from.

---

# 17. Category Cliché Intelligence

Director needs explicit category-default knowledge.

## 17.1 Cliché catalogs

Maintain per-category patterns across:

- color;
- type;
- composition;
- hero treatment;
- camera;
- motion;
- structure;
- interaction;
- language;
- transitions;
- imagery;
- sound.

## 17.2 Cliché density

Example:

```text
CATEGORY CLICHÉ SCAN — AI SaaS

Detected:
✓ dark background
✓ purple gradient
✓ floating dashboard
✓ glowing sphere
✓ particle field
✓ "intelligence" reveal

Density: 6/10

Verdict:
Too dependent on category codes.
Retain dashboard proof; remove sphere/particles; rebuild hero around workflow collapse.
```

## 17.3 Cliché exception

A familiar convention may remain when it improves fluency or brand recognition.

Director must explain why it is being kept.

---

# 18. Distinctive Brand Asset Intelligence

Director should recognize and protect brand assets that already have memory value.

Examples:

- shapes;
- symbols;
- characters;
- sound cues;
- colors;
- type behaviors;
- materials;
- product silhouettes;
- verbal devices;
- recurring motion behaviors.

For each asset:

```text
Recognition value
Ownership strength
Strategic relevance
Creative adaptability
Current usage
Risk of dilution
```

Director should distinguish innovation from unnecessary reinvention.

---

# 19. Reference Deconstruction Engine

Mood boards are insufficient.

Every provided reference should be decomposed.

```text
Reference
├─ what problem it solves
├─ strongest principle
├─ strongest execution device
├─ emotional effect
├─ transferable lesson
├─ context dependency
├─ surface traits
├─ what should not be copied
└─ similarity risk
```

Output example:

```text
REFERENCE A

Learn:
- stillness before reveal
- single dominant visual subject
- navigation stays quiet

Do not copy:
- monochrome palette
- serif choice
- horizontal image rail

Transfer:
Use contrast in pacing, not visual styling.
```

---

# 20. Concept Stress-Test Lab

Before lock, Director should deliberately break the concept.

## 20.1 Required tests

### No-3D test

Does the thesis still exist without WebGL?

### Mobile test

Does the central idea survive a narrow screen and simplified motion?

### Reduced-motion test

Does meaning remain when cinematic movement is reduced?

### Half-budget test

What remains if production resources are cut by 50%?

### Double-content test

Does structure remain coherent if content volume doubles?

### Weak-asset test

Can the concept survive if the best hero asset is removed?

### Brand-swap test

Would this work for a competitor after changing logo/copy/colors?

### Signature-removal test

Is there still a compelling project without the hero trick?

### Skeptical-client test

Can the idea be explained in 60 seconds to a stakeholder who does not care about animation?

### Utility test

Can high-intent visitors still complete the task quickly?

### Time test

Does the concept remain strong if a visitor only sees 20% of the experience?

### Performance test

Does the idea remain intact under the project's hard performance budget?

## 20.2 Stress result

Each test returns:

```text
PASS
PASS WITH DEGRADATION
REQUIRES REVISION
FATAL
```

---

# 21. Audience Simulation

Director needs an audience model, but it must not pretend to predict real people with certainty.

Use audience simulations as critique lenses, not factual forecasts.

## 21.1 Audience lenses

Examples:

- first-time visitor;
- returning/high-intent visitor;
- skeptical buyer;
- technical evaluator;
- luxury buyer;
- time-poor executive;
- mobile visitor;
- accessibility/reduced-motion user.

Each asks:

```text
What do I notice first?
What confuses me?
What creates trust?
What creates desire?
What feels like friction?
What proof am I missing?
What would make me leave?
```

## 21.2 Evidence rule

Audience simulation outputs are hypotheses unless supported by research or observed behavior.

---

# 22. Creative Ceiling Model

Director should estimate the maximum creative quality realistically achievable under current conditions.

## Inputs

- brief clarity;
- brand differentiation;
- available assets;
- asset quality;
- production tier;
- schedule;
- content readiness;
- concept strength;
- technical feasibility;
- client constraint load.

## Output

```text
CURRENT CREATIVE CEILING: 8.1 / 10

Primary constraints:
- no hero-grade interior asset
- weak differentiator evidence
- signature sequence depends on unavailable transition geometry

Highest-leverage upgrades:
1. commission interior hero environment
2. obtain verified product/material detail
3. rewrite brand truth with client

Projected ceiling after upgrades: 9.2
```

This score must be treated as an internal estimate, not objective truth.

---

# 23. Asset Imagination Gap

Director should compare:

```text
assets we have
vs
assets the concept requires
```

## Asset classes

```text
hero-critical
signature-critical
proof-critical
supporting
utility
optional
```

## Production decisions

```text
use
upgrade
re-edit
replace
create
omit
```

## Gap output

```text
Signature concept requires:
✓ product master GLB
✓ macro texture set
✗ internal mechanism detail
✗ dark studio HDR

Creative consequence:
Current signature moment cannot exceed 7.4/10 without at least one missing critical asset.
```

---

# 24. Production ROI Brain

Director should allocate effort based on visible creative leverage.

## 24.1 Leverage calculation inputs

- emotional importance;
- visibility;
- uniqueness;
- current weakness;
- production cost;
- asset dependencies;
- reuse across project;
- effect on conversion/trust;
- effect on portfolio value.

## 24.2 Output

```text
NEXT $1K OF PRODUCTION EFFORT

1. Signature sequence polish      leverage: very high
2. Hero typography refinement    leverage: medium
3. Additional amenity animation  leverage: low

Recommendation:
Do not animate amenities. Spend the effort on the signature transition.
```

---

# 25. Decision Ledger

Every major creative decision should be persistent.

```ts
interface CreativeDecision {
  id: string;
  status: "proposed" | "locked" | "revised" | "rejected" | "superseded";
  decision: string;
  whyLadder: string[];
  evidenceIds: string[];
  affectedSystems: string[];
  rejectedAlternatives: Array<{ decision: string; reason: string }>;
  author: string;
  approvedBy?: string;
  createdAt: string;
  supersedes?: string;
}
```

Example:

```text
DECISION 014 — LOCKED

Use fixed horizon during the architectural ascent.

Reason:
Stable horizon preserves monumentality and prevents the tower from reading like a product turntable.

Rejected:
Free orbit.

Affected:
Camera scenes 02–05.
```

Production systems should be able to query locked decisions before modifying a scene.

---

# 26. Client Review Intelligence

Creative direction often fails not because the idea is weak, but because review becomes subjective and fragmented.

Director should help prepare the idea for client review.

## 26.1 Objection simulation

For each territory predict likely stakeholder questions:

- Why this idea?
- Why isn't X more prominent?
- Why so little/much motion?
- Where are the amenities/features?
- Why this font/color?
- Will this work on mobile?
- Is this too risky?
- What does this improve for our business?

## 26.2 Defense packet

Director should produce:

```text
Decision
Brief connection
Audience benefit
Brand benefit
Evidence
Tradeoff
Fallback option
```

## 26.3 Revision classification

Client feedback should be categorized as:

```text
factual correction
business constraint
brand constraint
content request
preference
stakeholder politics
usability concern
creative disagreement
scope change
```

Director should not treat all feedback as equal evidence against the concept.

---

# 27. Trend and Cultural Context Intelligence

Director should be aware of current creative conventions without blindly following them.

## 27.1 Trend knowledge

Track:

- common web aesthetics;
- common interaction devices;
- type trends;
- 3D trends;
- camera/motion tropes;
- AI-generated visual clichés;
- industry visual codes.

## 27.2 Trend rule

A trend may be used when it supports the thesis or brand.

Trend use without strategic reason decreases originality score.

## 27.3 Cultural context

References using cultural symbols, rituals, geography or historical material should receive a context review before lock.

---

# 28. Mid-Production Continuous Critic

Director remains active after pre-production.

## 28.1 25% review — Thesis visibility

Questions:

- Can we already see the core idea?
- Are we building the right thing?
- Is any early work drifting into generic Forge patterns?

## 28.2 50% review — Coherence

Questions:

- Do structure, typography, camera, motion and assets express one idea?
- Is production effort correctly concentrated?
- Has any supporting moment become stronger than the signature moment accidentally?

## 28.3 75% review — Distinction

Questions:

- Does this look unmistakably like this client?
- Is the signature genuinely memorable?
- Has the experience become too dense?

## 28.4 90% review — Subtraction

Questions:

- What should be removed?
- Which effect exists only because Forge can do it?
- Where can stillness improve contrast?

## 28.5 Final Cut

Questions:

- What would an elite studio cut?
- What remains unexplained or unjustified?
- Would this enter the portfolio?
- Does it collide with a previous Forge project?
- Is the mobile experience still the same idea?

---

# 29. Portfolio Strategy Layer

Director should understand that every project also changes the studio portfolio.

It should ask:

- Does this project prove a capability we already prove well?
- Does it expand the portfolio into a new creative territory?
- Is this another version of our existing best work?
- What single screenshot/sequence would represent this project in the portfolio?
- Would a prospective client understand why this work is different?

Flagship projects should aim to increase portfolio breadth, not only project quality.

---

# 30. Post-Launch Learning Loop

Director should learn from outcomes carefully.

## 30.1 Inputs

Potential signals:

- client territory selection;
- number/type of revisions;
- decisions repeatedly challenged;
- production hours;
- asset spend;
- performance outcomes;
- QA failures;
- engagement metrics;
- conversion metrics when available;
- stakeholder praise/complaints;
- awards/editorial recognition;
- portfolio inquiries attributed to the project;
- internal postmortem notes.

## 30.2 Learning rule

Do not equate correlation with creative causation.

Store outcomes as evidence with confidence levels.

Example:

```text
Observation:
Projects using physical arrival concepts had fewer client narrative revisions.

Sample:
3 projects

Confidence:
Low

Action:
Treat as a hypothesis, not a rule.
```

---

# 31. Human Calibration and Judge Reliability

Because AI critics may be over-generous or too consistent, Director needs judge calibration.

## 31.1 Calibration set

Maintain a curated set of:

- exceptional directions;
- good-but-generic directions;
- visually impressive but strategically weak directions;
- feasible but boring directions;
- original but unusable directions;
- clearly poor directions.

Humans provide benchmark ratings and pairwise rankings.

## 31.2 Council calibration

Regularly test whether Council roles:

- inflate scores;
- collapse toward consensus too quickly;
- fail to detect known generic ideas;
- over-penalize unconventional work;
- over-index on feasibility;
- over-index on novelty.

## 31.3 Disagreement is useful

Director should preserve meaningful disagreement.

Example:

```text
ECD: 9.2 — unusually strong concept
Production: 6.8 — high asset risk
Client Advocate: 7.1 — explanation currently too abstract

Verdict:
REVISE, not reject.
```

Do not average away the reason for disagreement.

---

# 32. Director Modes

Director should support explicit modes depending on the task.

```text
DISCOVERY
DIVERGE
DEBATE
CRITIQUE
KILL
REPAIR
PRODUCTION REVIEW
FINAL CUT
POSTMORTEM
```

## DISCOVERY

Clarify evidence, unknowns, references and brand truth.

## DIVERGE

Generate conceptually different territories.

## DEBATE

Council review and pairwise tournament.

## CRITIQUE

Evaluate a supplied direction.

## KILL

Attempt to disqualify a concept.

## REPAIR

Improve a direction while preserving its strongest truth.

## PRODUCTION REVIEW

Compare current build to locked decisions.

## FINAL CUT

Subtraction and portfolio readiness.

## POSTMORTEM

Extract lessons after launch.

---

# 33. Director Intelligence data contracts

Suggested modules:

```text
src/platform/director-intelligence/
  evidence.ts
  memory.ts
  precedents.ts
  portfolioMemory.ts
  taste.ts
  divergence.ts
  council.ts
  evaluation.ts
  originality.ts
  cliches.ts
  stressTests.ts
  ceiling.ts
  assetGap.ts
  productionLeverage.ts
  decisionLedger.ts
  clientReview.ts
  continuousCritic.ts
  learning.ts
  calibration.ts
```

Persisted data:

```text
config/director/
  treatment.json
  evidence.json
  decisions.json
  critique.json
  fingerprints.json
  review-history.json
```

Studio-level intelligence:

```text
forge-intelligence/
  precedents/
  projects/
  taste/
  calibration/
  category-patterns/
```

---

# 34. Director Studio UX

The Director room should evolve into a real creative review environment.

## 34.1 Main views

### Brief

Facts, unknowns, evidence confidence, asset inventory.

### Territories

Three divergent concepts, not styling options.

### Debate

Council opinions, disagreements, defenses and revisions.

### Memory

Relevant precedents, prior Forge projects, similarity risks.

### Originality

Fingerprint and cliché scan.

### Stress Lab

Mobile, budget, no-3D, brand-swap and other tests.

### Production

Creative ceiling, asset gap, effort allocation.

### Decisions

Locked ledger.

### Review

25/50/75/90/final-cut checkpoints.

### Learn

Client feedback and post-launch lessons.

## 34.2 No score-wall UI

Scores must support decisions, not replace judgment.

The UI should prioritize:

- recommendation;
- rationale;
- disagreement;
- blockers;
- decisions;
- evidence;
- what to change next.

---

# 35. AI execution architecture

Director Intelligence should use AI for tasks where open-ended reasoning is valuable, but deterministic Forge code remains authoritative for contracts and gates.

## AI is strong for

- precedent interpretation;
- cross-domain analogies;
- territory ideation;
- critique language;
- why ladders;
- client-objection simulation;
- reference deconstruction;
- postmortem synthesis.

## Deterministic Forge remains authoritative for

- schema validation;
- project history retrieval;
- similarity calculations;
- thresholds;
- hard kill gates;
- budget totals;
- asset existence;
- command execution;
- decision-lock enforcement;
- Structure/Creative Plan compilation;
- provenance integrity.

## Rule

AI may propose.

Forge validates and decides whether the proposal is eligible for lock.

---

# 36. Research Agent

Signature and Flagship projects should optionally run a research pass before territory generation.

The research agent may gather:

- category conventions;
- competitor positioning;
- cultural/location context;
- current visual trends;
- relevant creative precedents;
- distinctive brand assets;
- audience language;
- product/technical facts from authoritative sources.

Every research finding must carry provenance.

Research does not automatically become direction.

Director decides what matters.

---

# 37. Quality and safety rules

Director must never:

- invent client facts;
- invent performance claims;
- invent awards/testimonials;
- infer proprietary facts from weak evidence;
- copy a reference's distinctive execution;
- treat popularity as quality;
- treat novelty as usefulness;
- treat human preference history as a command to repeat prior aesthetics;
- hide Council disagreement behind one average score;
- approve a concept merely because all schema fields are filled;
- silently weaken kill gates to produce an answer.

---

# 38. Core CLI / automation surfaces

Suggested commands:

```text
npm run director:discover
npm run director:precedents
npm run director:diverge
npm run director:debate
npm run director:critique
npm run director:kill
npm run director:stress
npm run director:similarity
npm run director:ceiling
npm run director:assets
npm run director:production
npm run director:review -- 50
npm run director:final-cut
npm run director:postmortem
npm run director:calibrate
```

One orchestration command:

```text
npm run director:intelligence -- brief.json
```

should execute the allowed sequence and stop automatically at required human gates.

---

# 39. Required human gates

Director should automate aggressively but preserve human authority at high-value moments.

Required explicit approvals:

1. brand truth / brief interpretation when uncertain;
2. territory lock;
3. major scope/asset-spend increase;
4. locked decision reversal;
5. final-cut approval.

Everything else may be automated/dry-run according to Forge command safety rules.

---

# 40. Build phases

## Phase 0 — Baseline and corpus

- fingerprint existing Forge projects;
- create first precedent corpus;
- create category cliché catalogs;
- build human calibration set;
- define creative evaluation dimensions.

Exit gate:

Director can retrieve prior work and identify obvious self-repetition.

## Phase 1 — Memory + similarity

- Creative Memory Graph;
- portfolio fingerprints;
- precedent retrieval;
- similarity engine;
- reference deconstruction.

Exit gate:

Director can explain relevant precedents and portfolio collision risks.

## Phase 2 — Council + multi-dimensional evaluation

- Council roles;
- independent scoring;
- disagreement model;
- hierarchical hard gates;
- Skeptic.

Exit gate:

A weak-but-polished idea can be rejected despite a high aesthetic score.

## Phase 3 — Divergence + debate

- territory operators;
- independent territory generation;
- defense/revision;
- pairwise tournament;
- reject-all outcome.

Exit gate:

Director can generate three structurally different ideas and refuse all three.

## Phase 4 — Originality + cliché + stress

- originality fingerprint;
- category cliché engine;
- brand-swap test;
- no-3D/mobile/budget/content stress lab;
- why ladder.

Exit gate:

Director can distinguish different-looking from different-thinking.

## Phase 5 — Production intelligence

- creative ceiling;
- asset imagination gap;
- production leverage ranking;
- decision ledger;
- client defense packet.

Exit gate:

Director can explain exactly where additional budget/effort should go and why.

## Phase 6 — Continuous critic

- 25/50/75/90/final reviews;
- production drift detection;
- locked-decision validation;
- portfolio final test.

Exit gate:

Director remains useful after pre-production.

## Phase 7 — Taste calibration + learning

- pairwise human preference capture;
- taste profile;
- judge calibration;
- client feedback learning;
- postmortem/outcome memory.

Exit gate:

Director becomes measurably better aligned to studio standards without increasing portfolio repetition.

---

# 41. Parallel implementation lanes

## Lane A — Knowledge

```text
precedent schema
→ corpus tools
→ memory graph
→ retrieval
→ reference deconstruction
```

## Lane B — Judgment

```text
evaluation axes
→ Director Council
→ disagreement
→ kill gates
→ calibration
```

## Lane C — Originality

```text
project fingerprints
→ similarity
→ cliché catalogs
→ originality engine
→ portfolio collision
```

## Lane D — Production intelligence

```text
asset gap
→ creative ceiling
→ leverage allocation
→ decision ledger
→ continuous critic
```

## Lane E — Learning

```text
human preference capture
→ taste profile
→ client feedback
→ postmortem
→ outcome memory
```

Integration order:

```text
Memory
→ Council
→ Divergence/Debate
→ Originality/Stress
→ Production Intelligence
→ Continuous Critic
→ Learning
```

---

# 42. Test corpus

Director needs adversarial creative tests, not only schema tests.

Include fixtures for:

1. beautiful but generic luxury property;
2. original but impossible automotive concept;
3. feasible but boring SaaS direction;
4. highly branded but unusable commerce experience;
5. derivative concept copied from a precedent;
6. concept too similar to previous Forge project;
7. idea that only works with 3D;
8. great desktop concept that collapses on mobile;
9. weak assets with a strong brief;
10. strong assets with a weak brief;
11. category-cliché overload;
12. concept with excellent aesthetics but weak brand truth;
13. client-preferred concept that Council believes is weaker;
14. unconventional concept initially disliked by feasibility critic but strong after revision;
15. all-three-territories-should-be-rejected case.

Each fixture should have expected reasoning and disposition, not merely expected numeric score.

---

# 43. Director Intelligence scorecard

Track platform maturity using:

```text
Portfolio collision detection accuracy
Known-generic fixture rejection rate
False rejection rate on approved strong concepts
Council score calibration vs human panel
Pairwise preference agreement
Council disagreement quality
Unsupported-claim rate
Precedent transfer diversity
Cross-industry precedent usage
Territory structural diversity
Kill-gate activation rate
Mobile stress pass rate
Production drift detection
Locked decision violation count
Creative revision count per project
Client concept-round count
Production hours vs tier
Post-launch lesson confidence
```

Do not optimize for "higher average Director score."

A mature Director should sometimes score lower because it has become harder to impress.

---

# 44. Definition of advanced maturity

Director Intelligence reaches advanced maturity when the following end-to-end scenario works:

1. ingest a real brief and assets;
2. distinguish facts, assumptions and unknowns;
3. retrieve relevant precedents across multiple mediums;
4. retrieve similar Forge projects and identify collision risk;
5. generate three genuinely different territories;
6. Council critiques independently;
7. Skeptic attempts to kill all three;
8. territories revise/defend themselves;
9. pairwise tournament identifies the strongest candidate—or rejects all;
10. originality/cliché engine explains what is genuinely new;
11. brand-distinctiveness review confirms client ownership;
12. why ladder justifies major decisions;
13. stress lab proves mobile/no-3D/half-budget resilience;
14. asset-gap and creative-ceiling models identify blockers;
15. Production Director allocates effort to the highest-leverage moments;
16. human explicitly locks the territory;
17. decision ledger protects the thesis during production;
18. 25/50/75/90 reviews catch creative drift;
19. final cut removes work that weakens the idea;
20. postmortem writes evidenced lessons back into creative memory;
21. future projects retrieve those lessons without copying the execution.

---

# 45. Final principle

The goal is not to make Director generate more impressive language.

The goal is to build a system that develops **taste through evidence, memory, disagreement, rejection and learning**.

Director should increasingly be able to say:

```text
This is beautiful, but generic.
This is original, but strategically wrong.
This is feasible, but forgettable.
This is memorable, but depends on an asset we do not have.
This is strong, but too similar to Heliot.
This is expensive in the wrong places.
This is the strongest concept, but it needs another round before lock.
None of these are good enough.
```

That ability to reject convincingly is a more important sign of creative maturity than the ability to generate endlessly.

The operating rule for Forge Director Intelligence is:

> **Do not optimize for producing an answer. Optimize for producing work that survives expert criticism, belongs uniquely to the client, earns its production cost and expands the Forge portfolio.**

---

# 46. Research basis

The specification draws on several established ideas that should inform implementation rather than be copied mechanically:

- expert design critique research distinguishing originality, functional/usefulness and aesthetic reasoning;
- contemporary AI creativity-evaluation work showing the value of multi-dimensional judging and the risk of score inflation / low dispersion;
- case-based design and precedent-knowledge research organizing prior designs around problems, concepts and forms;
- creative-effectiveness research emphasizing simplicity, distinctiveness, memory and durable brand assets;
- Forge's existing Director, Structure, Creative Plan, engineering-core, command-safety and production-audit architecture.

The research should be used as a design foundation. Forge's actual judgment model must be calibrated against real studio decisions and real project outcomes over time.
