# HELIOT / The Anatomy of Light

An original ten-act optical-instrument flagship at `/heliot`. The existing `/`, `/lab`, `/design` and `/studio` are preserved.

## Run

Use Node 22.13 or later, run `npm ci`, then `npm run dev` and open `/heliot`.

## Authoring

- `src/experiences/heliot/experience.json`: canonical Forge timeline, desktop/mobile camera paths, lighting and named component tracks.
- `scripts/generate-heliot.mjs`: original GLB geometry generator and canonical config generator. Edit this source before regenerating assets/config. Both quality tiers use identical node names.
- `src/experiences/heliot/HeliotStage.tsx`: environment lighting, crown markings and progressive optical rays, using Forge's persistent CinematicFrame.
- `src/experiences/heliot/HeliotExperience.tsx`: accessible chapter document, aperture diagram, inspection and configuration export.
- `app/heliot/heliot.css`: desktop and mobile art direction.
- `docs/HELIOT_SCENE_PLAN.md`: creative rationale and shot list.

No remote GLB, font, HDR, photography, AI API, form service, analytics, or payment credentials are needed. All graphics and model geometry are original. The existing font licenses apply to the local Manrope and Cormorant Garamond families. This is a fictional concept: optical diagrams demonstrate principles and do not claim a manufactured lens prescription.

## Interaction and motion

Native scroll remains authoritative through the provider-aware Forge ScrollController. Camera, lighting and eight-component ProductRig share CinematicFrame. Component separation uses immutable named-node offset tracks, with exact return to zero. Pointer parallax remains restrained; manual drag and keyboard inspection are limited to the inspection act and reset on chapter changes. The aperture control changes the schematic and exported configuration, not the GLB's fixed iris geometry.

The custom optical diagram is necessary because it shows a changing aperture cone rather than only node-to-node relationships. GPU rays use the same scroll progress and stop in reduced motion. The static front elevation and complete semantic document remain available if WebGL fails. No giant particle field or external compositor is needed for this concept.

## Validation and static distribution

`npm run check` runs all Forge audits, unit tests, TypeScript and lint. `npm run build` creates the production application. `npx playwright test tests/browser/heliot.spec.ts --project=chromium` checks interaction, reverse scroll, mobile, reduced motion, and fallback. `CHROMIUM_EXECUTABLE` can point to an installed browser when managed browser downloads are unavailable.

`node scripts/export-heliot.mjs` packages the prerendered route and hashed client assets into `out`. The root redirects to `/heliot`; only this microsite is exported, without Studio or server routes. Rebuild and re-export whenever source changes. Verify the exact output with `HELIOT_STATIC=1 npx playwright test tests/browser/heliot.spec.ts --project=chromium`. This distribution is suitable only while HELIOT remains client-interactive and has no Next server actions or server navigation. `node scripts/capture-heliot.mjs` captures production desktop/mobile screenshots in `generated/heliot`.

## Delivery verification — 2026-09-14

- `npm run check`: all audits completed, 125 unit tests passed, TypeScript passed; lint reports zero errors and eight existing warnings. Project validation also passes with the HELIOT client registered.
- Production Next build passes. Four HELIOT Chromium end-to-end tests pass against the exported static distribution, covering persistent canvas and reverse navigation, keyboard inspection and configuration download, mobile/reduced motion, and no-JavaScript/no-WebGL fallbacks.
- Production desktop (1440×1000) and mobile (390×844) screenshots were reviewed. Capture reports show no browser errors or horizontal overflow.
- The repository-wide Chromium run was attempted with a two-failure limit: three tests passed, two failed, and 27 were not run. Failures are the Studio asset-bank kit replacement expectation (`Reference kit applied`) and the original cinematic DOM test waiting for the absent `#arrival` link. These are outside `/heliot`; the entire repository browser suite is **not** claimed green.
- Safari/WebKit was not verified because the browser download was unavailable in this environment. Chromium used software WebGL; physical-device GPU performance remains unmeasured.

## Engine repairs included

- Scroll and keyboard controllers now consume ExperienceConfigProvider, preserving their existing default config.
- PointerController accepts an opt-out from the default project's cinematic layers, preventing cross-project image requests.
- Canvas fallback content no longer marks working WebGL as failed merely because fallback DOM mounts inside a canvas.
- Cinematic shader props synchronize after commit; scene changes reset compositor readiness through keyed ownership.
- Shader compiler failures now retain diagnostic logs.
