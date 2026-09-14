# Forge Studio: scene-authoring pass

Open `/studio` after starting this branch. This upgrades the existing workspace, not a second application. The default HELIOT and NOCTERRA source configurations are not overwritten by editing the browser draft.

## Workflow

Load HELIOT or NOCTERRA. Loading first preserves the outgoing experience in browser storage; returning to that preset restores it. The Project tab still owns deployment/project metadata: loading an experience is not changing that metadata.

Select a chapter. Use Camera for desktop/mobile position and look-at paths. Top and side views edit control points by dragging or arrow keys (Shift gives larger steps); add/remove intermediate waypoints without deleting endpoints. Orbit / edit view enables viewport navigation and selectable 3D path handles. Return to film camera before evaluating the authored flight.

Select a model in the viewport or Objects list. Translate/rotate/scale uses the existing transform gizmo. Scale is uniform to match the schema. Rotation and rotation snap are in radians. Hero transformations edit a scene endpoint; scene-asset transformations are shared across the scenes that use that asset. Fixed architectural geometry is not an arbitrary editable object graph.

Drag a model from Model Library into the preview, or supply a hosted HTTPS/root-relative GLB path. Placement begins near the current camera focus, not at a surface hit. Local files must first enter the asset intake/hosting pipeline; this pass does not upload binaries. Exported JSON references the asset URLs and does not package their bytes.

Lighting presets edit scene lighting without deleting geometry. Material controls edit hero material overrides. Use the chapter timeline for seeking and neighboring boundary adjustment. Keyframe sequencer opens the pre-existing motion-track editor against the same draft; motion tracks may override the base camera/hero values.

## Save and history

Continuous drags preview against a staged draft and commit one history operation on release. Save snapshot explicitly writes the current experience to browser storage. Export JSON validates the configuration and downloads a timestamped file. Neither action publishes or commits source files. Back up exported JSON; clearing browser storage deletes local drafts.

## Verification

`node --import tsx --test tests/studio-builder-authoring.test.ts` covers pure editing operations. The dedicated Studio editor workflow runs typecheck, targeted lint, these tests, a production build, and `scripts/verify-studio-editor.mjs`. Its artifacts contain screenshots, a validated exported configuration, and a pass/fail report. This workflow is separate from the repository's broader checks.

Not included: arbitrary mesh/terrain construction, binary uploads, automated deployment, or AI shot generation. No API keys, model credits, or asset-generation credits are consumed by this editor.
