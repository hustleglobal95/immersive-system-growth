# Performance Budgets

Cinematic does not mean unlimited rendering cost.

## Default quality tiers

- High: up to configured max DPR, 2048 shadow maps, soft shadow filtering, SMAA and mipmapped bloom.
- Medium: capped DPR around 1.5, 1024 shadow maps, SMAA and restrained bloom.
- Low: minimum configured DPR, 512 shadow maps when used, no decorative particles and no postprocessing.

The renderer uses sRGB output, ACES filmic tone mapping and PCF soft shadows. WebGL MSAA stays disabled at context creation so medium and high tiers can use predictable post-process SMAA while low-tier devices avoid the composer entirely.

The runtime selects an initial tier using screen width, memory hints and CPU concurrency. Runtime pressure then passes through the **Forge Render Governor** before Forge lowers the coarse quality tier.

The governor has four pressure states:

- `native`: authored DPR/effects.
- `balanced`: ~0.88 internal DPR scale, lower bloom cost, lower particle density and reduced shadow pressure.
- `performance`: ~0.72 internal DPR scale, heavily reduced secondary effects and particle density.
- `survival`: ~0.58 internal DPR scale, no post stack, no runtime shadows and minimal decorative particles.

This is deliberately **not NVIDIA DLSS** and it does not claim neural or temporal reconstruction. The WebGL canvas renders at a smaller drawing buffer and the browser compositor spatially scales it to the CSS viewport. DOM typography, controls and semantic content remain native-resolution.

The ordering is intentional: Forge sheds secondary effects and internal pixel cost first while keeping the current hero/model quality tier. Only sustained pressure after `survival` may lower the coarse automatic quality tier and therefore select authored low-model variants. Manual quality selections are never overwritten by the governor.

`PerformanceMonitor` supplies bounded decline/recovery signals. Forge also records rolling frame mean/p95 evidence and exports governor tier, pixel ratio and reconstruction mode through the existing render profiling bridge.

## Recommended budgets

Treat these as starting points, not universal limits:

- Keep hero GLB files below roughly 12 MB when practical.
- Keep individual web textures below roughly 5 MB.
- Keep initial critical 3D assets far below the total page asset budget.
- Reduce draw calls before obsessing over polygon count alone.
- Avoid multiple real-time shadow-casting lights.
- Use instancing for repeated objects.
- Avoid allocating new Three.js objects every frame in hot loops.
- Keep mask renderer on auto unless device evidence justifies forcing a path. Organic shader masks are high-tier only; geometric masks stay in CSS.

## Measure

The debug HUD reports scene, normalized progress, camera position, render calls, triangle count, Render Governor state, governor p95 and the last adaptation reason. Use browser performance tooling for CPU, GPU and memory profiling before launch.

Forge telemetry adds consent-aware measurements from actual devices: coarse viewport and capability hints, four-second FPS sampling, slow-frame counts, LCP, CLS, interaction candidates, long tasks and WebGL status. It does not infer GPU time and does not collect advertising identifiers. See [telemetry](TELEMETRY.md).
