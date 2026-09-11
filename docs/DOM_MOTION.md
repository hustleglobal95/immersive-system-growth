# DOM Motion

Forge keeps important copy in HTML. `src/lib/gsapPresets.ts` contains restrained helpers for reveal, mask, scale, exit, parallax and emphasis motion.

These helpers are intentionally secondary to spatial motion. The camera and 3D world establish the scene first. Typography should enter with the scene, not compete with it.

For scroll-driven DOM choreography, bind GSAP timelines to the same scene ranges used by Forge rather than creating unrelated scroll triggers that drift from the 3D state.

## Cinematic DOM layer

`CinematicDomMotion` wraps server-rendered content and takes stable `CinematicCue[]` props. Each cue defines a root-scoped selector, an absolute normalized master-timeline range, and a preset:

| Preset | Use |
| --- | --- |
| `text-settle` | Small staggered vertical settling; text stays visible and semantic |
| `curtain` | A clipped decorative image reveal |
| `image-depth` | Slow image scale and vertical travel inside an overflow-hidden wrapper |
| `gallery-settle` | Staggered vertical and rotational settling for decorative tiles |

```tsx
const cues = [{
  selector: '[data-product-image]',
  range: [0.15, 0.35] as const,
  preset: 'image-depth' as const,
}];
// Wrap content with <CinematicDomMotion cues={cues}>...</CinematicDomMotion>.
// Decorative target: <div data-product-image aria-hidden="true">...</div>.
```

Use actual scene ranges. Decorative presets require `aria-hidden="true"` on each target and no interactive targets or descendants. Supply accessible product information separately. Keep image depth inside a clipped frame and animate a wrapper when an element already has a CSS transform. Existing narrative copy enables only `text-settle`, over each scene's first 28%; CTAs and disclosure controls are never hidden or moved.

`CinematicFrame` publishes its already-damped progress through `cinematicProgress`. Paused GSAP timelines seek to that exact sample; there is no additional ticker, smoothing loop, pin or ScrollTrigger. When WebGL is unavailable, the wrapper uses native master progress. Repeated values avoid timeline writes. Reverse and arbitrary seeks produce the same state.

Reduced motion tears down the timelines and restores original inline styles. Viewports at or below 760px get smaller travel and no gallery rotation. Breakpoint changes rebuild at current progress; unmount removes subscriptions and reverts GSAP context. No JavaScript leaves the original HTML intact.

This implementation is original code. Codrops OneElementScroll, ScrollTextMotion and OnScrollColumnsRows were research references; their code and assets are not vendored. This layer does not implement Flip layout handoffs or line splitting.
