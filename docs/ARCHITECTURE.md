# Architecture

Immersive Site Forge is built around one rule: the visitor moves through one visual world. Sections may exist for semantics and scroll length, but the WebGL renderer is persistent.

## Runtime graph

```text
Pointer + wheel + touch
        |
      Lenis
        |
Normalized progress 0..1
        |
      Zustand
   /      |       \
Camera  Objects   DOM copy
   \      |       /
       Scene sampler
            |
Lighting + fog + post FX + hotspots
            |
One React Three Fiber Canvas
```

`config/experience.json` is the source of truth for scene ranges, camera states, hero states, world state, postprocessing and copy. `sampleExperience()` converts normalized progress into render state.

## Persistent canvas

`SceneCanvas.tsx` is fixed to the viewport and never recreated while the user moves through scenes. Camera and object transforms change inside `useFrame`. This avoids canvas teardown, GL context churn and the visual discontinuity caused by one canvas per section.

## Scene ranges

Every scene owns a contiguous normalized range. The first scene starts at `0`; the last ends at `1`; adjacent ranges must touch exactly. The validation script fails when the timeline has gaps or overlaps.

## DOM and WebGL responsibilities

WebGL owns spatial imagery, models, particles, materials and lighting. DOM owns important text, navigation, buttons, forms and accessibility. Hotspot labels may use Drei `Html`, but primary content should remain crawlable DOM.

## Extension points

- Replace `PersistentHero` with a real GLB assembly.
- Add scene-specific groups under the canvas and gate them by active scene.
- Add camera path presets in `src/lib/cameraPaths.ts`.
- Add shaders in `src/shaders`.
- Add optional HDR environments with `EnvironmentMap`.
- Add exact DOM-to-WebGL tracking with the optional r3f-scroll-rig integration.
