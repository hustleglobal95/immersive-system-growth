# Validation contract

`npm ci` uses the committed lockfile. `npm run check` runs doctor, Studio project validation, full schema validation for demo/all recipes, actual sampled cinematic continuity at desktop/portrait aspects, rig and recursive asset auditing, regression tests, TypeScript and ESLint. `npm run build` prepares decoders and builds production Next.js.

Both runtime and CLI use src/lib/configSchema.ts. Invalid nested configuration is rejected with field paths. Optional defaults are defined in that schema, not scattered in validators. CLI recipe application validates before atomic replacement and preserves timestamped backups.

`npm run test:browser` runs Playwright against the production server on Chromium and WebKit. Install browser binaries with the README command. Failure traces/screenshots are retained. Browser emulation does not certify Safari on physical iPhones, decoder thermal behavior or real GPU memory limits.

Required release evidence: full gates green, no unexpected browser errors, readable arrival/final conversion, keyboard details/navigation, reduced motion, missing asset/renderer recovery, forward/reverse/jump/restore/resize, route/quality resource stability, and measured target-device budgets.

Do not modify assertions merely to accept a broken outcome. If a test was based on an incorrect assumption, document that distinction and preserve the intended user-facing invariant.
