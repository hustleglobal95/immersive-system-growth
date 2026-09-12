# Claude Code Operating Contract

Read this file before modifying the experience.

## Objective

Build cinematic, spatial, interactive websites that feel like one continuous experience rather than a stack of animated sections.

## Non-negotiable architecture

1. Keep one persistent React Three Fiber canvas unless there is a documented technical reason not to.
2. Scroll is normalized from 0 to 1 and treated as the master cinematic timeline.
3. Camera, persistent objects, lighting, atmosphere, postprocessing and DOM copy derive from the same experience state.
4. A transition must explain how visual state moves from one scene to the next and how it behaves in reverse.
5. Prefer threshold passes, occlusion, object handoffs and surface dives over arbitrary full-screen fades.
6. Keep primary copy, navigation, forms and conversion actions in accessible DOM.
7. Preserve a useful reduced-motion path.
8. Measure render cost before increasing visual complexity.
9. Never invent asset paths. Inspect the repository and `config/asset-manifest.json` first.
10. Do not replace Forge architecture with a generic landing-page scaffold.
11. Product explosions must use named GLB nodes and deterministic productRig tracks.
12. Menus, prices and conversion actions must remain semantic DOM content.
13. Studio output must pass the same schema as checked-in production configuration.
14. Never expose CMS, commerce, telemetry or deployment secrets to client components.
15. Remote content and telemetry endpoints must use HTTPS, bounded requests and explicit trust controls.
16. Runtime shader transitions must share the persistent Canvas and provide a deterministic DOM or static fallback.
17. Studio live preview must receive the current validated draft through ExperienceConfigProvider; production runtime continues to use the checked-in default.
18. Studio publishing may create review branches and pull requests only. Repository tokens stay server-side and publishing never implies merge or deployment.
19. Transition-layer IDs are unique per media scene, timing ranges are bounded and reverse sampling must reconstruct the same frame.
20. Scene motion uses `motionTracks` and the first-party deterministic sampler. Do not introduce another playback clock.
21. All-viewport motion applies before the matching desktop or mobile override.
22. Motion targets that reference transition layers or GLB nodes must resolve during schema validation.
23. Viewport gizmos may write selected keyframes, but they must not own production transforms or ship active in the public runtime.
24. Editor dependencies with reciprocal network-copyleft or custom commercial licenses are not accepted into the Studio client bundle.

## Before implementation

Produce a scene plan containing:

- scene purpose
- camera starting state
- camera ending state
- camera path preset
- persistent object state
- environment change
- typography behavior
- interaction opportunity
- transition into the next scene
- required assets

Then update the timeline and scene components.

## Implementation priorities

Prefer, in order:

1. camera movement with a clear motivation
2. persistent object transformation
3. spatial depth and occlusion
4. environment geometry
5. lighting changes
6. material changes
7. DOM motion tied to scene state
8. postprocessing
9. particles and decorative effects

Particles are never a substitute for spatial design.

## Asset policy

Use optimized GLB/GLTF models. Prefer GPU-compressed textures when the project pipeline supports them. Do not commit huge source PSD, EXR, Blender or raw video files into the web bundle unless explicitly required.

## Required checks

Before declaring completion:

```bash
npm run doctor
npm run experience:validate
npm run assets:audit
npm test
npm run typecheck
npm run lint
npm run build
```

If dependencies cannot be installed in the current environment, still run every dependency-free validation script and report exactly which build checks could not execute.

## Completion standard

The work is not complete if:

- each scene feels independent
- the camera resets between scenes without narrative reason
- a hard fade is hiding a transition that should be spatial
- large models cause visible frame drops
- mobile simply hides the 3D experience rather than adapting it
- scroll and WebGL drift out of sync
- text becomes unreadable against the scene
- essential actions depend on 3D pointer precision
- backward scrolling breaks the illusion
- reduced-motion behavior is missing
