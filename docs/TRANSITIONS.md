# Transition System

A Forge transition should preserve spatial continuity whenever possible.

## Preferred transition classes

1. **Threshold pass**: camera moves through a door, window, opening or portal.
2. **Occlusion cut**: a foreground object fully covers the frame, allowing an environment swap while visually hidden.
3. **Persistent-object handoff**: the same hero object moves, rotates or scales into the composition of the next scene.
4. **Surface dive**: camera approaches a screen, material, liquid, glass or product detail until that surface becomes the next environment.
5. **Model exchange**: one model is replaced by another at the point of maximum overlap, motion blur or occlusion.
6. **Lighting handoff**: world geometry persists while lighting and atmosphere shift to change context.

## Avoid

- full-screen fades used as the default transition
- resetting the camera to a new origin without motivation
- spawning a second WebGL canvas for the next section
- decorative particles used to hide weak spatial logic

## Backward scroll

Every transition must work in reverse. Scrub the page from scene B back to scene A before approving the handoff.
