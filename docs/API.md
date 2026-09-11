# Internal API Surface

Forge intentionally keeps the runtime API small.

## `experience`

Typed configuration loaded from `config/experience.json`.

## `sampleExperience(progress, reducedMotion)`

Pure scene sampler returning active scene, local/eased progress, camera state, hero transform, interpolated world state and postprocessing state.

## `sampleCameraPath(from, to, t, preset)`

Pure camera path sampler. Add reusable paths here instead of writing ad hoc camera math inside scene components.

## `useExperienceStore`

Global runtime state for scroll progress, velocity, active scene, pointer, quality, reduced motion, debug state, hotspot selection and render telemetry.

## `SceneZone`

Optional helper for mounting scene-specific 3D groups only near their active scene.

## `GLTFModel`

Reusable cloned GLB/GLTF model component.

## `thresholdHandoff`, `occlusionHandoff`, `modelExchange`, `surfaceDive`

Transition timing helpers for scene-specific visual handoffs.

## `inspectGlb(arrayBuffer)`

Pure GLB 2.0 inspector used by Studio and the CLI. Reports nodes, meshes, materials, animations, warnings and suggested named rig nodes without uploading a model.

## `applyScenePreset`, `applyMediaTransition`, `moveSceneBoundary`

Immutable Studio editing helpers. Their output must pass the production experience schema.

## `fetchContentSource`, `applyContentMappings`

Server-side content adapter and deterministic JSON-path mapper. Remote URLs require HTTPS and an explicit host allowlist in preview routes.

## `POST /api/integrations/preview`

Validates and previews one static, JSON or Shopify source. Request bodies are capped and remote calls have a five-second timeout.

## `POST /api/telemetry`

Accepts size-bounded, schema-validated anonymous performance events. Events are forwarded to `FORGE_TELEMETRY_WEBHOOK_URL` when configured or logged as structured server output.
