# David Weekley Homes / FORGE Redesign Concept

This client project is a complete independent redesign study built only with the repository's FORGE runtime, scene contract, asset bank, responsive camera system, semantic fallback, interaction graph, and conversion layer.

## Review branch

`codex/david-weekley-forge-redesign`

The branch activates the concept at `/` and `/site`. The Studio remains available at `/studio` for scene, camera, motion, asset, and release review.

## Signature slice

`community` → `threshold`

This is the spatial proof. A community-scale exterior resolves into a real 3D residence, then the camera materially crosses the threshold without switching to a second animation clock.

## Asset policy

- Uses the existing FORGE pavilion GLB and progressive low-detail variant.
- Uses image URLs already present in the repository's active project and asset workflow.
- Does not copy proprietary photography from the reference website.
- Does not represent concept imagery, inventory, or form submissions as production David Weekley Homes content.

## Validation

Run from the repository root:

```bash
npm run forge:readiness
npm run experience:validate
npm run interaction:validate
npm run typecheck
npm run lint
npm run build
```

For the full release gate:

```bash
npm run verify
```
