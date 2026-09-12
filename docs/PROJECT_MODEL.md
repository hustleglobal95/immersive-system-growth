# Forge project model

The Forge project manifest is the release spine for an immersive experience. It connects the validated experience, Studio project, creative direction, asset manifest and visual-systems manifest without duplicating those documents.

## Contract

`config/forge-project.json` is intentionally small. It owns project identity, canonical document paths, performance budgets, capability policy, and release policy.

- `paths` identifies the documents consumed by Studio, runtime, validation, and deployment. The visual-systems path keeps authored instancing, particle fields and fallback policy in the release bundle.
- `performance` turns visual ambition into an explicit budget for critical bytes, scene preload, active assets, total assets, draw calls, triangles, and target frame rate.
- `capabilities` records whether WebGL, WebGPU, XR, and spatial audio are disabled, enhanced, or opt-in for the project.
- `release` describes the deployment provider and review requirements. Secrets remain in server-only environment variables.

## Invariants

1. The experience path and creative direction path must match the paths in `studio-project.json`.
2. Every referenced JSON document must be inside the repository and pass its own schema, including visual systems.
3. Budgets are ordered: critical bytes, scene preload, active scene, then total assets.
4. Runtime code reads project policy through validated configuration. It must not invent capability or performance limits.
5. A project export must contain the manifest and every referenced document so another machine can reproduce the same build.

## Lifecycle

```text
Import assets and content
        ↓
Inspect and map
        ↓
Direct timeline and transitions
        ↓
Validate the Forge project
        ↓
Open a review pull request
        ↓
Deploy the exact reviewed commit
        ↓
Measure the released experience
```

The manifest is the first layer of the larger authoring-to-deployment system. Timeline tracks, node mappings, presets, content sources, deployment metadata, and telemetry releases will reference its stable project ID rather than creating parallel project identities.
## Reproducible client bundles

A generated client project contains its experience and visual-systems documents beside its Studio project. Run `npm run project:new -- client-slug recipe` to create the bundle, then `npm run project:validate` to validate every referenced document. The canonical project uses `config/visual-systems.json`; client bundles use an isolated `clients/<slug>/visual-systems.json` so art direction can evolve per engagement.


`npm run release:report` is the handoff checksum. It fingerprints every referenced runtime document plus the project policies, giving deployment and QA a compact proof that the shipped configuration matches the reviewed commit.
