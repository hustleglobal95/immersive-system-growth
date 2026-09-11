# Camera Paths

Forge ships with camera path presets in `src/lib/cameraPaths.ts`.

- `linear`: direct interpolation. Use for restrained movement or technical UI scenes.
- `dolly`: direct physical approach or retreat. Best when the lens relationship should stay legible.
- `arc`: adds lateral curvature to reveal volume around architecture or a product.
- `orbit`: adds a fuller rotational sweep. Use sparingly because excessive orbiting feels like a model viewer.
- `crane`: adds vertical rise through the middle of the move. Useful for architecture, vehicles and large products.
- `threshold`: pushes through depth in the middle of the move. Use for doors, windows, portals and occluding geometry.
- `flyby`: adds strong lateral travel around a subject. Useful for vehicles and large architecture.
- `swoop`: introduces a controlled vertical dip. Useful for dramatic reveal beats.
- `macro`: biases the middle of a move closer to the subject for detail transitions.
- `pullback`: creates a broader reveal by adding retreat through the middle of the path.
- `subject-orbit`: spherical interpolation around the look-at target, using the shortest azimuth sweep and interpolated radius/elevation. Preserves exact endpoints and avoids the straight-line chord through the target. Unlike legacy `orbit`, this is subject-relative rather than a sinusoidal offset.

## Cinematic rules

Prefer motivated camera movement. The camera moves because the visitor is approaching, inspecting, entering, revealing or leaving something. Avoid random rotations. Keep FOV changes subtle unless the lens shift is itself part of the transition.

For photoreal architecture, keep most FOV values roughly in the 32 to 55 range and avoid extreme perspective unless art direction calls for it.

## Multi-point spline paths

For moves that cannot be described by a two-point preset, add `waypoints` to the scene camera. Forge samples a Catmull-Rom spline from the start position through those points to the end position. `targetWaypoints` can independently curve the look-at target.

```json
"camera": {
  "path": "linear",
  "waypoints": [[1.2, 0.8, 4.0], [0.2, 1.1, 2.4]],
  "targetWaypoints": [[0, 0.4, 0]],
  "from": { "position": [2, 1, 6], "target": [0, 0, 0], "fov": 42 },
  "to": { "position": [0, 0.2, 1.6], "target": [0, 0, -1], "fov": 46 }
}
```

Use spline waypoints sparingly. Too many points produce a floating drone-camera look.

## Subject camera shots in the lab

In `/lab`, set the subject's bounding-sphere radius in world units, then select Low reveal, Hero orbit or Detail approach. Scrub the existing timeline within that scene. The preview uses the current camera target as its focus and does not modify the saved configuration. Clear the selection to restore the configured camera; leaving the lab also resets the preview.

For a specific close-up, clear the preview, enable Free camera, aim at the detail and wait for camera telemetry to update, then choose Detail approach with a smaller radius. Radius is supplied by the author, not inferred from the mesh. The radius input is applied when choosing a shot or pressing Apply radius to shot.

Export camera shot JSON provides desktop and portrait camera definitions. Copy these into a scene's `camera` and `mobileCamera`. Reconcile neighboring endpoints, scene purpose and easing, then run cinematic audit. Exporting is intentionally separate from changing the configured narrative.

The fit calculation uses the narrower of vertical and horizontal field of view and a 15% margin. It frames a sphere at the focus, not an arbitrary environment. The low shot can go below ground; check clearance and edit endpoints for the actual scene. Portrait export is designed for 9:16. Test narrower screens separately. No collision avoidance, focus blur, lighting upgrade or photoreal assets are implied by these camera moves.
