# /debug-3d

Enable the Forge HUD and inspect active scene, normalized progress, camera coordinates, draw calls and triangles. Reproduce the issue at its exact progress range before editing. Fix the smallest architectural cause instead of hiding it with extra effects.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
