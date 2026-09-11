# Cinematic DOM motion scene plan

Extend every existing scene without changing its camera, hero, environment, assets or ranges.

| Aspect | Plan |
| --- | --- |
| Purpose | Carry readable typography through the same cinematic time as the world |
| Camera start/end/path | Preserve each scene's configured camera and mobile path |
| Persistent object | Preserve configured hero state and model animations |
| Environment | Preserve sampled lighting, fog and postprocessing |
| Typography | Small staggered vertical settling during the first 28% of the scene; hold thereafter |
| Interaction | Native links and details remain visible and focusable throughout |
| Transition | Typography settles while the existing spatial transition proceeds; exact reverse seeking |
| Assets | No new assets; optional decorative media cues available to future scenes |

Publish the already-damped CinematicFrame progress to DOM subscribers. No second smoothing loop or independent ScrollTrigger. In the WebGL fallback path use native master progress. Reduced motion removes all authored transforms and clipping. Primary text never uses opacity, visibility, clipping or split text wrappers.

Reusable optional presets: decorative curtain reveal, image depth travel and staggered gallery settling. Only text settling is enabled on existing copy. No copied external code, media or additional dependencies.
