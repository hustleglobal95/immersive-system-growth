# HELIOT — The Anatomy of Light

An original fictional optical instrument, presented as a continuous ten-act film.
Route: `/heliot`. Existing Atelier Maris production configuration and Studio remain intact.
The subject is a purpose-built, reproducible GLB with named machined components, not a reference model.

## Direction

Obsidian aluminum, warm titanium, petrol-coated glass, chalk typography and one vermilion index. Large editorial numerals contrast with small instrument markings. The lens is the sole persistent subject. Its optical axis is Z; front faces +Z. No remote photography or runtime CDN assets. Specifications describe the concept, not a purchasable or scientifically validated lens.

## Shot list

All coordinates are world units, looking near the origin. Each ending camera equals the next starting camera. Mobile uses wider framing and lower text placement. The floor is y=-2.1; all camera paths stay above it and outside the assembled body.

| Act | Purpose / camera from → to | Path | Subject / environment | Type / interaction / handoff |
|---|---|---|---|---|
| 01 First light | [4.2,2.2,7.2] → [4,1.8,7] | Dolly | Assembled instrument, softbox rim | Oversized LIGHT; scroll invitation; orbit reveals front |
| 02 Form | [4,1.8,7] → [-4,2.4,7] | Subject orbit | Machined crown catches key | Masked two-line statement; silhouette turns into surface |
| 03 Surface | [-4,2.4,7] → [-2.5,1,4.8] | Dolly | Close lateral engraving study | Restrained material notes; rear ring conceals the internal train |
| 04 Separation | [-2.5,1,4.8] → [6,3,8] | Pullback | Named optical groups separate along Z | Technical index; separation exposes optical axis |
| 05 Optical path | [6,3,8] → [7,2,5] | Arc | Separated optics; deterministic line rays | Progressive optical section diagram; ray paths become focal plane |
| 06 Aperture | [7,2,5] → [0,0.8,9] | Subject orbit | Nine-blade diaphragm; quiet frontal composition | Accessible aperture simulator; diameter changes ray cone |
| 07 Your perspective | [0,0.8,9] → [3,1.6,8] | Arc | Product reassembles; orbit inspection | Finish choices, keyboard/drag rotation, reset; controls hold composition |
| 08 Convergence | [3,1.6,8] → [-5,3,7] | Subject orbit | All components return exactly to baseline | Short statement; light draws out body edge |
| 09 Signature | [-5,3,7] → [4,2,9] | Crane | Complete lens over instrument grid | Large 01; full object portrait; slower camera settle |
| 10 Keep the light | [4,2,9] → [4,2,9] | Linear hold | Warm neutral resolve | Save local configuration as JSON; replay; no fake email or checkout |

## Implementation contract

- ExperienceConfigProvider, ScrollController, CinematicFrame, CameraRig, ProductRig, shared progress channel, renderer lifecycle and adaptive quality are reused.
- The scroll and keyboard controllers become provider-aware; default behavior stays unchanged.
- Only the optical field and editorial overlay are project-specific. R3F useFrame and Forge's progress channel are their only clocks.
- GLB has high and low tessellation editions. No product animation bypasses named-node ProductRig tracks.
- Semantic chapter content is present without WebGL. A static authored optical silhouette is the fallback; controls still work without GPU.
- Reduced motion retains one stable camera and readable chapters. No automatic spins or shader time animation.
- Chapter navigation, inspection, finish selection, aperture simulation, configuration export and replay work with keyboard and touch.
- No external messages, fake lead capture, analytics or payment flow.

## Verification

Run existing Forge checks and build; add route-specific tests for ten acts, camera continuity/safety, GLB node resolution, reverse track reconstruction, keyboard controls, exports, narrow viewport and reduced motion. Capture rendered desktop/mobile evidence from the production server.
