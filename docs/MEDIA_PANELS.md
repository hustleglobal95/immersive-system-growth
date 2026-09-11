# Cinematic media panels

Open `/lab` and enable **Preview media transitions (illustrations)** to inspect the overlap using original CSS fixtures. These are timing and composition studies, not final photographic artwork. The existing timeline scrubs the panels in either direction. Reduced motion removes the fixed animated layer.

For production, add optional `media` to scenes in `config/experience.json`:

```json
{
  "kind": "image",
  "src": "/textures/client/product.webp",
  "alt": "The client's product in a warm studio",
  "position": [65, 50],
  "mobilePosition": [72, 50],
  "overlap": 0.25,
  "direction": "up",
  "zoom": 1.06,
  "textEnd": 0.28
}
```

This path is illustrative; supply the actual file and register its path, bytes and hash in the texture manifest before validation. For video use `kind: "video"`, a compressed source registered in the video manifest, and a mandatory `poster` registered in textures. Videos loop muted; video playback is not frame-scrubbed. Playback failure leaves the poster, offscreen/background playback pauses, and reduced-motion/no-JS content uses the poster only.

The incoming panel begins during the last `overlap` fraction of the preceding scene. It covers the outgoing panel, which retreats by 35% of the viewport. The inner media counter-moves inside an oversized clipped wrapper. Uniform scale preserves product proportions. `direction` describes that panel's entrance, and outgoing motion follows the next panel's direction. The final scene holds through progress 1. Camera/DOM/panels use the existing cinematic time; there is no Observer gesture interception or second smooth-scroll controller.

`position` and `mobilePosition` use x/y percentages. Mobile caps zoom at 1.04 and reduces inner translation. `textEnd` determines how far into the scene its separate readable text settling lasts. The persistent DOM copy retains native links and disclosures; no duplicate animated copy receives focus. Static media uses alt text and stays in the document without JavaScript. Animation media is decorative and aria-hidden.

Only the current and adjacent scene media are mounted in the animated layer. First paint and arbitrary jumps may show the neutral panel background until the selected image decodes. The semantic image remains a separate baseline, so browser caching and asset compression still matter. Use adjacent media scenes for an uninterrupted montage; an unconfigured scene returns to the 3D world. Missing media never removes the copy.

References studied: Codrops [FullscreenScroll](https://github.com/codrops/FullscreenScroll) for nested panel/inner motion, [ScrollPanels](https://github.com/codrops/ScrollPanels) for independent container/image transforms. This implementation is original; no demo assets or source code were copied. Scene plans remain required for authored experiences.
