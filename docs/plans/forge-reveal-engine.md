# Forge Reveal Engine plan

## Runtime reveal sequence

| Scene state | Purpose | Camera start | Camera end | Path | Persistent object | Environment | Typography | Interaction | Transition | Assets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Incoming media | Introduce the next visual without breaking the continuous world | Inherited from authored scene | Authored scene start | Existing scene preset | Existing hero pose | Existing world state | Existing copy remains semantic DOM | Native scroll in both directions | Mask threshold moves from hidden to visible | Authored image or video plus poster |
| Scene hold | Preserve a readable hero frame while the mask is fully open | Authored scene start | Authored scene end | Existing scene preset | Existing hero track | Existing world interpolation | Copy reaches its readable hold | Studio-adjustable mask parameters | Mask remains fully open | No additional asset |
| Outgoing media | Hand the frame to the next scene | Authored scene end | Next scene start | Existing scene preset | Existing hero track | Next world begins underneath | Current copy exits while next copy enters | Reverse scroll reconstructs the prior frame exactly | Outgoing alpha and next mask overlap | Next scene media when present |

## Mask Lab scene

- Purpose: author and compare reveal presets before exporting production JSON.
- Camera starting state: fixed two-dimensional preview with no cinematic runtime.
- Camera ending state: unchanged.
- Camera path preset: none; the preview isolates mask behavior.
- Persistent object state: reference media remains fixed while the mask changes.
- Environment change: neutral contrast background supports edge inspection.
- Typography behavior: controls and status remain static and readable.
- Interaction opportunity: scrub progress, play the reveal, select presets, and adjust renderer, direction, origin, softness, scale, rotation, intensity, seed, edge, and inversion.
- Transition into the next scene: exported settings become part of the selected scene media configuration.
- Required assets: none for preview; production uses an authored image or video already registered in the asset manifest.

## Ownership and fallback

- The normalized Forge progress remains the only runtime timeline.
- DOM masks own efficient gradient and shape reveals.
- The existing persistent React Three Fiber canvas owns shader reveals. No second runtime WebGL context is created.
- Automatic mode reserves shader masks for high quality devices and uses DOM masks elsewhere.
- Reduced motion removes cinematic media and preserves the semantic in-flow media.
- Every preset has exact progress endpoints and deterministic reverse sampling.
