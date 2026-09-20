# Forge Cinematic Systems

Forge cinematic systems are reusable creative-technology primitives layered on top of the canonical experience document. They exist so premium visual behavior is configured by scene instead of rewritten per project.

## Contract

`config/experience.json` remains the source of truth for narrative, camera, media, world, product rig, responsive camera and MotionTracks.

`config/cinematic-systems.json` augments those scenes by matching the existing scene `id`. It may add:

- physical spring response
- cinematic stack recession
- reveal fields
- cursor reveal fields (lens, persistent trail and projected fluid)
- spatial image treatment
- procedural graphics
- foreground occlusion
- technical diagrams

A project-specific component should only be required when the desired visual language cannot be expressed by these primitives.

## Runtime architecture

The production path is:

`experience progress -> spring target -> shared Forge ticker -> cinematic scene composer -> GPU/Canvas/SVG/DOM renderers`

Pointer input is normalized once and exposes position, velocity, pressure, dwell and a bounded trail. The same signals can drive reveals, halftone response, relighting and procedural distortion.

Reduced motion bypasses spring travel and dynamic cinematic overlays. Low quality uses CPU/CSS fallbacks and reduced procedural instance counts. Medium/high tiers may use the WebGL2 media compositor.

## Spring runtime

The spring solver is deterministic and integrates with bounded substeps. Configure mass, stiffness and damping in manifest defaults or override an individual scene.

Use springs for perceptual response, not for narrative timing. Scroll progress is still authoritative. Reverse scrolling must sample the same destination state as forward scrolling.

## Cinematic stack

The stack system supports scene recession through scale, shade and virtual depth. It is intended for sticky narrative sequences and editorial handoffs. Stack samples are pure functions of local scene progress and therefore reverse-safe.

Key controls:

- `scaleTo`
- `darkenTo`
- `depth`
- `overlap`
- `pin`

## Reveal engine

Available reveal effects:

- `directional`
- `radial`
- `liquid`
- `burn`
- `particle`
- `wireframe`
- `contour`

Every reveal has a CPU/CSS fallback. Medium/high tiers can use the WebGL2 compositor for per-pixel image reveals. Pointer and trail influence are normalized inputs rather than project-specific mouse listeners.

## Cursor reveal engine

Cursor reveals expose a second image through normalized pointer input without adding project-specific mouse listeners. Three modes are available:

- `lens`: a soft positional reveal window;
- `trail`: a persistent brush field with authored linger and fade;
- `fluid`: velocity/dye advection with curl response plus divergence, iterative pressure solve and pressure-gradient subtraction before dye transport.

Fluid mode uses WebGL2 floating render targets when supported. If the required floating-target/filter capability is unavailable it falls back to the persistent GPU trail, and low-quality/no-WebGL paths use the Canvas implementation. Touch defaults to deliberate drag rather than hover simulation. See [cursor reveals](CURSOR_REVEALS.md).

## Spatial image system

Spatial modes:

- `depth`
- `planes`
- `relight`
- `depth-relight`

Depth modes require a registered depth texture. Relight modes require a registered normal map. Plane mode requires at least two registered image planes.

The GPU compositor can displace UVs from a depth map and pointer/scroll input, then relight pixels from a tangent-space normal map. This supports high-quality 2.5D photography without requiring a GLB.

## Procedural graphics

Available systems:

- contour fields
- halftone fields, including 8,004-dot fields
- animated line traces
- interactive grids

Quality tiers cap expensive point counts while preserving the same authored system. The high tier can render the full declared halftone count.

## Foreground occlusion

Occluders are scene-local foreground layers with deterministic progress. Types:

- image
- gradient
- shadow
- blur

Use them for camera-like wipes, architectural passes, foliage/fabric silhouettes, reflection veils and deliberate scene handoffs.

## Technical diagrams

Diagram types:

- floor plan
- route
- timeline
- schematic

Diagrams contain normalized points and graph edges. Edge drawing is progressive and deterministic. Labels and leader geometry remain SVG so they stay crisp at any viewport size.

## Presets

Reusable preset builders currently include:

- Architectural Threshold
- Spatial Photo Hero
- Technical Reveal
- Editorial Image Transition
- Luxury Material Spotlight
- Cursor Reveal

Presets produce ordinary cinematic scene configuration and can be edited after application. They are starting points, not locked templates.

## Studio

Studio exposes cinematic systems under **Advanced → Visual effects** in the current Build / Review / Ship shell. The panel can select a production scene, apply a preset, enable stack/reveal behavior, tune principal values, and export `cinematic-systems.json`.

The current Studio integration is an authoring/export surface. Production runtime continues to read the committed manifest so reviewable configuration remains the source of truth.

## Asset governance

All depth maps, normal maps, spatial planes and image occluders must be registered in `config/asset-manifest.json`. `npm run assets:audit` checks these references alongside existing experience media and GLBs.

Never bypass the asset audit for a showcase effect.

## Validation

Run:

```bash
npm run cinematic:systems:audit
npm run test
npm run typecheck
npm run build
```

The complete release gate remains:

```bash
npm run check
```

CI also builds the production app and captures the currently active project at representative desktop and mobile scene positions.

## Authoring rule for Claude

Before writing custom visual-effect code, check whether the scene can be expressed by `config/cinematic-systems.json` and the existing effect registry. Prefer composition of existing primitives. Add a new reusable primitive only when the requirement is materially different and likely to recur across projects.

Project-specific visual code belongs in the project only when it represents unique art direction rather than missing platform capability.
