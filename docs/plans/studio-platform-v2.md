# Studio Platform v2 implementation plan

## Outcome

Turn Forge from a configuration-driven runtime into a multi-project production platform without weakening its persistent-world, deterministic-timeline, accessibility, or performance guarantees.

## Runtime scene contract

The current six-scene Ember Bun reference remains the proof experience. Studio edits produce the same validated `ExperienceConfig` consumed by the runtime.

| Scene purpose | Camera start | Camera end | Path | Persistent object | Environment | Typography | Interaction | Handoff | Assets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product arrival | Macro front | Near hero | macro | Complete burger | Dark ember | Editorial reveal | Scene navigation | Ingredient lift | Burger GLB |
| Ingredient proof | Near hero | Elevated orbit | arc | Named parts separate | Warmer key | Layer labels | Timeline scrub | Controlled reassembly | Burger GLB nodes |
| Signature assembly | Elevated orbit | Center hero | subject-orbit | Parts recombine | Ember rim | Brand statement | Preset preview | Brand band | Burger GLB |
| Menu | Center hero | Side composition | flyby | Product shifts aside | Restaurant surface | Semantic menu | Menu links | Meal handoff | DOM menu |
| Meal | Side composition | Table view | swoop | Product remains | Table light | Supporting copy | Scene navigation | Order surface | Burger GLB |
| Order | Table view | Conversion frame | pullback | Complete product | Conversion contrast | Semantic order card | CTA | End state | DOM order card |

All transitions remain reversible because Studio changes scene ranges and deterministic configuration rather than imperative animation history.

## Platform architecture

1. `/studio` runs outside the cinematic document and owns a local editable draft.
2. Drafts are validated with the same Zod schema as production configuration.
3. The visual timeline edits scene boundaries, copy, camera presets, media transitions, and product nodes.
4. GLB inspection operates in both the browser and CLI without uploading models to a third party.
5. Content integrations resolve during a controlled sync step and must still produce a valid experience.
6. Client generation creates isolated configuration folders; activation is explicit and recoverable.
7. Deployment automation runs validation and build before invoking the configured provider.
8. Telemetry collects coarse performance measurements only after consent, respects Do Not Track, and forwards to an optional server-side sink.

## Completion gates

- Browser editor imports, validates, edits, and exports configurations.
- GLB inspector reports nodes, meshes, materials, and animation clips.
- Presets apply deterministic scene and media changes.
- Integration mapping rejects unsafe endpoints and invalid output.
- Client generation and activation have automated tests.
- Telemetry payloads are size-bounded and schema-validated.
- Existing unit, build, accessibility, Chromium, and WebKit checks remain green.
