# Product choreography upgrade

## Goal

Turn Forge from a single-object cinematic starter into a reusable product-story engine capable of ingredient explosions, product reassembly, branded editorial interludes, menu grids and conversion scenes.

## Research decisions

- Keep one persistent canvas and the existing normalized scroll timeline.
- Adopt the DOM/WebGL synchronization principle documented by 14islands without adding a second scroll owner.
- Adopt Theatre.js-style property tracks as a deterministic JSON format instead of adding Theatre.js to the runtime.
- Follow React Three Fiber guidance: sample in useFrame, mutate owned objects, share immutable geometry and avoid scene remounts.
- Require named GLB nodes, inspired by the model preparation workflow in gltfjsx.

## Scene plan

| Scene | Camera | Product state | DOM module | Transition |
| --- | --- | --- | --- | --- |
| Arrival | Low macro push | Complete burger | Brand promise | Camera closes toward the product |
| Ingredients | Rising arc | Named ingredients separate | Ingredient statement | Parts separate in depth and height |
| Signature | Frontal pullback | Parts hold, then reconnect | Brand band | Product passes behind the brand field |
| Menu | Offset orbit | Reassembled burger moves aside | Menu grid | Product creates space for the menu |
| Meal | Table-level crane | Burger settles toward tray | Meal composition | Camera and product descend together |
| Order | Stable pullback | Complete product becomes supporting visual | Order summary and CTA | Motion resolves into a usable action |

## Required assets

- Original named-node burger GLB and low-cost variant
- No copied restaurant branding, photography or menu content
- Production replacements should use optimized PBR GLBs and KTX2 textures

## Release evidence

- Schema rejects invalid and discontinuous tracks
- Rig audit verifies required names in local GLBs
- Forward and reverse sampling is history independent
- Content remains readable without WebGL or JavaScript
- Mobile uses deliberate camera framing and the low-cost model
- Browser tests cover modules and product-rig runtime
