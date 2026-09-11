# Immersive Site Forge 2

A production platform for designing, validating, generating and deploying cinematic 3D websites. Forge Studio adds a visual timeline, browser-based recipe editing, private local GLB inspection, reusable choreography presets, CMS and commerce adapters, client generation, protected deployment automation and consent-aware real-device telemetry.

The production runtime keeps one Canvas alive across / and /lab. Accessible HTML remains usable without JavaScript or WebGL. `/studio` is an independent authoring surface, so editing tools never compete with the client experience for rendering resources. This repository includes six distinct reference recipes and original GLB fixtures, not photorealistic client artwork or a blanket hardware-performance guarantee.

## Start

Open `/design` for three art directions, reusable page sections, responsive typography, live font specimens and a searchable 36-family reference catalog. Three pinned local variable fonts total about 97 KiB; unused families are not force-preloaded. See [the design system](docs/DESIGN_SYSTEM.md) and [research-to-code decisions](docs/DESIGN_RESEARCH.md). The preview is an authoring tool with labeled concept content, not a finished client site.

Use Node 22.13 or later (.nvmrc selects Node 22).

```bash
npm ci
npm run check
npm run build
npm run start
```

For development use `npm run dev`. Dev/build prepares locally served Draco and Basis decoders from the locked Three dependency. Open http://localhost:3000. No runtime gstatic decoder dependency is required.

## Forge Studio

Open `/studio` to edit project identity, scene timing, copy, camera/object presets, media transitions, product-rig node mappings, content sources, deployment settings and telemetry policy. Drafts stay in local browser storage until exported. Both exported files use the same production schemas as CLI and CI.

```bash
npm run glb:inspect -- public/models/reference/burger.glb
npm run project:new -- client-name burger-showcase
npm run project:validate
npm run content:sync -- config/studio-project.json
```

Read [Studio](docs/STUDIO.md), [integrations](docs/INTEGRATIONS.md), [telemetry](docs/TELEMETRY.md) and [deployment](docs/DEPLOYMENT.md) before configuring external systems.

## Reference experiences

```bash
npm run recipe:list
npm run recipe:apply -- restaurant
npm run check
```

Recipes: burger-showcase, real-estate, restaurant, automotive, product and saas. Each changes camera coordinates, ranges, object choreography, atmosphere and its original GLB model. The default burger showcase demonstrates ingredient separation, reassembly, brand bands, a semantic menu and an order card. The pavilion recipe keeps its environment persistent and scrubs an embedded sliding-door clip through the threshold scene. Low model variants have lower geometry cost. The application command validates before applying and preserves timestamped backups.

The scene lab provides timeline scrubbing, actual camera/target/FOV telemetry, camera copying, manual/automatic quality policy, reduced motion, free camera and authoring guides with path lines and material/portal examples. D toggles diagnostics outside interactive fields. Arrow keys navigate scenes when focus is not in a control. Primary scene navigation and hotspot information also work with native semantic HTML.

## Configure and extend

- config/experience.json: validated scene ranges, camera/mobile paths, hero, world, postprocessing, copy, hotspots and scene assets.
- config/studio-project.json: client identity, content sources, deployment target and telemetry policy.
- config/asset-manifest.json: paths, byte sizes, hashes and asset budgets.
- `npm run scene:new -- kitchen`: generate a draft, then integrate and validate.
- `npm run assets:generate`: regenerate original model fixtures and their manifest. This resets the reference asset manifest; do not use it on a custom project manifest without a backup.

Read [architecture](docs/ARCHITECTURE.md), [Studio](docs/STUDIO.md), [product rigs](docs/PRODUCT_RIGS.md), [asset pipeline](docs/ASSET_PIPELINE.md), [authoring](docs/AUTHORING.md), [accessibility](docs/ACCESSIBILITY.md), [validation](docs/VALIDATION.md) and [deployment](docs/DEPLOYMENT.md). CLAUDE.md is the contribution/agent operating contract.

## Verification

```bash
npm run check
npm run build
npx playwright install --with-deps chromium webkit
npm run test:browser
npm audit --audit-level=high
```

CI performs the same checks and retains browser failure traces/screenshots. Unit tests load actual GLBs, test animation reversal/instance independence, all preset endpoints, schema rejection, sampled continuity, asset budgets and quality/media policies. Browser tests exercise production HTML, canvas persistence, routes, controls, viewport behavior and failure paths. Physical mobile thermal/GPU tests are a separate release requirement; desktop software rendering is not proof of real-device capacity.
