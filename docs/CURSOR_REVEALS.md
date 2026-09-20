# Cursor reveal engine

Forge cursor reveals are scene-local interaction primitives for revealing a second image through pointer movement without adding project-specific mouse listeners or a second permanent interaction architecture.

## Modes

| Mode | Behavior | Preferred path |
| --- | --- | --- |
| lens | Soft reveal window follows the live pointer | GPU or Canvas fallback |
| trail | Pointer deposits a persistent brush field, lingers, then fades | GPU feedback mask; Canvas fallback |
| fluid | Pointer velocity is injected into an advected velocity field that transports reveal dye | WebGL2 float targets; trail fallback when unavailable |

The fluid mode is intentionally bounded. It uses Forge's shared pointer signals and a scene-local compositor, then releases its WebGL context when the scene unmounts. If float render targets are unavailable it degrades to the persistent trail renderer instead of failing the experience.

## Authoring

Open Studio -> Visual Systems -> Cinematic systems, select a scene, then enable Cursor reveal or apply the Cursor Reveal preset.

A cursor reveal requires an image-backed production scene plus a registered reveal image.

Primary controls:

- `src`: second image revealed under the interaction
- `mode`: lens, trail or fluid
- `renderer`: auto, gpu or canvas
- `brushSize` and `brushStrength`
- `softness`
- `motionStrength`
- `lingerMs` and `fadeSeconds`
- `trailPersistence`
- `touch`: disabled, drag or always
- `fit` and `position`
- `fluidResolution`, `velocityDissipation`, `dyeDissipation`, `curl` and `splatForce`

Example:

```json
{
  "id": "material",
  "cursorReveal": {
    "src": "/images/product/movement.avif",
    "mode": "fluid",
    "renderer": "auto",
    "brushSize": 0.13,
    "brushStrength": 1.1,
    "softness": 0.22,
    "motionStrength": 1.2,
    "lingerMs": 320,
    "fadeSeconds": 1.4,
    "trailPersistence": 0.86,
    "touch": "drag",
    "fit": "cover",
    "position": [50, 50],
    "fluidResolution": 192,
    "velocityDissipation": 0.985,
    "dyeDissipation": 0.992,
    "pressureIterations": 12,
    "curl": 18,
    "splatForce": 4
  },
  "procedural": [],
  "occlusion": []
}
```

## Pointer contract

Forge normalizes pointer input once in `CinematicSystemsController`. Cursor reveals consume:

- normalized x/y position
- pointer velocity
- pressure
- dwell
- trail energy
- pointer type
- pointer down/up state
- active state
- last movement timestamp

The reveal component does not install project-specific movement listeners.

## Linger and fade

Trail and fluid modes deposit reveal only while the pointer is moving, or while an authored touch-drag is active. After movement stops, the field holds for `lingerMs` and then decays according to `fadeSeconds` and `trailPersistence`.

Lens mode is positional rather than cumulative.

## Touch behavior

`disabled` ignores touch input.

`drag` reveals only while the touch pointer is down. This is the default because it preserves ordinary page scrolling when the interaction is not deliberate.

`always` responds to all touch pointer movement and must be verified against native scrolling on target devices.

## Rendering and fallbacks

Only one scene-local cinematic compositor should own a scene at a time. When a cursor reveal is active, the existing base cinematic shader path falls back to its DOM/CSS implementation so Forge does not stack multiple extra WebGL contexts.

- low quality -> Canvas fallback
- WebGL2 unavailable -> Canvas fallback
- fluid mode without float render targets -> persistent GPU trail fallback
- reduced motion -> cursor reveal omitted; the normal semantic image/content remains
- renderer loss -> base scene remains visible

The revealed media is an enhancement. Essential product, architectural or explanatory information must also exist in semantic DOM content.

## Performance

Start fluid reveals at 192 simulation pixels on the short axis. Values above 256 trigger an audit warning and require target-device evidence.

Keep one cursor interaction responsible for one visual idea. Do not stack cursor reveal, magnetic movement, heavy tilt and unrelated hover effects on the same subject.

## Verification

Run:

```bash
npm run cinematic:systems:audit
npm run test
npm run typecheck
npm run build
npm run test:browser
```

Release review must include mouse, trackpad and touch behavior, linger/fade timing, reduced motion, low-tier fallback and WebGL-loss recovery.
