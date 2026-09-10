# Optional r3f-scroll-rig Integration

Forge already owns normalized scrolling and one persistent R3F canvas. Add `@14islands/r3f-scroll-rig` only when you need precise DOM element bounds mirrored into WebGL, such as a 3D object that must exactly track an HTML card while the layout reflows.

Do not add a second smooth-scroll controller. Keep Lenis as the scroll owner unless you deliberately refactor the runtime.

Integration strategy:

1. Install the package.
2. Wrap the existing canvas architecture according to the package's current documentation.
3. Use scroll-rig trackers only for DOM-to-WebGL registration.
4. Keep Forge normalized scene progress as the cinematic timeline.
5. Test responsive alignment at multiple DPR values.
