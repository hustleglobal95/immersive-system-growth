# /asset-plan

Map the requested experience to exact required assets. Separate must-have GLB models, textures, HDR environments, optional video and generated imagery. Do not invent existing filenames. Update `config/asset-manifest.json` only with assets that actually exist or are explicitly planned.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
