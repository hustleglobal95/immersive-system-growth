# Forge project model

The Forge project manifest is the release spine for an immersive experience. It connects the validated experience, Studio project, creative direction, and asset manifest without duplicating those documents.

## Contract

`config/forge-project.json` is intentionally small. It owns project identity, canonical document paths, performance budgets, capability policy, and release policy.

- `paths` identifies the documents consumed by Studio, runtime, validation, and deployment.
- `performance` turns visual ambition into an explicit budget for critical bytes, scene preload, active assets, total assets, draw calls, triangles, and target frame rate.
- `capabilities` records whether WebGL, WebGPU, XR, and spatial audio are disabled, enhanced, or opt-in for the project.
- `release` describes the deployment provider and review requirements. Secrets remain in server-only environment variables.

## Invariants

1. The experience path and creative direction path must match the paths in `studio-project.json`.
2. Every referenced JSON document must be inside the repository and pass its own schema.
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