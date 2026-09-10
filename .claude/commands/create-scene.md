# /create-scene

Create one new scene without breaking timeline continuity. Define its purpose, range, camera start/end, camera path, hero state, world state, accessible copy, interactions and transition out. Rebalance adjacent ranges and run `npm run experience:validate`.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
