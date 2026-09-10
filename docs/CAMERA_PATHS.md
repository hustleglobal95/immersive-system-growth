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
