# /build-experience

Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, the project brief and the exact asset inventory. Before writing code, produce a scene choreography table. Then implement using the persistent canvas and master timeline. Do not create independent section canvases. Run validation, asset audit, typecheck and build before completion.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
