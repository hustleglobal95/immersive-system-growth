# Spatial flight revision

The landscape becomes real geometry. The generated exterior remains a fallback image, not the active scene. One persistent world contains basalt terrain, a reflection basin, the full-size annular gateway, its radial passage, and an underground light gallery. A smaller assembly is exhibited inside the gallery.

| Act | Camera / motivation | Persistent subject and handoff |
|---|---|---|
| Arrival | Aerial oblique [5,2.2,8] to [-2,1.2,3], curved flight around the basin | Terrain gives parallax and gateway establishes scale; title clears the flight |
| Threshold | Descend and align with the opening, crossing z=0 to [0,0,-1.4] | Real bronze fins pass beside the camera; foreground occlusion is architectural |
| Interior | Descend along a curved radial passage into the gallery at [0,-5.2,-12] | Vault ribs, light slots and floor inlay reveal inhabitable depth |
| Anatomy | Arc around the gallery exhibit toward [5,-3.5,-11] | ProductRig separates the smaller exhibit at z=-16; gateway remains behind the visitor |
| Transmission | Descend toward [0,-4.9,-11] | Rays connect the gallery's suspended assembly with its rear wall |
| Light lab | Frontal hold and gentle withdrawal toward [0,-4.9,-10] | Accessible aperture remains an actual geometric opening |
| Inspection | Lateral arc toward [3,-4.5,-11] | Finish/orbit controls affect the exhibit; architecture stays fixed |
| Return | Reverse-facing flight backs through the gateway to [0,.3,3] | Real passage occludes the gallery and opens onto the landscape |
| Aerial reveal | Crane and orbit above the terrain toward [-5,4,7] | Basin, roof and mountains become legible in plan |
| Resolve | Settle at [4,2.6,6] | Exterior portrait and field-sheet export; reverse scroll reconstructs every position |

All movement uses Forge's arc-length spline sampler and shared CinematicFrame. Mobile widens the lens while keeping the same navigable aperture path. Flight clearance is validated against the actual open aperture, passage radius, gallery boundaries and terrain height rather than treating a hollow gateway as a solid bounding box. The geometric exhibit remains subject to Forge's spatial validation. No independent animation loop, prerecorded flythrough or static-image zoom stands in for entering the environment.

## Physical set and framing

The gallery floor is at y=-6.66 (top surface); its roof lies below the landscape. The descending passage has a 1.07-unit interior radius and 48 bronze ribs. Its actual centerline is exported by `flightGeometry.ts` and used in camera-clearance tests. The portal, tunnel, terrain, water, exhibit and gallery are geometry. Far mountains use an original static matte on a 90-unit-radius distant cylinder, a normal distant-set technique rather than a simulated foreground flythrough. Gallery interior visibility is portal-culling driven; its geometry never scales or moves to simulate entry.

The camera adds a bounded five-degree bank from local path curvature. Both viewports preserve the physical route. Subject-framing checks apply to exterior portraits and exhibit holds; passage shots instead check physical radial clearance, a defined look direction, and the underground floor/ceiling bounds.
