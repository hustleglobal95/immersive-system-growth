# Forge Studio Pro

This is the complete project source, including HELIOT, NOCTERRA and the new Studio interface. It is not a screenshot or a standalone mockup.

## Open the Studio

Node.js 22.13 or newer is required.

On macOS, open `START_STUDIO.command` from the extracted folder. On Windows, open `START_STUDIO.cmd`. Alternatively, from the project folder run:

```sh
node scripts/start-studio.mjs
```

The launcher installs the pinned dependencies when needed, starts the development server on loopback, and opens the Studio. It uses an available port between 3000 and 3010 and does not stop another running server. Keep the terminal open; Ctrl+C stops the development server. The terminal prints the correct browser address if automatic opening is unavailable.

The existing localhost tab is not automatically updated by downloading this package. Use the address printed by this launcher's terminal.

## Keep existing work

Browser drafts belong to the address where they were saved. A different hostname or port has separate browser storage. Export your old draft as JSON from the old Studio, then use Import in this release. Do not clear site data before exporting a backup.

Uploads live in the project's `data/studio-assets` directory. Keep that directory with your project. A JSON export preserves configuration, not model-file bytes.

## Build scenes

1. Load HELIOT or NOCTERRA using Switch project.
2. Select, add or duplicate a scene in the outline.
3. Enter Orbit / edit view, frame your subject, then Capture start and Capture end in Camera.
4. Use Library to upload a self-contained GLB or place a reference model. Use Objects and the transform controls to position it.
5. Refine Light, Material and Story; use Animate for motion keyframes.
6. Review desktop and mobile, save a snapshot, and export a JSON backup.

Ctrl/Cmd K searches tools and scenes. The Help button documents the workflow and keyboard shortcuts. See `docs/STUDIO_PRO.md` for details and delivery boundaries.

## Verification status

Production build, TypeScript, and unit tests have been run. Lint has no errors and retains existing repository warnings. See the separately supplied verification report for exact results.

The new browser acceptance suite is included in `scripts/verify-studio-pro.mjs` and `.github/workflows/studio-pro.yml`, but final visual/interaction acceptance has not been completed in the delivery environment: local browser navigation was administrator-blocked, and the remote runner failed before executing steps. No passing browser result or new screenshot is claimed.

To run browser acceptance on a permitted development machine:

```sh
npm run build
npx playwright install chromium
node --import tsx scripts/verify-studio-pro.mjs
```

It starts its own production test server on port 3310, uses disposable browser storage, and writes a report and screenshots under `test-results/studio-pro`.

## Scope

This is a local scene-authoring release, not a hosted multi-user service. It does not generate new 3D architecture automatically. HELIOT's structural geometry, tunnel and some globally timed effects remain code-authored. Review full experiences after retiming chapters. Local GLB uploads must be moved to approved public/asset-hosting URLs for production delivery; JSON export is not one-click deployment.
