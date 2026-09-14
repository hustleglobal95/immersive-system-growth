# HELIOT / Observatory for the unseen

## Original art provenance

Generated with the built-in image-generation tool for this project, then encoded as local WebP assets. The imagery depicts fictional architecture, not a real building or a commissioned architectural proposal. No external photographs or borrowed brand designs are used.

- `public/models/heliot/observatory-landscape.webp`: landscape campaign plate. Prompt: original photorealistic monumental upright bronze annulus observatory in a dark basalt desert, still reflecting pool, radial bronze fins, distant pale mountains and low afternoon sun framed by its opening, tiny human for scale, right-weighted composition, quiet left negative space, mineral patina and natural architectural detail. No text, logos, neon, floating objects or product-lens framing.
- `public/models/heliot/observatory-macro.webp`: same design used as the image reference. Prompt: an extreme architectural macro from inside the ring along its radial bronze fins, rhythmic diagonal shadows, brushed bronze with patina and hairline scratches, a narrow warm daylight shaft, deep charcoal left negative space, medium-format detail, no text or logos.

## Visual vocabulary

Warm mineral light, blackened bronze, chalk typography and restrained technical linework. Landscape has breathing room; macro has tactile density; the assembly is explicitly an architectural maquette; the lab is a useful interactive diagram; the field restores environmental scale. Photographic plates are spatially reframed with small pointer parallax, not claimed to be reconstructed 3D scans.

`ObservatoryPlate` is a camera-independent plane within the one persistent Canvas. It uses a directional macro reveal and circular aperture handoffs driven by CinematicFrame. It never starts a second render loop. `TerrainField` is deterministic line geometry, with lower density on low quality. `lightLab` synchronizes an actual geometric opening, ray width, semantic output and exports. The radial aperture is a conceptual circular diaphragm, not a mechanical engineering simulation.

The optional user-activated atmosphere is synthesized locally through Web Audio. It starts only on request and releases its audio context when muted or unmounted.

## Files for maintainers

The canonical generator is `scripts/generate-heliot.mjs`; edit it before regenerating either GLB or timeline. The named nodes preserve Forge ProductRig compatibility. `asset-manifest.json` records both model tiers and the two visual plates with byte counts and SHA-256 hashes. The designed SVG field sheet is generated locally from the visitor's selected finish and aperture; the companion JSON export contains the same settings.
