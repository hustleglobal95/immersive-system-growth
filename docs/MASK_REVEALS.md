# Mask reveals

Forge Reveal Engine adds a schema-driven media transition that produces the same frame from the same normalized progress in either scroll direction. It is original project code and does not redistribute source from the reference libraries used during research.

## Presets

| Preset | Shape | Automatic renderer |
| --- | --- | --- |
| linear-soft | Directional feather | DOM |
| radial-iris | Expanding circle | DOM |
| diagonal-cut | Rotated directional edge | DOM |
| split-center | Center-out split | DOM |
| pixel-grid | Seeded cell field | DOM |
| noise-dissolve | Direction plus noise | WebGL on high, DOM fallback |
| ink-spread | Radial organic field | WebGL on high, DOM fallback |
| film-burn | Directional organic edge | WebGL on high, DOM fallback |

Every preset accepts renderer, direction, origin, softness, scale, rotation, intensity, seed, inversion, edge color and edge width. The seed makes procedural results reproducible. Progress 0 is exactly hidden and progress 1 is exactly visible.

## Authoring

Open `/studio`, choose Masks, select a scene with image or video media, then choose a preset and scrub the preview. A scene without media can use the bundled reference image as an authoring fixture. Changes are saved in the normal Studio draft and exported in `experience.json`.

```json
{
  "kind": "image",
  "src": "/textures/campaign/hero.avif",
  "alt": "Campaign product on a dark set",
  "transition": "mask",
  "mask": {
    "preset": "film-burn",
    "renderer": "auto",
    "direction": "right",
    "origin": [50, 50],
    "softness": 9,
    "scale": 1,
    "rotation": 0,
    "intensity": 1.35,
    "seed": 911,
    "invert": false,
    "edgeColor": "#f97316",
    "edgeWidth": 7
  }
}
```

`maskSoftness` remains supported for older configurations. New work should use the nested mask object.

## Runtime ownership and fallbacks

The runtime shader layer is mounted inside the existing persistent React Three Fiber canvas. It does not create another runtime WebGL context. Geometric presets stay on efficient CSS masks. Automatic mode enables organic shader masks only when the active quality tier is high and WebGL is ready. Forced WebGL still falls back to DOM when capability is unavailable. Reduced motion omits animated media and preserves the readable semantic document.

Image and video resources use the existing owned texture hooks and asset boundaries. WebGL planes disable depth writes and sit near the active camera so they behave as transition layers without changing world ownership. DOM panels remain the failure path if the renderer is lost.

## Verification

Unit coverage checks all eight endpoints, reverse determinism, schema bounds, valid CSS output and backend policy. Browser coverage authors a mask in Studio, checks the DOM mask, samples the WebGL preview when available and confirms the draft remains schema-valid. Visual approval on physical target devices is still required before release.
