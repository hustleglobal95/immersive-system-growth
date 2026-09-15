# Forge Motion Super System

Forge's motion layer is intentionally additive. External creative-web repositories are treated as pattern donors, not replacement architectures.

## Donor decisions

### AETHER

Useful patterns retained:

- centralized motion vocabulary rather than one-off easing choices
- reusable typography reveal and parallax primitives
- reduced-motion-safe motion behavior
- composable client-site motion patterns

Patterns not copied into Forge:

- separate Framer Motion dependency for behaviors GSAP already handles
- replacement smooth-scroll architecture
- replacement R3F canvas lifecycle
- starter-site content and styling conventions

Forge already owns those concerns through its persistent Canvas, Lenis integration, sequencer, interaction graph and quality systems.

### Theatre.js

Useful design principles retained:

- visual sequencing as a first-class authoring workflow
- arbitrary animated properties represented as editable tracks
- reusable curves and high-fidelity timing control
- programmatic output that remains deterministic outside the editor

Forge does not add Theatre Studio as a dependency. Forge already has a native sequencer and avoids introducing an AGPL editor dependency into the authoring stack. The design ideas are applied to Forge's existing track/keyframe model instead.

### Awwwards Motion

Useful concepts retained:

- motion treated as a system rather than isolated effects
- shader/post-processing techniques used only where they materially improve perception
- depth, parallax and environmental motion as compositional tools
- performance-aware separation between DOM, WebGL and GPU-heavy effects

Forge deliberately rejects the rule that every motion should use spring/elastic behavior. Cinematic scrubbed motion must remain reversible and deterministic, and architectural/product work often benefits from controlled mechanical curves rather than overshoot.

## House motion language

`src/platform/motionLanguage.ts` defines reusable motion curves, energy levels and deterministic stagger distributions.

House curves:

- `editorial`: premium reveal and settle
- `cinematic`: strong compression/release transitions
- `mechanical`: assembly and construction
- `glide`: low-pressure continuous movement
- `settle`: soft arrival
- `linear`: scrub-bound progress

Energy levels:

- `still`
- `restrained`
- `confident`
- `expressive`

These are descriptive constraints for direction and authoring, not excuses to add movement. The default premium mode is `restrained`.

## Motion archetypes

`src/platform/motionArchetypes.ts` composes existing Forge camera choreography and motion tracks into higher-level director moves.

### editorial-reveal

Use for restrained hero copy, architectural headlines, chapter openings and premium editorial transitions.

Combines:

- precision camera pressure
- copy rise
- copy depth/blur recovery

### parallax-story

Use when foreground/background separation is important and the camera should reveal depth laterally.

Combines:

- parallax truck camera choreography
- DOM copy reveal
- optional media reveal
- depth recovery

### threshold-passage

Use for doors, glazing, tunnels, portals and exterior-to-interior transitions.

Combines:

- forward camera commitment
- exposure adaptation
- copy handoff
- optional media reveal

### architectural-build

Use for buildings, spatial assemblies and structured construction reveals.

The archetype groups semantically named GLB nodes into ordered phases:

1. foundation / podium
2. core / structural frame
3. floors / slabs
4. facade / glass / curtain wall
5. balconies / architectural detail
6. roof / crown / mechanical
7. landscape / pool / site furniture

Numbered nodes are ordered numerically so `floor-02` is guaranteed to precede `floor-10`.

Every assembly track is normalized to `0..1`, reversible and deterministic. Position offsets use additive rig motion so the authored model's true rest transform remains authoritative.

### product-hero

Use for watches, automotive details, furniture, fashion objects and other premium product presentation.

Combines:

- macro camera approach
- product lift
- restrained light response
- material roughness settle
- copy reveal

## DOM motion primitives

Forge now exposes reusable primitives under `src/components/motion`.

### CinematicTextReveal

GSAP SplitText masked line/word/character reveal with automatic cleanup and reduced-motion fallback.

### ParallaxLayer

ScrollTrigger-driven reversible x/y parallax. Scrub-bound movement uses `ease: none` by design.

### MagneticSurface

Fine-pointer-only magnetic UI treatment for premium CTAs and controls. It disables itself for touch-first devices and reduced-motion users.

## Creative compiler integration

Creative plans can specify:

```json
{
  "runtime": {
    "motionArchetype": "architectural-build",
    "motionPreset": "cinematic-focus",
    "actions": []
  }
}
```

When `motionArchetype` is present, the creative compiler generates the archetype's tracks. Existing hand-authored tracks remain authoritative: generated tracks targeting a property already authored in the scene are skipped rather than overwritten.

This preserves Forge's core rule: automation may accelerate authoring but never silently destroy intentional work.

## Prompt integration

`npm run creative:prompt` now publishes the executable Forge motion vocabulary inside the master art-direction prompt. A model is instructed to select an existing Forge-native archetype or camera choreography whenever it satisfies the visual direction.

This closes the gap between creative language and runtime language:

`art direction -> Forge vocabulary -> deterministic tracks -> Studio refinement -> production runtime`

## Audit

Run:

```bash
npm run motion:systems:audit
```

The audit verifies:

- house cubic curves
- stagger distributions
- normalized keyframe ranges
- sorted keyframe timing
- duplicate target conflicts inside composed archetypes
- archetype generation across every configured scene

The audit is part of `npm run check`.

## Rules for future donor repos

Only import a pattern when all of the following are true:

1. Forge does not already have a stronger equivalent.
2. The pattern can remain deterministic and reversible when required.
3. It has an explicit mobile/reduced-motion strategy.
4. It does not create a second competing camera, scroll, timeline or scene-state architecture.
5. It can be represented through Forge's schemas and audits.
6. It improves authoring speed, output quality or performance measurably.
7. Its license permits the intended use or the idea is reimplemented independently rather than copied.

The goal is not to accumulate libraries. The goal is to make Forge a stronger motion-design operating system.
