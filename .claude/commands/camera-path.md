# /camera-path

Design a motivated camera move for the requested scene. Prefer an existing preset from `src/lib/cameraPaths.ts`. If a new path is required, implement it as a reusable pure sampler, document its intended use and ensure backward scroll is visually coherent.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
