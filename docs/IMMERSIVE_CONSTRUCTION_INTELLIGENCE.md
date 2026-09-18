# Immersive Construction Intelligence

Forge already has the runtime systems required to build high-end immersive websites. This document defines the missing layer: **construction knowledge**.

The objective is not to add another animation library or replace Forge's cinematic architecture. The objective is to make Director understand how strong immersive sites are composed so it can choose the right existing Forge systems with much less trial and error.

The current research base contains **196 evidence-graded references** and **98 executable construction patterns**. Reference selection is source-diversified and recurring patterns are ranked by evidence strength plus independent source support rather than by a single favorite studio.

## Operating rule

When a reference is supplied, do not ask "what library made this?"

Ask:

1. What is the visual hierarchy?
2. Which elements establish depth?
3. What stays persistent?
4. What changes with scroll?
5. What changes with pointer input?
6. What is DOM, what is WebGL, and why?
7. What physical or editorial rule explains the transition?
8. Where is the highest-intensity moment?
9. What is deliberately still?
10. How does the concept survive on mobile?

Only after answering those questions should implementation choices be made.

## Reference-to-construction pipeline

```text
reference
  -> deconstruct visible behavior
  -> identify construction principles
  -> separate transferable principle from surface styling
  -> map principles to Forge-native systems
  -> write scene and motion plan
  -> implement with the existing runtime
  -> test forward, reverse, mobile and reduced motion
  -> measure cold-scroll and steady-state performance
```

A reference is evidence about **composition and behavior**, not a dependency recommendation.

## Construction dimensions

### 1. Composition

Describe the frame before describing animation.

Record:

- dominant subject
- copy region
- negative space
- foreground / midground / background
- overlap and occlusion
- crop strategy
- alignment system
- density changes between chapters
- whether the page uses one persistent stage or independent sections

Premium immersive work normally has a clear visual hierarchy. Equal-size cards with equal motion are a fallback, not a default.

### 2. Typography

Treat display type as part of the composition.

Record:

- line breaks
- maximum line measure
- relation to the main subject
- whether type sits in front of, behind or beside media
- whether type stays fixed while media travels
- whether motion follows reading order
- whether the typography is the signature moment or supports another one

Essential copy remains semantic DOM.

### 3. Depth

Depth can come from:

- camera perspective
- scale contrast
- parallax
- overlap
- occlusion
- blur/focus
- lighting
- atmospheric perspective
- actual 3D geometry
- video or image crop

Do not use WebGL merely because the reference feels dimensional. Use WebGL when perspective, material, continuous spatial state, distortion or interaction genuinely needs it.

### 4. Motion

Every major movement needs an answer to "why now?"

Classify movement as:

- narrative travel
- subject transformation
- reading guidance
- depth separation
- state change
- interaction feedback
- transition
- atmosphere

Avoid one generic reveal preset across an entire site. Movement at different depths should use different amplitudes and timing.

### 5. Continuity

For every chapter boundary, name the carried element:

- subject
- silhouette
- horizon
- camera direction
- color field
- light direction
- media edge
- typography baseline
- geometry
- sound / atmosphere

A transition with no carried state often reads as two unrelated sections.

### 6. Interaction

Choose the physical quantity the interaction expresses:

- position
- proximity
- velocity
- drag displacement
- orientation
- pressure-like click impulse
- scroll progress

Use damped motion and a controlled return to rest. One strong interaction model is more convincing than several unrelated cursor tricks.

### 7. DOM / WebGL contract

Use DOM for:

- headings
- body copy
- links
- forms
- prices
- menus
- conversion controls
- exact editorial text layout

Use WebGL for:

- depth
- camera
- lighting
- materials
- 3D objects
- particles
- shader fields
- refraction / distortion
- perspective-dependent transitions

Both derive from the same Forge narrative state. Do not create an independent animation clock to imitate a reference.

### 8. Signature moment

Name exactly one highest-intensity moment.

The surrounding chapters should create contrast for it. If every chapter contains maximal camera movement, particles, shader distortion and kinetic type, nothing feels significant.

Spend the highest-quality assets and most expensive rendering budget on the protected signature moment first.

### 9. Mobile translation

Mobile is a re-direction exercise.

Preserve, in this order:

1. concept
2. subject hierarchy
3. signature moment
4. reading order
5. conversion path
6. continuity
7. decorative fidelity

Reduce DPR, particle count, simultaneous movement, travel distance and postprocessing before deleting the immersive idea.

### 10. Performance behavior

The first scroll is part of design quality.

Before the visitor reaches a signature chapter, the required resources should already be ready:

- model parse / decode
- texture upload
- shader program
- postprocessing target
- video decode
- dynamic chunk
- generated geometry or particle buffers

A site that is smooth only on the second pass is not finished.

### 11. Media delivery as interaction infrastructure

When video is scrubbed, dragged or used as a tactile surface, encoding becomes part of interaction design. Keyframe interval, decode complexity and browser seek behavior determine whether the gesture feels direct. Forge should distinguish playback-optimized media from interaction-optimized media.

### 12. Camera input semantics

Scroll is a one-dimensional input. If a scroll-bound camera curves, circles and changes axes continuously, the visitor may expect game-style control that the input cannot provide. Prefer one dominant travel axis per chapter and use deterministic film cuts when a spatial connection would otherwise make the control model ambiguous.

### 13. DCC-to-runtime contracts

Blender/C4D/Houdini are not only asset exporters. Node names, pivots, zones, animation groups and semantic markers can become validated runtime metadata. Forge should preserve those semantics through optimization so art-direction changes do not create brittle hand-maintained mappings.

### 14. Demand-driven computation

Rendering quality is not only about lower resolution. Expensive work should disappear when it cannot change visible pixels: offscreen scenes stop, raycasts wait for dirty input, compute passes run only while their effect is active, deep visual-stack items remain simplified, and worker isolation is reserved for measured main-thread contention.

## Pattern maturity

Not every lesson in the corpus deserves equal authority. Forge now tracks global support for each construction pattern across all reviewed precedents.

Patterns are classified as:

- **emerging** — one reviewed precedent;
- **supported** — at least two reviewed precedents;
- **established** — at least three precedents across at least two independent source hosts;
- **strong** — at least five precedents across at least three independent source hosts.

Director still may use an emerging pattern when it precisely fits a client's idea, but it can distinguish a one-off experiment from a technique repeatedly validated across unrelated productions. Pattern evidence includes both the references retrieved for the current brief and the pattern's global reference/source counts.

## Primary technical doctrine

Creative precedents answer **what construction choices repeatedly work**. Primary technical documentation answers **how the underlying browser/runtime behavior actually works**.

Forge keeps those evidence types separate so official implementation guidance cannot accidentally become a visual style precedent.

The executable doctrine lives in:

`src/platform/director-intelligence/technicalDoctrine.ts`

The current sixteen doctrine groups cover:

1. Three.js shader compilation and GPU resource initialization before first-use.
2. React Three Fiber demand rendering and explicit invalidation.
3. Browser video-frame synchronization with `requestVideoFrameCallback`.
4. OffscreenCanvas/worker isolation for measured main-thread rendering contention.
5. A shared GSAP ticker/heartbeat for systems that must remain phase-locked.
6. Prepared high-frequency setters for measured hot paths.
7. Refresh-rate-independent elapsed-time motion.
8. GPU-friendly texture and mesh compression with decode cost considered alongside transfer size.
9. Draw-call reduction through instancing/batching when object independence allows it.
10. Cinematic media capability selection based on expected decode quality rather than codec support alone.
11. Page-visibility suspension when the document cannot produce visible pixels.
12. Reduced-motion substitution that preserves information and causality.
13. Smoothed audio analysis before audio energy becomes visual motion.
14. Browser view-transition lifecycle treated as a readiness transaction.
15. Renderer-info budgeting for memory and draw work at the exact narrative frame that matters.
16. GSAP responsive motion creation/cleanup as one lifecycle.

When a selected construction pattern overlaps one of these doctrines, its principles are injected into Director implementation rules and its verification checks are compiled into the production performance rules. This means technical research changes the build plan instead of remaining documentation.

## Forge construction patterns

The executable knowledge lives in:

`src/platform/director-intelligence/constructionKnowledge.ts`

Director selects patterns from the treatment and injects their rules into the compiled Creative Plan. These rules augment, not replace, the treatment's original art direction.

The initial pattern set covers:

- continuous visual anchors
- editorial depth stacks
- staged subject heroes
- type/media countermotion
- macro-to-whole rhythm
- spatial galleries
- restrained interactive fields
- threshold passages
- single signature peaks
- explicit DOM/WebGL roles
- mobile concept preservation
- signature-system prewarming

Patterns are construction recipes, not visual presets. They should never encode a proprietary layout, exact palette, typeface or signature interaction from a reference.

## Reference deconstruction format

For every studied immersive site, record:

```text
REFERENCE
Name:
Source:
Date reviewed:

VISUAL LANGUAGE
Dominant subject:
Typography:
Palette behavior:
Composition:
Depth strategy:
Density rhythm:

HERO
DOM:
Media / WebGL:
Camera:
Pointer:
Scroll:
Signature move:

CHAPTERS
For each chapter:
- purpose
- composition
- motion
- carried state
- transition in / out

CONTINUITY
Persistent anchors:
Visual handoffs:
Reverse behavior:

INTERACTION
Input:
Physical quantity:
Damping / return:
Meaning:

IMPLEMENTATION MAP
Forge systems already suitable:
Custom work actually required:
Systems explicitly not required:

MOBILE
What changes:
What must remain:

PERFORMANCE
Likely first-use costs:
What must be prewarmed:

TRANSFERABLE LESSONS
1.
2.
3.

DO NOT COPY
- exact palette
- exact typeface
- proprietary assets
- distinctive branded composition
- signature interaction without transformation
```

## Director behavior

When Director has a reference, it should use the reference to sharpen construction decisions, not to collapse originality.

Good output:

> The reference gets depth from one fixed editorial copy plane against a traveling media plane. Use that principle, but build a different composition around the client's owned hero asset.

Bad output:

> Copy the reference's black background, giant sans-serif, glass sphere and exact scroll timing.

## Relationship to existing Forge architecture

Nothing in this system changes the core target.

The full cinematic path remains available:

- persistent R3F canvas
- custom camera direction
- product rigs
- scene assets
- shader transitions
- motion sequencer
- interaction graph
- Studio authoring
- performance budgets

Construction Intelligence makes those systems easier to direct for immersive marketing sites. It does not turn Forge into a component library and does not make library installation the default answer to a creative problem.
