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

## `POST /api/inquiry`

Accepts a size-bounded, schema-validated lead from the conversion section. Consent is required and never inferred. Two spam gates run without asking the visitor to solve anything: a honeypot field and the time the form was on screen; a submission caught by either receives the same response a genuine one does and is not delivered. Submissions are rate limited per client. Leads are forwarded to `FORGE_LEAD_WEBHOOK_URL` when configured or logged as structured server output. A brochure request additionally returns a signed, expiring grant when `FORGE_LEAD_TOKEN_SECRET` is set; without the secret the lead is still recorded and no link is issued.

## `GET /api/brochure`

Releases a gated PDF against a grant from `/api/inquiry`. The token carries a brochure id and an expiry, never a path: the file name comes from the checked-in `conversion.brochure` config and is pattern-constrained to a lower-case PDF name, and gated files live outside `public`. Responses are `private, no-store`.

## `POST /api/telemetry`

Accepts size-bounded, schema-validated anonymous performance events. Events are forwarded to `FORGE_TELEMETRY_WEBHOOK_URL` when configured or logged as structured server output.
