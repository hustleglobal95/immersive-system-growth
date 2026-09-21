# Repository Manifest

> **Capability status:** this file inventories implemented Forge systems. Some systems require external credentials or explicit production flags before they are operational. Run `npm run forge:readiness` before starting a client project and read `docs/FORGE_OPERATIONAL_READINESS.md` for the exact setup/verification boundary.

Immersive Site Forge 6.1 is organized as a multi-project production platform rather than a one-off demo.

## Runtime

- persistent React Three Fiber canvas
- Lenis smooth scroll controller
- normalized 0 to 1 experience timeline
- Zustand runtime state
- pointer depth controller
- keyboard scene navigation
- adaptive quality profile
- reduced-motion profile
- WebGL error boundary and loading overlay

## 3D systems

- damped cinematic camera rig
- eleven camera path presets
- optional multi-point Catmull-Rom spline camera paths
- persistent object choreography and object-motion presets
- named-node product rigs with position, rotation, scale, opacity and visibility tracks
- animated GLB playback
- scroll-scrubbed GLB animation
- image, video and scroll-scrubbed video planes
- 360 panorama dome
- HTML-in-3D screens
- 3D hotspots backed by accessible DOM dialogs
- scene zoning for large environments
- quality gates for expensive scene content
- glass and portal primitives
- reflective stage and occlusion primitives
- material starters
- particle atmosphere
- adaptive postprocessing
- eight deterministic image/video mask reveals with DOM and WebGL renderers
- automatic mask fallback for quality, WebGL loss and reduced motion
- pointer-driven cursor reveal engine with lens, persistent trail and projected GPU-fluid modes
- WarpSurface visual physics with elastic, cloth, water, heat and shockwave deformation driven by pointer velocity and scroll
- RefractiveSurface visual physics with lens, panel and liquid refraction, chromatic dispersion, edge refraction, sheen and ripple
- ShaderTransitionEngine with ripple, liquid, noise, pixel, chromatic, directional, iris, slats, grain and depth scene transitions
- shared WebGL2 cinematic compositor for reveal, spatial, warp, refraction and scene-transition passes with quality/reduced-motion fallback
- touch-drag policy, pressure/velocity response, linger/fade decay and Canvas/GPU fallback
- runtime draw-call and triangle telemetry

## Authoring and automation

- browser-based Forge Studio at `/studio`
- PRO+ Control Plane with seven first-class selection kinds (scene, camera, rig node, copy, media, asset, environment), self-validating Capability Registry, Intent Compiler, Next Action Engine, Project Health and non-mutating Proposal Contract
- Build / Review / Ship primary Studio surfaces with Sequencer, Interactions, Asset tools, Visual effects and Telemetry moved under Advanced
- registry-driven contextual actions that route semantic operator intent into existing camera, motion, interaction, asset, Director and Loop systems without duplicating those engines
- unified Current / Candidate review for reversible fast proposals and proposal-bound verified Loop project-state bundles, with exact working/Vault baseline parity and atomic local bundle undo/redo
- reviewer-protected local Loop-result bridge that validates winning evidence before Studio can preview a deep candidate
- Project Health release gating shared by Review and Guided Ship
- private internal access layer with role-bearing HTTP-only sessions
- GitHub-backed Project Vault with atomic durable snapshots, restore points, archive state and project journal
- permanent generated-asset promotion through a provider-neutral Asset Vault gateway
- production memory journal for saves, restores, reviews, asset promotion and explicit lessons
- live preview of the production R3F scene graph and media stack
- visual camera, lighting, atmosphere, postprocessing and material direction
- visual scene timeline and boundary editor
- frame-accurate scene motion sequencer and deterministic typed sampler
- zoomable dope sheet with snapping, multi-select, copy/paste and grouped undo/redo
- cubic Bezier curve editor and reusable motion presets
- real-time sequencer transport with loop, rate, duration and in/out preview ranges
- selection retiming, track filtering and five production curve presets
- live camera, hero and named GLB-node vector recording with Three.js transform gizmos
- desktop and mobile motion override tracks
- browser Mask Lab with DOM/WebGL comparison and preset controls
- Visual Effects authoring for cursor reveal, WarpSurface, RefractiveSurface, ShaderTransitionEngine and combined visual-physics presets
- browser and CLI GLB inspection with hierarchy paths, geometry totals, complexity grading and confidence-scored node mapping
- six reusable industry templates plus scene and media-transition presets
- bounded image and color transition-layer composition
- browser asset intake with hashes, media metadata, GLB structure and budget checks
- Asset Intelligence scoring for budget pressure, dominant assets, duplicate binaries, traceable derivative coverage/savings and role-specific optimization actions
- Guided Build workflow from idea → assets → scenes → motion → review → publish
- direct Asset Creator handoffs for Meshy 3D and Higgsfield image/video generation with server-only provider credentials
- deterministic AVIF/WebP texture optimization with manifest updates
- validated Studio project schema
- CMS JSON and Shopify Storefront adapters
- client project generation and activation
- protected GitHub Actions deployment workflow
- server-only GitHub review-PR publishing from validated Studio drafts
- consent-aware real-device performance telemetry
- JSON scene composer
- semantic statement, brand-band, menu-grid and order-card modules
- scene draft generator
- six full choreography recipes
- local GLB product-rig auditor
- timeline validator
- cinematic continuity auditor
- asset budget auditor
- scene report command
- repository doctor
- configuration tests
- Claude Code operating contract
- immersive construction intelligence backed by 236 evidence-graded references and 108 reusable construction patterns for composition, motion, camera, interaction, mobile translation and first-use performance
- 25 primary-source technical doctrines for shader/texture prewarm, demand rendering, video-frame sync, worker canvas isolation, shared GSAP timing, hot-path setters and refresh-rate-independent motion
- reference-deconstruction workflow that maps immersive precedents onto existing Forge systems before new dependencies
- evidence-weighted, source-diverse precedent retrieval plus a reference corpus integrity audit
- eight-layer hierarchy intelligence spanning strategy, narrative, section, information, visual, interaction, motion/spatial and semantic/accessibility priority
- Creative Intelligence 2 with project-specific Creative DNA across composition, typography, color, image, 3D/material, motion, lighting, interaction, sound and mobile
- deterministic Art Director that compiles one visual north star into type/color/image/material/lighting/motion systems plus beat-level scene direction and explicit reject rules
- three materially different visual-language worlds per Director run with ten-dimension pairwise territory-distance gates that become stricter at Signature/Flagship tiers
- Creative Mutation Engine that challenges first-order concepts with counterfactual mechanisms while preserving brand truth, memory promise and conversion intent
- eight specialist creative directors for typography, camera, motion, lighting, material, image, interaction and sound
- Creative Ceiling V2 across 13 disciplines with bottleneck and highest-leverage intervention reporting
- Reference Deconstruction 2.0 with evidence-scoped composition/type/camera/motion/color/image/material/interaction/transition/density/narrative/signature/mobile lenses and explicit anti-copy transfer rules
- layered studio/operator/project taste calibration with studio taste dominant but never allowed to override factual brief or brand constraints
- expanded Creative Memory graph for approved Art Direction, Visual Language and type/color/light/material/image/sound grammars, plus cross-project anti-repeat review that excludes the current project from self-collision
- autonomy foundation with grounded short-prompt brief inference, decision-time construction guidance, five autonomy levels, deterministic render-review plans, functional verification contracts and forced-improvement candidate selection\n- Forge Loop Engine control plane with typed loop contracts, multi-candidate tournaments, bounded cycle/attempt/time budgets, saturation and oscillation stops, compact cycle context, evidence ledger, Project Vault memory and explicit human promotion
- executable evidence-gated Performance Loop with representative desktop/mobile profiling, bounded DPR/pixel/preload repair candidates and incumbent/candidate re-measurement
- executable Asset Quality Loop with derivative lineage, referenced-byte profiling, same-class SHA-256 alias consolidation, registered-derivative selection and visual/performance regression gates
- executable Construction Loop driven by grounded Director intelligence with hierarchy/camera/signature strategies, client-copy and camera-endpoint preservation, and schema/functional/asset/motion/mobile/performance/accessibility/visual gates
- Loop Engine project-state bundles that fingerprint and human-promote experience, asset manifest and interaction graph atomically
- explicit Playwright accessibility verifier for semantic names, image alternatives, unique IDs, reduced-motion preservation, keyboard focus and primary-action focusability
- 30-case one-line commercial prompt benchmark enforced by `npm run check`
- Visual Director with 17 specialist critic dimensions including art direction, color, lighting, material, image direction, sound intent, originality and craft; isolated incumbent/candidate preview rendering; bounded reversible presentation repair; reversed-order pairwise judging and forced-optimization acceptance
- end-to-end local autonomy repair loop that writes accepted candidates as artifacts without overwriting checked-in production config
- candidate-aware full runtime verification route with Playwright checks for forward/reverse traversal, keyboard navigation, CTA/hotspot access, mobile equivalence and reduced motion
- deterministic desktop/mobile motion-quality review with fixed-timestep camera/hero sampling, reverse-state determinism, scene-boundary continuity and optional multimodal ordered-frame critique
- nine Claude command playbooks
- project, scene and asset templates
- exact-project preview/deployment safety with CODEOWNERS and current-tree integrity locks
- GitHub CI and contribution templates

## Documentation

Architecture, Studio, integrations, telemetry, camera paths, transitions, object motion, DOM motion, shaders, animated assets, scene lab, primitives, interactions, accessibility, asset pipeline, performance, validation, deployment and troubleshooting are documented under `/docs` and `/integrations`.
