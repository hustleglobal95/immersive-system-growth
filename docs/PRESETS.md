# Forge preset registry

The preset registry makes scene direction portable. Presets are versioned data with a stable ID, descriptive metadata, requirements, and a deterministic application function.

## Kinds

- Motion presets generate ordinary `motionTracks` through the first-party sampler.
- Transition presets update a scene media transition, mask, direction, and brand blend settings.

Presets do not create a second animation engine. Applying a motion preset produces validated tracks in the same experience document that production renders.

## Workflow

1. Select a scene in Studio.
2. Preview a preset against the actual scene and mapped GLB nodes.
3. Apply it to the draft.
4. Edit the generated tracks normally.
5. Export or publish the validated experience document.

Preset track IDs are namespaced by preset ID, so applying a preset again replaces its own generated tracks without deleting hand-authored tracks from other systems.

The registry is available to Studio, the CLI, and `GET /api/presets`. Client projects can consume the catalog without importing internal editor state.