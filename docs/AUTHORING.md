# Build a new experience

1. Choose a reference with the closest narrative structure, apply it, and commit the result before editing.
2. Establish world units, origin and floor height. References use meters as an authoring convention and place the floor near y=-1.2. Measure your imported model's bounds before choosing camera coordinates.
3. Register optimized assets in config/asset-manifest.json with bytes and optional sha256. Remote assets require HTTPS and declared bytes. Local assets go under public/models, textures, hdr or video. The recursive audit rejects absent assets and over-budget files.
4. Define scene ranges covering 0..1 and copy/CTA for each scene. Use real semantic content; 3D-only details are never the sole content path.
5. Match every camera/hero end state to the next start. Dolly is intentionally a linear alias. Other path offsets preserve endpoints. Use waypoints for Catmull-Rom paths, and mobileCamera when portrait framing needs different coordinates. Camera/target equality and invalid FOVs are rejected. Camera clearance against your actual geometry still needs visual review.
6. Use heroModel/heroLowModel for a single transforming product. For a persistent environment set heroVisible=false and register assets instead.

For an assembled product, add `productRig` with required GLB node names and global keyframe tracks. Use position or rotation offsets for separations, multiplicative scale tracks for squash/stretch, and opacity only when the rig owns cloned materials. Run `npm run rig:audit` before visual review. See [product rigs](PRODUCT_RIGS.md).

```json
{
  "id": "building",
  "kind": "model",
  "url": "/models/building.glb",
  "lowUrl": "/models/building-low.glb",
  "persist": true,
  "position": [0, 0, 0],
  "rotation": [0, 0, 0],
  "scale": 1,
  "animation": { "sceneId": "threshold", "clip": "door-slide" }
}
```

Asset kinds are model, image, panorama, environment and video. Video may specify sceneId for scrubbing; otherwise it plays muted when motion preferences permit. Model animation binds a named embedded clip to scene-local progress. Use scenes:[...] for transient membership; persist=true means world presence across the whole timeline. Model neighbors are preloaded only within runtime.preloadMb; do not put every giant room in the persistent set.

7. Add semantic hotspots with matching scene IDs. Their native details remain usable even when the mesh trigger is unavailable. WebGL mesh clicks open the nonmodal DOM detail dialog.
8. In /lab enable free camera, inspect position/target/FOV and copy the state into config. Enable authoring guides to inspect paths and shader/portal examples. Return to controlled camera and test forward, reverse, large jumps, restoration and resizing.
9. Run all validation/build/browser gates. Record actual device evidence and asset dimensions. A passing asset-byte audit does not establish decoded texture/GPU budgets.

## Primitives and transitions

ScenePortal now renders children into a real MeshPortalMaterial destination, with a low-tier static fallback. GlassPortal is the separate transmissive threshold surface. ShaderSurface owns starter uniforms, time, transparency and depth-write policy. Transition helpers are pure values to bind to owned material/model state, not automatically active transitions. SceneZone is an optional transient-mount helper; do not use it for an object whose identity must persist.

Avoid competing transform writers. GSAP reveal helpers are optional DOM utilities; the primary narrative does not depend on them. When adding a component, document asset ownership, release behavior, reduced motion, low-tier rendering and failure UI.
