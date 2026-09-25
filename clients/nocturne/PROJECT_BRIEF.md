# Nocturne Objects — locked production brief

Status: brief locked by the client (Rounds 1–4). The work is at checkpoint D, proportion review. Nothing past the blockout may start until the client approves the proportions.

This document is the governing creative contract for `/nocturne`. The auto-generated Forge Build Packet (`npm run forge:build-packet`) produced a generic thesis ("anti category", "assembly" as the signature slice). That thesis is **superseded** by this brief wherever they conflict.

## Identity

- **Nocturne Objects is fictional.** It is a portfolio brand. Make no claims about awards, clients, history, headquarters, sales, patents, artisans, certifications or real installations unless they are labelled as fictional concept material.
- **Wordmark:** `NOCTURNE OBJECTS`, set in type only, with no symbol.
- **Typefaces:** Instrument Serif for editorial text and Geist Sans for interface text. Both are legally usable. Do not add unlicensed commercial faces.
- **Palette:** Obsidian `#090A0A`, Graphite `#151719`, Cold Steel `#62686C`, Warm Ivory `#ECE7DE`, Emission Amber `#E7A45A`. Amber is used only for emitted light, never as a decorative UI accent. No bronze anywhere.

## Thesis

N01 is not a 3D object inside a website. N01 becomes the website.

The signature behaviour is conceal → reveal → approach → refract → penetrate → expand. The camera moves and the product stays comparatively still: a partial arc is fine, a 360° showcase orbit is not. Scene 05 is an aperture opening, not an exploded view.

## Separation from Heliot

| Heliot | Nocturne |
| --- | --- |
| Bronze, warm luxury object | Cold blackened steel; warmth is a phenomenon (emitted light) |
| Orbit, assembly, component separation | Scale ambiguity, refraction, penetration, scale inversion |
| Immediate warm glow | Warmth arrives late |
| Precision, mechanism, assembly | Darkness, perception, material, light, altered scale |

## N01 (canonical: `clients/nocturne/n01-spec.json`)

- A 920 × 600 × 310 mm asymmetric suspended optical object. Dimensions are conceptual, not manufacturing data.
- **Plan:** an asymmetric superellipse with one end about 48 mm longer than the other, a slightly bowed centreline and a slightly skewed depth.
- **Silhouette:** one continuous river-stone skin shared by both shells, widest at the seam. The shallow top dome and the more strongly tapered lower shell both follow the same outline.
- **Glass:** a thick-walled, flattened hand-blown vessel. It sits just inside the stone outline and forms an exposed band about 89 mm tall. It hangs from its rolled lip, clamped by `INTERNAL_FRAME`, and has a few small bubbles and restrained surface and thickness variation.
- **Light:** an elliptical amber ring nested inside the glass, plus a diffuser lens and a finned heatsink. The source itself is revealed late.
- **Suspension:** ceiling mount → thin cable → blackened rod → machined grip, attached off-centre at (+55, −18) mm.
- **Anatomy (Scene 05):**
  - `SHELL_LOWER` rotates 10° about an authored hinge at the short end of the lower rim, then drops 6 mm. Both are animation parameters, tunable in `motionTracks`.
  - The hinge is carried by a slim steel spine that bridges the glass band at the short end. The spine is a proposed structural addition awaiting client approval.
  - `SHELL_TOP` yaws at most 2° about the grip axis.
  - The glass stays seated; vertical travel would push it through its clamp.
- **Pivots** are authored, not taken from object centres, and recorded in the glTF `extras`.

### Hierarchy

```
N01_ROOT
├─ SUSPENSION: CEILING_MOUNT, SUSPENSION_CABLE, SUSPENSION_ROD, GRIP
├─ SHELL: SHELL_TOP, SHELL_LOWER, SHELL_INNER, INTERNAL_FRAME
├─ GLASS_CORE
└─ LIGHT_ASSEMBLY: LIGHT_SOURCE, LIGHT_DIFFUSER, HEATSINK_RING
```

### Materials (final direction; the blockout uses placeholders)

- **Exterior:** blackened brushed steel / gunmetal. Very dark base, brushing visible only under grazing light, cool specular response, restrained anisotropy, never mirror chrome.
- **Interior metal:** slightly warmer, but still dark steel.
- **Glass:** almost colourless. The amber comes only from the emitter.

## Pipeline

Setup: Blender's Python module needs Python 3.11 (`python3.11 -m venv .bpy && .bpy/bin/pip install bpy pillow`). Then set `BLENDER_PYTHON=.bpy/bin/python`.

| Command | Purpose |
| --- | --- |
| `npm run nocturne:n01:build` | Headless Blender (`bpy`) builds, validates and exports `public/models/nocturne/n01.glb` and `n01-low.glb`. |
| `npm run nocturne:n01:render` | As above, plus Cycles proportion renders. |
| `npm run nocturne:n01:validate` | Independent Node check of the exported GLBs against the spec. |

The build fails on any of the following:
- a missing or misparented node
- non-manifold or degenerate geometry
- inward-facing normals
- wrong material slots
- body dimensions outside ±12 mm
- an end extension outside 40–55 mm
- an intersection between parts, in either the closed or the anatomy-open pose, unless the contact is a declared mechanical joint

**Rule:** the procedural Blender model is not promoted to hero quality by default. If scripted modelling cannot reach the surface and glass bar, the asset gate stays failed and the remedy is a proper artist-built model.

## Architecture contract (Round 3)

- **Stack:** R3F on the one persistent canvas. ScrollTrigger supplies normalised progress only; `motionTracks` and the deterministic sampler drive every transform. No second playback clock, and no accumulated or stateful transforms.
- **One canonical scene spec:**
  - Mobile adds portrait camera, framing, effect-quality and typography overrides.
  - Tier 3 renders are generated from the same spec and the same cameras.
- **Scroll:** Scenes 06–09 form one continuous timeline.
- **Spatial type:** the visual 3D type is presentation only and hidden from assistive technology. A visually hidden DOM equivalent carries the semantics, and the text is never announced twice. Navigation, buttons, CTAs and product information are real DOM.
- **Device tiers:**
  - Tiers are measured from device capability, not screen width.
  - Degrade by removing expensive effects in a defined order.
  - If WebGL fails or startup exceeds its limit, switch to the directed Tier 3 experience.
  - Never show an empty canvas.
- **Reduced motion:** designed still compositions, short crossfades and complete product information.
- **Loading:** no fake percentage loader. Preload only what Scene 06 needs and stream everything else.
- **Audio:** Web Audio synthesis, off by default, never blocking.
- **Routes:** `/nocturne`, `/nocturne/n01`, `/nocturne/collection`, `/nocturne/studio`, `/nocturne/enquire`.
- **Enquiry form:** a complete but non-functional demo, with the notice "Portfolio concept — enquiry submission disabled."

## Order of work

1. **A. Modelling environment** — done. Headless Blender 5.0.1 via `pip install bpy`, Python 3.11.
2. **B. N01 blockout** — done.
3. **C. Hierarchy validation** — done.
4. **D. Proportion renders** — delivered in `review/blockout/`. **Awaiting client approval.**
5. **E. After approval:** surface refinement → materials → glass → camera work for Scenes 06–09 → the signature transition.

The signature slice (Scenes 06–09) is approved only by visual review against the Round 3 item 15 bar. No comparative visual judge is configured, so Forge cannot self-certify it.
