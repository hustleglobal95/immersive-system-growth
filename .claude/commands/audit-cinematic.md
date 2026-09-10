# /audit-cinematic

Scrub every scene boundary forward and backward. Flag camera resets, unmotivated fades, unreadable copy, weak depth, motion without purpose, excessive post FX, scroll drift, mobile regressions and reduced-motion failures. Fix blocking issues before calling the experience complete.

Completion gate: follow `docs/VALIDATION.md`; run `npm run check`, `npm run build`, `npm audit --audit-level=high` and the production browser suite. Record camera/scroll ownership, asset changes and any unverified physical-device checks in the review.
