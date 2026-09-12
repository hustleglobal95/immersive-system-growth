# Spatial Camera Intelligence

The camera system is geometry-aware. Director presets are not accepted solely because they match a narrative intent. Every candidate is evaluated against spatial feasibility, subject visibility, composition, continuity and runtime safety before it can win.

## Pipeline

1. Generate all Director choreography candidates.
2. Build a spatial scene from live bounds, extracted GLB geometry and deterministic proxies.
3. Run coarse collision and occlusion repair.
4. Run visibility-graph path planning around relevant obstacles.
5. Repair target aim and FOV when the subject leaves composition safe zones.
6. Re-evaluate desktop and mobile camera motion.
7. Penalize invalid geometry, failed routes, excess path complexity and scene-to-scene heading discontinuity.
8. Select the highest-scoring feasible shot and compile it into ordinary editable motion tracks.
9. At runtime, apply a damped live safety envelope so dynamic geometry cannot suddenly swallow the camera.

## Geometry sources

Spatial data can come from three levels:

- `live`: world-space bounds captured from rendered Three.js objects.
- `geometry`: bounds extracted from GLB POSITION accessors and transformed through node matrices.
- `proxy`: deterministic fallback bounds derived from authored asset and hero transforms.

The Director reports whether a selected shot used live, mixed or proxy bounds.

## Structural set capture

Navigable architectural sets are treated differently from product subjects. The set root is not considered one giant obstacle. Instead, named structural meshes such as walls, columns, counters, tables, railings and cabinets are registered individually when available. Floors, roofs, ceilings, doors, windows, glass and curtains are excluded from generic blocker capture so interior camera movement remains possible.

## Visibility-graph routing

`src/lib/spatialPathPlanner.ts` constructs local route candidates around geometry relevant to the blocked camera segment. Nodes are generated around expanded obstacle corners at several safe height levels. Edges are admitted only when the entire segment clears obstacles, the subject collision envelope and the floor.

A deterministic Dijkstra search minimizes:

- path length,
- unnecessary vertical travel,
- deviation from the authored route,
- blocked subject sightlines.

The resulting route is simplified by removing redundant waypoints before it is compiled back into the camera position track. Authored scene endpoints are preserved.

## Collision and occlusion are separate

A camera can be physically safe and still produce an unusable shot. Spatial evaluation therefore measures both:

- camera collision / clearance,
- camera-to-subject occlusion.

Occlusion can trigger its own reroute even when the camera itself never touches geometry.

## Composition repair

The planner independently checks the subject against desktop and portrait safe zones. If framing becomes unsafe, it can insert deterministic target and FOV keys to restore subject visibility without rewriting unrelated choreography.

Composition repair considers:

- subject depth,
- horizontal and vertical normalized screen position,
- subject fill,
- desktop vs mobile aspect ratio.

## Runtime safety envelope

`src/lib/runtimeCameraSafety.ts` protects the rendered camera from live obstacle bounds after authoring. If animated or interactive geometry moves into the current camera position, the system calculates the smallest safe exit vector and applies it through a damped correction in `CameraRig`.

This runtime layer does not rewrite sequencer tracks. It is a final physical safety layer for interactive states that could not be known when the shot was authored.

## Auditing

Run:

```bash
npm run camera:spatial:audit
```

The audit directs every scene across the shipped experience and recipe set and reports:

- hard-invalid selected shots,
- unsafe candidates rejected before selection,
- total reroutes,
- visibility-graph waypoints,
- occlusion-specific reroutes,
- composition repairs,
- failed route attempts,
- residual clearance, occlusion and framing warnings.

Spatial audit is included in `npm run check`, so hard spatial failures block CI.

## Design rule

Spatial intelligence must remain deterministic and reversible. Geometry analysis is allowed to change which shot wins and to add editable avoidance/composition keyframes, but it must not introduce hidden time-dependent state into authored camera motion.
