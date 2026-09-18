# Forge Immersive Reference Corpus

Reviewed: 2026-09-18

This corpus exists to make Forge better at **constructing** premium immersive websites with its existing engine. It is not a mirror of GetLayers, a prompt dump, or a source-code archive.\n\nThe GetLayers set remains one visual corpus inside a broader research system. The combined Director research pool now contains **144 references** across GetLayers, Dogstudio, Lusion, makemepulse, Bonhomme, 14islands and Codrops technical case studies, feeding **81 reusable construction patterns**.

## Evidence policy

Every reference has an explicit evidence level:

- `catalog` — public catalog confirms only name/category/access. No visual or technical traits are invented.
- `visual-preview` — the public GetLayers preview still was inspected directly. Only visible composition/material/typography traits are recorded; motion and implementation are not inferred from a still.
- `public-description` — a public layer description supports construction observations.
- `public-case-study` — an independent public build report supports observations.
- `technical-reference` — public technical documentation identifies implementation patterns associated with the reference.

Only records with supported observations and transferable lessons can influence Director construction decisions. The current corpus therefore gives Director evidence-backed construction access to 48 template previews while leaving the one unresolved preview out of the decision loop.

This prevents a catalog thumbnail or name from turning into made-up design intelligence.

## Visual review coverage

Forge now carries a direct visual deconstruction of **48 of the 49 current public GetLayers template previews**.

The review covers every visible public template preview except **Northwall**. Its public preview image endpoint returned a cache miss during this pass, so Northwall deliberately remains `catalog` evidence rather than receiving guessed construction traits.

The 48 reviewed previews are not treated as proof of hidden implementation. A static still can establish:

- composition and negative-space strategy;
- subject scale and cropping;
- typography/media overlap;
- visible depth planes and occlusion;
- location of proof, CTA and navigation;
- material / atmospheric language;
- whether the frame is DOM/editorial, image/video-led, object-led or procedural-field-led.

A still **cannot** establish:

- scroll timing;
- pointer mechanics;
- shader implementation;
- exact library choice;
- performance architecture;
- reverse-scroll behavior.

Those claims require public descriptions, technical references or direct behavioral inspection.

### Recurring visual patterns found across the 48 previews

The visual pass added or reinforced these transferable construction ideas:

- **subject occludes display type** — visible in AI Creator, Marcus Vane, AI Studio, Clarix and related portrait/object compositions;
- **atmosphere as layout** — House, Longplay, Altitude, Lumea, Halcyon and several spatial product stages use the world itself to determine copy placement;
- **edge utility around a central spectacle** — Vesper, Stride, Auralis, Noema, GringX, Stackside and others push proof/CTA outward while one visual owns the center;
- **technical chrome as world language** — Kimi, Artefakt, Codescan, Fromzero, Evolve, Negantropy and Neural Monitor use grids/HUD/status elements as one coherent framing system;
- **procedural field as hero** — Vesper, New Era, Auralis, Noema, Helion, Evolve, Negantropy, Vexon, Creative Studio, Neural Monitor and Flowstate rely on one large field/form rather than many unrelated effects;
- **object + prop depth staging** — Soda, GringX and related product compositions build depth with one authority object plus a few supporting forms;
- **small subject / large environment** — House, Wanderlust and Altitude create cinematic scale by letting environment dominate;
- **split-stage editorial composition** — Laocoon, Dringle, Kai Nomura and other layouts pair a quiet information plane with a higher-energy visual plane;
- **embedded proof inside the hero** — Stride, Stride Nine, Stackside, Creative Studio, Altitude and others make metrics part of the composition rather than postponing credibility to a later card grid;
- **immersion without mandatory WebGL** — Baseline, Halden, Kai Nomura and other strongly art-directed frames demonstrate that typography, crop, image scale and pacing can carry premium immersion on their own.

The executable observations live in `src/platform/director-intelligence/referenceCorpus.ts`. Director retrieves from them by project type and construction signals, then maps their lessons to Forge-native systems.

## Current GetLayers template catalog

The public GetLayers template library exposed 49 templates on the review date.

### Coverage status

All entries below except **Northwall** have direct visual-preview evidence in the executable corpus. Some also carry a stronger public-description, case-study or technical-reference layer. The stronger evidence augments the visual review; it does not replace it.

### Agency / Studio

- Lumora — free; visual preview + public case-study evidence
- Northwall — premium; catalog-only pending a usable public preview
- House — premium; visual-preview evidence
- Longplay — premium; visual-preview evidence
- Codescan — premium; visual-preview evidence
- Auralis — premium; visual-preview evidence
- Forma — premium; visual-preview evidence
- Lumea — premium; visual-preview evidence
- Fromzero — premium; visual-preview evidence
- Noema — premium; visual-preview evidence
- Helion — premium; visual preview + technical-reference evidence
- Dringle — premium; visual-preview evidence
- Creative Studio — premium; visual-preview evidence
- Gravity — free; visual-preview evidence

### AI / Tech

- AI Studio — premium; visual-preview evidence
- AI Creator — premium; visual-preview evidence
- Evolve — premium; visual-preview evidence
- Clarix — premium; visual preview + technical-reference evidence
- GringX — premium; visual-preview evidence
- Vexon — premium; visual-preview evidence
- Cortex — premium; visual-preview evidence
- Clair — premium; visual-preview evidence

### SaaS

- Vesper — premium; visual-preview evidence
- Ascend — free; visual preview + public-description evidence
- Flowstate — free; visual-preview evidence

### Portfolio

- Creative Director — premium; visual-preview evidence
- Laocoon — free; visual-preview evidence
- Marcus Vane — free; visual-preview evidence
- Kai Nomura — free; visual-preview evidence

### Fintech

- Stride — premium; visual preview + technical-reference evidence
- Lumen — premium; visual-preview evidence
- Stackside — premium; visual-preview evidence

### Health / Science

- New Era — premium; visual-preview evidence
- Dantora — premium; visual-preview evidence
- Negantropy — premium; visual-preview evidence
- Neural Monitor — premium; visual-preview evidence

### E-commerce

- Soda — free; visual-preview evidence
- Halden — premium; visual-preview evidence
- Artefakt — premium; visual-preview evidence
- Halcyon — premium; visual-preview evidence

### Hospitality / Travel

- Brewns — premium; visual-preview evidence
- Wanderlust — premium; visual-preview evidence
- Aerra — premium; visual-preview evidence
- Altitude — premium; visual-preview evidence

### Sports / Education

- Kimi — free; visual-preview evidence
- Baseline — free; visual preview + public-description evidence
- Stride Nine — premium; visual-preview evidence
- Voxelia — premium; visual-preview evidence

### Hero / uncategorized template

- Loopstack — free; visual preview + public-description evidence

The executable list is `src/platform/director-intelligence/referenceCorpus.ts`.


## Corpus-scale synthesis

The purpose of reviewing dozens of references is to stop treating a single successful composition as a universal recipe.

Across the 48 visually reviewed previews, Forge now recognizes **29 reusable construction patterns**. The important shift is from "copy this website" to "identify which construction family solves this brief."

### Repeating composition families

1. **Central spectacle + edge utility** — one object/field owns the center while copy, proof and controls stay at the perimeter.
2. **Subject occluding display type** — large typography creates scale while a portrait/object interrupts it and establishes depth.
3. **Quiet information plane + energetic visual plane** — a split composition preserves clarity beside a high-intensity spatial treatment.
4. **Atmosphere as layout** — landscape, material field, light or environmental geometry determines where copy can live.
5. **Small subject in a large world** — environmental scale creates drama without forcing the subject to fill the viewport.
6. **Object + supporting props** — one authority object stays dominant while a few lower-weight props establish depth and story.
7. **Procedural field as hero** — one coherent particle/fluid/energy structure replaces a collection of unrelated effects.
8. **Immersion without WebGL** — typography, crop, whitespace, image scale and pacing can create premium immersion with little or no 3D.

### Repeating hierarchy rules

- One visual usually owns the frame.
- UI becomes quieter as the signature visual becomes stronger.
- Proof is often embedded near the hero rather than postponed into a generic metrics grid.
- Large type is used as spatial structure, not only as a heading.
- Negative space is treated as an authored element.
- Repeated technical/HUD details work when they form one world language; isolated sci-fi decorations do not.

### Repeating motion implications

Static previews do not prove motion, so motion rules are only promoted when supported by public descriptions or technical evidence. Where that evidence exists, the recurring principles are:

- move/reframe a persistent subject rather than reset it between sections;
- use one normalized progress value for large repeated GPU systems;
- keep cursor response coherent and damped;
- render expensive scenes only when useful;
- prewarm critical 3D/shader states before the signature moment;
- tier fidelity on mobile rather than deleting the concept.

### Director consequence

Director should retrieve several relevant precedents for every treatment, including at least one cross-domain precedent when the production tier is signature/flagship. It should then combine **principles**, not blend visual identities.

For example, a product brief may retrieve:

- Soda for authority-object + prop depth;
- AI Studio for subject/type occlusion;
- Lumen for coherent material world;
- Baseline for pacing restraint.

The resulting site should not look like any one of them. It should use the construction logic that best serves the client's own subject, assets and thesis.

## Deep construction evidence

### Ascend

Public description: a living Earth turns behind a mint-lit SaaS interface while city lights, clouds and radar detail remain attached to the same planet; the planet changes position with scroll.

What Forge learns:

- one persistent spatial world can carry multiple semantic DOM chapters;
- add detail to the same world before adding unrelated objects;
- scroll should reframe or reposition a persistent subject rather than reset it;
- light interface and dark spatial world can coexist through controlled framing/contrast.

Forge mapping:

- persistent R3F Canvas
- normalized experience progress
- camera + hero motion tracks
- semantic DOM copy
- viewport camera overrides

### Loopstack

Public description: a black stage with a flower blooming behind language and a glowing cursor response.

What Forge learns:

- one responsive organic motif can supply immersion without a complicated world;
- typography can remain the dominant semantic plane while shader/particle atmosphere lives behind it;
- cursor behavior should have one coherent visual role.

Forge mapping:

- ShaderSurface / particle field
- pointer uniform or interaction-graph input
- mechanical damping
- DOM typography above Canvas
- mobile autonomous/scroll translation for hover-only behavior

### Baseline

Public description: deep court-blue, strong type and a calm scroll revealing coaching, courts and pedigree one beat at a time.

What Forge learns:

- immersive quality does not require WebGL;
- deliberate sequencing, category-specific art direction and typography can carry the experience;
- visual silence and calm pacing increase authority.

Forge mapping:

- DOM/media composition
- GSAP / deterministic DOM motion
- sticky and mask transitions
- explicit intensity curve
- no 3D unless the brief creates a real need

### Lumora

A public third-party implementation report described the base template as using a large hero brand watermark, a gallery that changes between dark and light states, and an animated statistics section.

What Forge learns:

- one oversized identity signal can anchor the full page;
- tonal state changes can reset attention while preserving the same design system;
- proof sections can participate in the motion grammar rather than interrupt it.

The report also describes a later custom video-inside-type hero. That customization is **not** treated as evidence about the base template.

### Clarix

The public Textura optimization documentation identifies:

- GPU-side scroll interpolation for logo particles using attributes plus one normalized progress uniform;
- an earlier unoptimized shape with raw DPR, unconditional rendering, always-on pointer work and shipped GUI.

What Forge learns:

- large repeated systems belong on the GPU;
- construction quality and production optimization must be judged separately;
- authored visual ambition survives while runtime policy is tiered.

### Helion

The public Textura optimization documentation identifies Helion as canonical for:

- device tiering;
- clamped DPR / frame budgets;
- one shared animation ticker;
- visibility / hidden-tab render gating;
- touch scroll smoothing and tier retuning.

What Forge learns:

- performance policy should be centralized instead of scattered through individual scenes;
- mobile should preserve the concept with reduced fidelity;
- invisible scenes should not keep spending GPU budget.

### Stride

The public Textura optimization documentation identifies a plain Three scene with visibility-gated rendering and compilation after GLB resolution.

What Forge learns:

- scene visibility is a render-loop concern, not just a CSS concern;
- critical model resolution should be followed by program warmup before the signature state is reached.

## Cross-corpus construction rules

The broader corpus and official GetLayers documentation reinforce these rules:

1. **Start with a strong construction skeleton.** Layout, motion, type and atmosphere are designed together, not bolted together after content.
2. **The strongest section sets the system.** Supporting chapters inherit spacing, motion character and visual grammar rather than behaving like unrelated templates.
3. **Choose the lightest medium that expresses the idea.** DOM → media/video → lightweight WebGL gradient/shader → full 3D, based on the actual visual need.
4. **One persistent stage is often stronger than repeated resets.** Reframe the world or subject with scroll.
5. **WebGL is not the definition of immersion.** Baseline is useful specifically because its public description demonstrates premium pacing without a stated 3D requirement.
6. **3D detail should belong to one world.** Ascend layers city lights, clouds and radar onto one central planet instead of creating several disconnected hero objects.
7. **Interaction needs a physical rule.** Loopstack's cursor is part of the atmosphere, not a pile of independent hover effects.
8. **Visual silence is authored.** Low-motion / low-density chapters create contrast for the signature peak.
9. **Mobile is a redirected version of the concept.** Lower DPR, counts, passes and interaction cost before removing the defining idea.
10. **First-scroll smoothness is part of craft.** Warm critical programs, textures, render targets and media before the user reaches the expensive moment.

## Official ecosystem evidence

GetLayers publicly separates its immersive building blocks into templates, 3D scenes, sections, video backgrounds and lightweight pointer-interactive gradients. The important lesson for Forge is not to copy those categories literally; it is to choose the **minimum technical medium** that can deliver the desired visual behavior.

Their public docs also state that:

- templates combine layout, motion, type and atmosphere;
- sections are intended to be composed and pulled apart;
- video backgrounds are appropriate when motion/depth is needed but a 3D scene is too heavy;
- heavy scenes can be client-only so they do not block first paint;
- server-rendered semantic content remains available for crawlers while immersive code loads separately.

Forge already has the primitives to implement these principles. The corpus exists to improve **selection and direction**, not to create a new dependency stack.

## Ongoing review policy

The public library changes weekly. When a reference becomes publicly reviewable:

1. upgrade its evidence level;
2. record only observable or technically documented traits;
3. extract transferable construction lessons;
4. map those lessons to existing Forge primitives;
5. add a new construction pattern only when the lesson generalizes to multiple future projects;
6. add a test before allowing the new lesson to affect Director output.

Never infer premium-template details from name, industry or thumbnail alone.
