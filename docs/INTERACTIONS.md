# Interaction Patterns

Immersive interactions should deepen the current scene rather than interrupt it.

## Hotspots

Forge hotspots are data-driven. Each hotspot belongs to a scene and 3D position. Clicking it updates shared state and opens accessible DOM detail content.

Good hotspot uses:

- material or architectural details
- product features
- room information
- screen modules
- pricing or specification details that belong to a visible object

## Pointer influence

The camera receives small pointer offsets for depth. Keep this subtle. Pointer motion should never make reading difficult or create a first-person-game feeling unless that is the explicit design.

## Scene navigation

The right-side scene rail maps directly to normalized progress. Keyboard arrow keys also jump scene-to-scene. Any new navigation must update the same master scroll coordinate rather than teleporting the WebGL state independently.
