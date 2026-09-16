# Forge visual regression gate

Forge captures production screenshots in CI with `scripts/capture-showcase.mjs`. The visual regression layer converts each captured PNG to a deterministic 32×32 grayscale signature and compares mean absolute pixel error against an explicitly approved baseline.

## Commands

```bash
npm run visual:baseline:update
npm run visual:regression
```

`visual:baseline:update` must only be run after a human or supervising agent has inspected the complete screenshot set from a known-good production build.

`visual:regression` refuses to pass when `config/visual-baseline.json` has `established: false`. This is deliberate: Forge must never silently bless the first render as correct.

## Thresholds

The baseline currently declares:

- warning: 2.5% mean perceptual difference
- failure: 6% mean perceptual difference

A new screenshot path is a failure until approved. A screenshot that disappears is also a failure.

These values are starting contracts, not excuses to ignore visible regressions. Any warning should still be inspected when the affected page is part of a client release.

## Bootstrap sequence

1. Run a successful production build.
2. Run `node scripts/capture-showcase.mjs` against that build.
3. Inspect every desktop and mobile screenshot.
4. Confirm there are no unexpected page/console errors.
5. Run `npm run visual:baseline:update`.
6. Commit the resulting `config/visual-baseline.json`.
7. Run `npm run visual:regression` against a second clean capture to prove determinism.
8. Only then add `visual:regression` to the merge-blocking CI path.

## Why the baseline starts unestablished

The GitHub Actions runs available while the Engineering Core work was being built failed before a runner was assigned (`runner_id: 0`, no executed steps). Because no verified render was produced, the Engineering Core migration intentionally records the baseline as unestablished instead of fabricating approval from source code.

This is a quality safeguard, not an incomplete design. The comparison engine is ready; activation requires one verified capture set.
