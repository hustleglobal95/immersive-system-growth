# Experience modes

Forge ships six production composition modes. They are complete runtime arrangements, not visual tags. Each mode selects how the same validated scenes, camera choreography, media, product rigs, semantic content and interaction graph are presented.

| Mode | Dominant behavior | Runtime proof | Fallback |
| --- | --- | --- | --- |
| Scroll Storytelling | Pinned narrative chapters synchronized to the continuous scene timeline | Existing narrative document, camera sampler, cinematic media and reversible transitions | Linear semantic document |
| Floating Navigation | Contextual expandable navigation tied to the active scene | Keyboard-safe floating chapter control and active-scene state | Native chapter anchors |
| Interactive Cards | Scene-linked layered card deck | Click, keyboard and touch-safe card navigation driven by the scene store | Static card sequence |
| Big Hero Type | Oversized editorial typography composed with the visual world | Responsive type scale and alternate narrative composition | Standard readable headings |
| 3D Product View | Product inspection, orbit and guided feature progression | Existing ProductRig, R3F raycasting, deterministic tracks, hotspots and inspection controls | Poster-led product document |
| Motion Cues | Direction, progress and next-scene guidance | Live progress meter, scene direction and chapter actions | Native document order |

## Select a mode

Set `activeMode` in `config/experience-modes.json`. Studio exposes all six modes under Visual Systems and exports the reviewed manifest. Only one mode owns the dominant composition at runtime. It may still reuse supporting primitives from the other modes.

## Completion contract

A mode is releasable only when:

1. `parseExperienceModes` accepts the exact six-mode registry.
2. `auditExperienceMode` reports no structural failure for the selected project.
3. Semantic scene content remains available without WebGL or motion.
4. Pointer, touch and keyboard paths remain usable.
5. Reduced motion resolves to the declared fallback composition.
6. `npm run check`, `npm run build` and the production browser suite pass.

The 3D Product View additionally requires a registered model or product rig. Declaring the mode without suitable geometry is rejected by the project audit instead of being presented as a completed product experience.
