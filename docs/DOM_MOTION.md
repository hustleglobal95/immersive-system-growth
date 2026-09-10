# DOM Motion

Forge keeps important copy in HTML. `src/lib/gsapPresets.ts` contains restrained helpers for reveal, mask, scale, exit, parallax and emphasis motion.

These helpers are intentionally secondary to spatial motion. The camera and 3D world establish the scene first. Typography should enter with the scene, not compete with it.

For scroll-driven DOM choreography, bind GSAP timelines to the same scene ranges used by Forge rather than creating unrelated scroll triggers that drift from the 3D state.
