# Immersive Site Forge

A configuration-driven foundation for cinematic, scroll-driven 3D websites, built with Next.js, React Three Fiber, Three.js, Drei, Lenis, GSAP and Zustand. Named-node product rigs, semantic content modules and global keyframe tracks support product assembly experiences without replacing the accessible document.

The shared layout keeps one Canvas alive across / and /lab. Accessible HTML remains usable without JavaScript or WebGL. A shared sampler coordinates camera, objects, product parts, lighting, atmosphere, content modules and postprocessing. This repository includes six distinct reference recipes and original GLB fixtures, not photorealistic client artwork or a blanket hardware-performance guarantee.

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
- config/asset-manifest.json: paths, byte sizes, hashes and asset budgets.
- `npm run scene:new -- kitchen`: generate a draft, then integrate and validate.
- `npm run assets:generate`: regenerate original model fixtures and their manifest. This resets the reference asset manifest; do not use it on a custom project manifest without a backup.

Read [architecture](docs/ARCHITECTURE.md), [product rigs](docs/PRODUCT_RIGS.md), [asset pipeline](docs/ASSET_PIPELINE.md), [authoring](docs/AUTHORING.md), [accessibility](docs/ACCESSIBILITY.md), [validation](docs/VALIDATION.md) and [deployment](docs/DEPLOYMENT.md). CLAUDE.md is the contribution/agent operating contract.

## Verification

```bash
npm run check
npm run build
npx playwright install --with-deps chromium webkit
npm run test:browser
npm audit --audit-level=high
```

CI performs the same checks and retains browser failure traces/screenshots. Unit tests load actual GLBs, test animation reversal/instance independence, all preset endpoints, schema rejection, sampled continuity, asset budgets and quality/media policies. Browser tests exercise production HTML, canvas persistence, routes, controls, viewport behavior and failure paths. Physical mobile thermal/GPU tests are a separate release requirement; desktop software rendering is not proof of real-device capacity.
