# /optimize-3d

Audit models, textures, draw calls, triangle count, transparent materials, shadow cost, DPR and postprocessing. Preserve the artistic intent while lowering cost. Run `npm run assets:audit` and record the before/after impact.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
