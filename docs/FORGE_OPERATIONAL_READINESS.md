# Forge Operational Readiness

Forge has two different meanings of "ready":

1. **Code ready** — the checked-in runtime, Studio, schemas, tests and build pass.
2. **Operationally ready** — the external services required by a specific workflow are actually configured.

Do not confuse the two.

## Before starting a client project

Run:

```bash
npm run forge:readiness
npm run verify
```

For solo local Studio work, use:

```bash
npm run studio:local
```

That disables Studio authentication only for that local process. Shared and production environments should keep authentication enabled and configured.

## What works without external creative services

The checked-in Forge runtime, Studio authoring surfaces, camera/motion/interaction systems, schemas, local asset intake, project generation, validation, rendering, deterministic visual/runtime checks, Director planning proxies, prompt/construction intelligence and browser test suite do not require Meshy, Higgsfield or an external multimodal judge merely to run.

## What requires configuration

### Project Vault
Requires `FORGE_GITHUB_REPOSITORY` and `FORGE_GITHUB_TOKEN`.

Without them, browser authoring still works, but you do not have durable GitHub-backed checkpoints.

### Meshy generation
Requires `MESHY_API_KEY`.

Without it, Forge can use/import existing GLB assets but cannot request Meshy 3D generation from Studio.

### Higgsfield generation
Requires `HF_API_KEY_ID` and `HF_API_KEY_SECRET`.

Without them, Forge can use/import existing image/video assets but cannot request provider generation from Studio.

### Asset Vault
Requires `FORGE_ASSET_VAULT_ENDPOINT`, `FORGE_ASSET_VAULT_PUBLIC_BASE_URL` and `FORGE_ASSET_VAULT_TOKEN`.

Without it, generated provider output may be usable as a temporary draft bridge, but Guided Ship intentionally blocks a final release that still depends on temporary generated-file delivery.

### Multimodal Visual Critic
Requires `FORGE_VISUAL_CRITIC_URL` and, when the endpoint requires it, `FORGE_VISUAL_CRITIC_TOKEN`.

Without it, Forge can still run deterministic layout/runtime findings, motion checks and browser verification. It cannot truthfully self-approve a candidate as visually better through the evidence-gated Loop Engine.

### Director rendered judgment
Requires `FORGE_DIRECTOR_JUDGE_URL` and a valid `FORGE_DIRECTOR_JUDGE_CALIBRATION_JSON`.

Without this, Director planning still works, but the rendered creative verdict remains `UNVERIFIED` and production authorization is held.

### Remote Loop Engine
Requires:
- `FORGE_LOOP_REMOTE_ENABLED=true`
- GitHub repository/token
- visual critic endpoint

The local Loop runner is separate. Remote Studio dispatch intentionally fails closed when these are missing.

### Review-PR publishing
Requires:
- `FORGE_STUDIO_PUBLISH_ENABLED=true`
- a sufficiently long `FORGE_STUDIO_PUBLISH_SECRET`
- GitHub repository/token

This is disabled by default.

## What no automated gate can guarantee

A green `npm run verify` proves the checked-in contracts and tested workflows pass. It does **not** prove:

- the design is world-class;
- client assets are strong enough for hero use;
- a generated GLB is art-directed well;
- the exact experience holds 60fps on every physical device;
- typography/camera/lighting taste is correct;
- a prompt will produce an elite site in one pass.

High-end results still depend heavily on the quality of the asset set, reference deconstruction, art direction, scene composition, camera choreography, typography, and rendered iteration.

Forge should reduce the amount of guesswork and repeated engineering required. It cannot turn weak creative direction or weak source assets into award-level work automatically.

## Current practical ceiling

With strong client assets and deliberate art direction, Forge is technically capable of sophisticated cinematic sites using persistent WebGL, GSAP, camera choreography, named-node GLB animation, masks, refraction/warp transitions, scroll/pointer interaction, mobile adaptation and semantic DOM.

The realistic bottleneck is no longer "does the runtime have the primitive?" for most common premium immersive patterns. The bottleneck is increasingly **direction and finishing quality**: deciding the right idea, composing it well, and iterating against rendered evidence.

That distinction should remain explicit in every project review.
