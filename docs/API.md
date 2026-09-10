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
