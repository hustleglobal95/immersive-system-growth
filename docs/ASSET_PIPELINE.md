# Asset Pipeline

Forge does not generate production assets. It gives those assets a reliable runtime.

## Preferred formats

- Models: `.glb` for delivery, `.gltf` when external texture organization is useful.
- Textures: WebP/AVIF for ordinary images; KTX2/Basis for GPU texture compression when your pipeline supports it.
- Environment maps: optimized HDR/EXR-derived assets appropriate for web delivery.
- Video: compressed MP4/WebM only when video is necessary for art direction.

## Directory contract

```text
public/models
public/textures
public/hdr
public/video
```

Register planned assets in `config/asset-manifest.json` and run `npm run assets:audit` before shipping.

## Model preparation

1. Delete hidden or unused geometry.
2. Merge static meshes when it reduces draw calls without harming material control.
3. Reuse materials and textures.
4. Bake details that do not need geometry.
5. Generate LODs for large scenes.
6. Compress geometry with Draco or Meshopt where appropriate.
7. Resize textures to the smallest resolution that survives the intended camera distance.
8. Test on mobile hardware, not only desktop emulation.

## Architectural environments

For a navigable house or restaurant, do not ship one monolithic 300 MB model. Break the environment into zones or rooms and load the next zone before the camera reaches the threshold.
