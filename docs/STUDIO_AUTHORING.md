# Forge Studio: scene authoring

Open `/studio` from a running checkout of `feat/heliot-cinematic-experience`.
The editor uses the project's production renderer and experience schema. Changes
in the browser are drafts; exporting a file does not publish or deploy the site.

## Start with an experience

Choose **Load project > HELIOT** or **NOCTERRA**. The selector preserves the outgoing
experience draft under a separate browser-storage key and restores the selected
experience's last saved draft when present. This does not change the Project tab's
deployment metadata, asset manifest, or interaction graph. Review those separately
before preparing a client release.

Choose a chapter on the left. Scrub the chapter timeline or press Play. Desktop,
tablet, and mobile change the actual preview aspect ratio. Low quality reduces
rendering work while editing; inspect high quality separately on target hardware.

## Camera and paths

In **Camera**, select desktop or mobile framing. Mobile initially inherits desktop
until an override is authored. Choose a position or look-at target path, then select
a start point, waypoint, or end point. Edit XYZ numerically, drag a point in the top
or side diagram, or switch to **Orbit / edit view** to expose 3D path handles.

**Add waypoint** inserts a point after the selection. Endpoints cannot be removed.
FOV is constrained to the runtime schema. The path diagrams show control polygons,
not a collision guarantee. Motion tracks can override these base camera values.
Use **Return to film camera** to inspect the authored result.

## Objects and models

Select the hero or an asset in **Objects**, or click a visible model surface in the
preview. The Object inspector exposes position, rotation (radians), and uniform
scale. Transform gizmos operate on the selected editable object. Asset transforms
apply everywhere that asset is used; hero transforms affect the selected scene's
start or end pose. A drag is grouped into one undo operation.

Drag a model from **Model library** into the preview, click its Add button, or use a
hosted `/models/...glb` or HTTPS model URL. Local file dropping is not an upload
service. Upload/prepare those files first and keep their URLs available to the
runtime. Library insertion places the object near the current camera focus.

HELIOT's built-in architecture, terrain, tunnel and gallery are still authored in
code. They are not editable polygon meshes in this UI. This is a scene and motion
authoring tool, not a Blender replacement.

## Light and keyframes

Environment presets change scene lighting and atmosphere, not architecture or
fixed practical fixtures. Material controls override the hero's material, not every
object in the world. **Keyframe sequencer** opens the existing motion-track editor
for timed camera and other supported runtime properties. Return to the workspace
to preview the resulting scene.

## Saving and recovery

**Save snapshot** writes an experience snapshot in this browser. **Export JSON**
creates a portable experience configuration. It does not bundle GLBs, textures,
licenses, deployment settings or interactions. Keep the referenced assets with the
project, and apply the exported config to the appropriate experience source only
after reviewing the preview.

The shared Studio draft also autosaves locally. If storage is blocked or full, a
warning says the changes are only in memory; export before leaving. If a stored
draft cannot be parsed, the original string is retained, autosave is paused, and
**Export recovery copy** saves those exact bytes. **Reset draft** asks for confirmation
before replacing a preserved recovery draft. Browser storage is not a cloud backup.

## Verification

`node --import tsx scripts/verify-studio-editor.mjs` runs the production editor in
Chromium after `npm ci`, `npm run build`, and Playwright browser installation. It
checks camera edits, grouped diagram-drag undo, seeking, project recovery, actual
viewport ratios, numeric model transforms, keyframes and JSON export, and captures
screenshots under `test-results/studio-editor/`.

The dedicated **Studio editor verification** workflow runs independently of the
broader showcase suite. It also exercises storage-failure recovery and asset-kit
compatibility. Its low-quality SwiftShader checks are functional browser tests,
not a mobile-device or hardware frame-rate certification. Inspect direct 3D gizmo
interaction, occlusion, visual quality and client-specific assets on target devices
before delivery.
