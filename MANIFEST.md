# Repository Manifest

Immersive Site Forge 2.1 is organized as a multi-project production platform rather than a one-off demo.

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
- ten camera path presets
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
- runtime draw-call and triangle telemetry

## Authoring and automation

- browser-based Forge Studio at `/studio`
- visual scene timeline and boundary editor
- browser Mask Lab with DOM/WebGL comparison and preset controls
- browser and CLI GLB inspection with named-node mapping
- reusable scene and media-transition presets
- validated Studio project schema
- CMS JSON and Shopify Storefront adapters
- client project generation and activation
- protected GitHub Actions deployment workflow
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
- eight Claude command playbooks
- project, scene and asset templates
- GitHub CI and contribution templates

## Documentation

Architecture, Studio, integrations, telemetry, camera paths, transitions, object motion, DOM motion, shaders, animated assets, scene lab, primitives, interactions, accessibility, asset pipeline, performance, validation, deployment and troubleshooting are documented under `/docs` and `/integrations`.
