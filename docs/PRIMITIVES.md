# 3D Primitives

Forge includes reusable building blocks for common immersive-site requirements.

- `GLTFModel`: cloned GLB/GLTF model loader.
- `PanoramaDome`: equirectangular 360-degree image environment.
- `ImagePlane`: image mapped onto a spatial plane.
- `VideoPlane`: muted inline video texture for screens and environmental footage.
- `HtmlScreen`: real DOM transformed into 3D space for interface mockups.
- `GlassPortal`: transmission-material threshold surface.
- `Occluder`: depth-writing geometry for controlled hidden swaps.
- `ReflectiveFloor`: studio/product reflection surface.
- `SceneZone`: keeps scene-specific groups mounted only near their active scene.
- `ForgeChrome`, `ForgeMatte`, `ForgeGlass`, `ForgeEmissive`: material starters.

These are primitives, not art direction. Replace their defaults per project.

Additional motion-aware primitives:

- `AnimatedGLTF`: plays a GLB animation clip normally.
- `ScrubbedGLTF`: maps a GLB clip to one scene's scroll progress.
- `ScrubbedVideoPlane`: maps video time to scene progress.
- `QualityGate`: mounts expensive children only above a chosen quality tier.
- `ScenePortal`: a real offscreen scene rendered through MeshPortalMaterial; low quality and reduced motion use a static surface. `GlassPortal` remains the separate transmission primitive.
