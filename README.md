# Immersive Site Forge 6.0

A production platform for designing, validating, generating and deploying cinematic, stateful 3D web experiences. Forge Studio combines an ACES-managed adaptive renderer, frame-accurate motion sequencer, deterministic interaction graph, real-time camera direction, R3F raycast interaction, drag/orbit inspection, persistent material and shader overrides, audio cues, lifecycle orchestration, layered media transitions, an eight-preset DOM/WebGL mask laboratory, geometry-aware local asset inspection, six industry templates, CMS and commerce adapters, secure review-PR publishing, client generation, protected deployment automation and consent-aware real-device telemetry.

The production runtime keeps one Canvas alive across `/` and `/lab`. Accessible HTML remains usable without JavaScript or WebGL. `/studio` is an independent authoring surface, so editing tools never compete with the client experience for rendering resources. This repository includes six distinct reference recipes and original GLB fixtures, not photorealistic client artwork or a blanket hardware-performance guarantee.

## Start

Open `/design` for three art directions, reusable page sections, responsive typography, live font specimens and a searchable 36-family reference catalog. Three pinned local variable fonts total about 97 KiB; unused families are not force-preloaded. See [the design system](docs/DESIGN_SYSTEM.md) and [research-to-code decisions](docs/DESIGN_RESEARCH.md). The preview is an authoring tool with labeled concept content, not a finished client site.

Use Node 22.13 or later. `.nvmrc` selects Node 22.

```bash
npm ci
npm run check
npm run build
npm run start
```

For development use `npm run dev`. Dev/build prepares locally served Draco and Basis decoders from the locked Three dependency. Open http://localhost:3000. No runtime gstatic decoder dependency is required.

## Forge Studio

Open `/studio` to direct the production runtime without editing source code.

The Sequence workspace provides a dope sheet, loopable real-time playback, in/out ranges, rate and duration controls, track filtering, snapping, zoom, multi-key selection, timing reversal and distribution, copy/paste, undo/redo, reusable motion presets, desktop/mobile override tracks, cubic Bezier handles and Three.js transform gizmos for vector recording.

The Interactions workspace authors deterministic trigger, condition, action and state graphs. It can react to scene entry and exit, DOM and WebGL clicks, hover, pointer movement, drag gestures, keyboard, wheel, device orientation, video time, hotspots, idle timers, custom events and runtime completion/cancellation events. Actions can drive sequences, named camera shots, audio, shaders/materials, 3D orbit modes, navigation, quality and motion policy. Every authored value is validated and the graph debugger simulates effects without executing production side effects.

Drafts stay in local browser storage until exported or explicitly published. GitHub credentials remain server-side.

```bash
npm run glb:inspect -- public/models/reference/burger.glb
npm run assets:optimize -- public/textures/client/hero.jpg --format=avif --width=2048
npm run project:new -- client-name burger-showcase
npm run project:validate
npm run interaction:validate
npm run content:sync -- config/studio-project.json
```

Read [Studio](docs/STUDIO.md), [motion sequencer](docs/MOTION_SEQUENCER.md), [interaction graph](docs/INTERACTION_GRAPH.md), [mask reveals](docs/MASK_REVEALS.md), [integrations](docs/INTEGRATIONS.md), [telemetry](docs/TELEMETRY.md) and [deployment](docs/DEPLOYMENT.md) before configuring external systems.

## Runtime interaction targets

Forge uses one logical target namespace for DOM and WebGL interaction:

```text
DOM: data-forge-interaction="product-inspect"
Hero: hero
Mapped GLB node: rig:<node-name>
Scene asset: asset:<asset-id>
```

A graph can therefore move from ordinary HTML into a raycast 3D inspection state without introducing a separate interaction architecture. Sequence, camera, audio and shader consumers emit completion and cancellation events back into the graph, so longer experiences can branch after a cinematic command actually finishes.

## Reference experiences

```bash
npm run recipe:list
npm run recipe:apply -- restaurant
npm run check
```

Recipes: burger-showcase, real-estate, restaurant, automotive, product and saas. Each changes camera coordinates, ranges, object choreography, atmosphere and its original GLB model. The default burger showcase demonstrates ingredient separation, reassembly, brand bands, a semantic menu and an order card. Its interaction graph also includes an end-to-end sequence lifecycle example. The pavilion recipe keeps its environment persistent and scrubs an embedded sliding-door clip through the threshold scene. Low model variants have lower geometry cost. The application command validates before applying and preserves timestamped backups.

The scene lab provides timeline scrubbing, actual camera/target/FOV telemetry, camera copying, manual/automatic quality policy, reduced motion, free camera and authoring guides with path lines and material/portal examples. D toggles diagnostics outside interactive fields. Arrow keys navigate scenes when focus is not in a control. Primary scene navigation and hotspot information also work with native semantic HTML.

## Configure and extend

- `config/experience.json`: validated scene ranges, typed motion tracks, camera/mobile paths, hero, world, material direction, postprocessing, copy, hotspots, scene assets and transition layers.
- `config/interaction-graph.json`: deterministic states, variables, triggers, conditions, actions, lifecycle branches and mobile substitutions.
- `config/studio-project.json`: client identity, content sources, deployment target and telemetry policy.
- `config/asset-manifest.json`: paths, byte sizes, hashes and asset budgets.
- `npm run scene:new -- kitchen`: generate a draft, then integrate and validate.
- `npm run assets:generate`: regenerate original model fixtures and their manifest. This resets the reference asset manifest; do not use it on a custom project manifest without a backup.

Read [architecture](docs/ARCHITECTURE.md), [Studio](docs/STUDIO.md), [production offer](docs/PRODUCTION_OFFER.md), [product rigs](docs/PRODUCT_RIGS.md), [asset pipeline](docs/ASSET_PIPELINE.md), [authoring](docs/AUTHORING.md), [accessibility](docs/ACCESSIBILITY.md), [validation](docs/VALIDATION.md) and [deployment](docs/DEPLOYMENT.md). `CLAUDE.md` is the contribution and agent operating contract.

## Verification

```bash
npm run check
npm run build
npx playwright install --with-deps chromium webkit
npm run test:browser
npm audit --audit-level=high
```

CI performs the same checks and retains browser failure traces/screenshots. Unit tests load actual GLBs, test animation reversal and instance independence, preset endpoints, interaction determinism, runtime camera sampling, persistent shader overrides, schema rejection, sampled continuity, asset budgets and quality/media policies. Browser tests exercise production HTML, interaction lifecycle, canvas persistence, Studio authoring, routes, controls, viewport behavior and failure paths.

Physical mobile thermal/GPU tests, real audio codec/device coverage and assistive-technology certification remain separate release requirements. Desktop software rendering is not proof of real-device capacity.
