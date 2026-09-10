# Performance Budgets

Cinematic does not mean unlimited rendering cost.

## Default quality tiers

- High: up to configured max DPR, shadows enabled, higher particles, multisampled post FX.
- Medium: capped DPR around 1.5, fewer particles, reduced post cost.
- Low: DPR 1, no decorative particles, postprocessing disabled.

The runtime selects an initial tier using screen width, memory hints and CPU concurrency, then `PerformanceMonitor` can reduce quality if the renderer struggles.

## Recommended budgets

Treat these as starting points, not universal limits:

- Keep hero GLB files below roughly 12 MB when practical.
- Keep individual web textures below roughly 5 MB.
- Keep initial critical 3D assets far below the total page asset budget.
- Reduce draw calls before obsessing over polygon count alone.
- Avoid multiple real-time shadow-casting lights.
- Use instancing for repeated objects.
- Avoid allocating new Three.js objects every frame in hot loops.

## Measure

The debug HUD reports scene, normalized progress, camera position, render calls and triangle count. Use browser performance tooling for CPU, GPU and memory profiling before launch.
