# HELIOT / Observatory for the unseen

An original ten-act architectural light study at `/heliot`. A real 3D aerial approach descends through a bronze gateway into an underground gallery, circles an interactive structural exhibit, and flies back into the landscape. The existing `/`, `/lab`, `/design` and `/studio` are preserved.

## Run

Use Node 22.13 or later, run `npm ci`, then `npm run dev` and open `/heliot`.

## Authoring

- `src/experiences/heliot/experience.json`: canonical Forge timeline, desktop/mobile camera paths, lighting and named component tracks.
- `scripts/generate-heliot.mjs`: original GLB geometry generator and canonical config generator. Edit this source before regenerating assets/config. Both quality tiers use identical node names.
- `src/experiences/heliot/HeliotStage.tsx`: environment lighting, crown markings and progressive optical rays, using Forge's persistent CinematicFrame.
- `src/experiences/heliot/HeliotExperience.tsx`: accessible chapter document, aperture diagram, inspection and configuration export.
- `app/heliot/observatory.css`: the rebuilt desktop and mobile art direction, layered over the semantic base styles.
- `ObservatoryWorld.tsx`: textured basalt terrain, instanced rocks, gateway, radial passage, lit gallery, basin and reflection geometry. The earlier `ObservatoryPlate.tsx` and `TerrainField.tsx` studies are no longer mounted.
- `lightLab.ts`: the shared aperture state for geometry, ray width, readout and exports.
- `docs/HELIOT_FLIGHT_PLAN.md`: current spatial shot list. Earlier scene plans record superseded concepts.
- `docs/HELIOT_ART_DIRECTION.md`: original image provenance, prompts and implementation rationale.

No runtime remote GLB, font, HDR, photography, AI API, form service, analytics, or payment credentials are needed. The two generated architectural plates are optimized local WebP assets. All graphics and model geometry are original. The existing font licenses apply to the local Manrope and Cormorant Garamond families. This is imagined architecture: diagrams demonstrate principles and do not claim construction-ready engineering.

## Interaction and motion

Native scroll remains authoritative through the provider-aware Forge ScrollController. Camera, lighting and eight-component ProductRig share CinematicFrame. Component separation uses immutable named-node offset tracks, with exact return to zero before the light lab. Pointer parallax remains restrained; manual drag and keyboard inspection are limited to the inspection act and reset on chapter changes. The aperture control changes the actual circular diaphragm geometry and GPU ray width, in addition to the schematic, relative-light readout, SVG field sheet and JSON configuration.

The custom optical diagram is necessary because it shows a changing aperture cone rather than only node-to-node relationships. GPU rays use the same scroll progress and stop in reduced motion. A landscape-backed semantic document remains available if WebGL fails. Optional synthesized atmosphere starts only on an explicit button press and stops when muted or unmounted. Short landscape screens use a naturally flowing document instead of trapping controls in a fixed panel.

## Validation and static distribution

`npm run check` runs all Forge audits, unit tests, TypeScript and lint. `npm run build` creates the production application. `npx playwright test tests/browser/heliot.spec.ts --project=chromium` checks interaction, reverse scroll, mobile, reduced motion, and fallback. `CHROMIUM_EXECUTABLE` can point to an installed browser when managed browser downloads are unavailable.

`node scripts/export-heliot.mjs` packages the prerendered route and hashed client assets into `out`. The root redirects to `/heliot`; only this microsite is exported, without Studio or server routes. Rebuild and re-export whenever source changes. Verify the exact output with `HELIOT_STATIC=1 npx playwright test tests/browser/heliot.spec.ts --project=chromium`. This distribution is suitable only while HELIOT remains client-interactive and has no Next server actions or server navigation. `node scripts/capture-heliot.mjs` captures production desktop/mobile screenshots in `generated/heliot`.

## Previous photographic edition verification — 2026-09-14

This section records the superseded photographic edition. Current flight-release evidence is recorded below.

- `npm run check`: all audits completed, 125 unit tests passed, TypeScript passed; lint reports zero errors and eight existing warnings. Project validation also passes with the HELIOT client registered.
- Rebuilt production Next build passes. Four HELIOT Chromium end-to-end tests pass against the exported static distribution, covering persistent canvas, reverse navigation, sound on/off, keyboard inspection, both SVG/JSON downloads, mobile/reduced motion, short landscape layout, and no-JavaScript/no-WebGL fallbacks.
- All ten chapter holds were captured at desktop (1440×1000) and mobile (390×844). Capture reports show no browser errors or horizontal overflow. The terrain hold was adjusted after visual review and captured again.
- The render ledger observed at most 20 draw calls, 18,796 triangles, and 4,480 line segments in this review. These are rendering-cost observations, not claims of physical-device FPS. The high model is 632,624 bytes; low is 355,472 bytes; both original WebP plates together are under 500 KB.
- The repository-wide Chromium run was attempted with a two-failure limit: three tests passed, two failed, and 27 were not run. Failures are the Studio asset-bank kit replacement expectation (`Reference kit applied`) and the original cinematic DOM test waiting for the absent `#arrival` link. These are outside `/heliot`; the entire repository browser suite is **not** claimed green.
- Safari/WebKit was not verified because the browser download was unavailable in this environment. Chromium used software WebGL; physical-device GPU performance remains unmeasured.

## Engine repairs included

- Scroll and keyboard controllers now consume ExperienceConfigProvider, preserving their existing default config.
- PointerController accepts an opt-out from the default project's cinematic layers, preventing cross-project image requests.
- Canvas fallback content no longer marks working WebGL as failed merely because fallback DOM mounts inside a canvas.
- Cinematic shader props synchronize after commit; scene changes reset compositor readiness through keyed ownership.
- Shader compiler failures now retain diagnostic logs.

## Spatial flight release

The camera now approaches across a modeled reflection basin, crosses the hollow gateway, descends through a curved bronze passage, circles an underground gallery exhibit and returns through the same passage. Exterior and interior remain in one world. The distant mountains are an original matte on a curved backdrop; the traversed architecture is geometry. See `HELIOT_FLIGHT_PLAN.md` for coordinates and `heliot-review` for rendered evidence.

Camera banking uses the same smoothed frame as position and target. The renderer uses demand frames: input invalidates the canvas, the shared damped transition continues until settled, and an idle shot rests. Aperture, finish, orbit, reset and navigation all invalidate the same renderer. The complete environment and exhibit share one loading boundary before readiness is announced.

The 126-test unit suite and Forge audits pass, including 2,001 samples per viewport checking the actual passage centerline, doorway clearance, gallery floor/ceiling and exterior/exhibit framing. Production build, TypeScript and lint pass (eight existing lint warnings, no errors). The original model tiers remain under 1 MB each; all four local visual textures total approximately 1.2 MB. No claim of physical-device FPS or a verified Safari run is made.

Final delivery: all four HELIOT Chromium end-to-end tests pass against the exported production distribution, including actual camera entry into the underground gallery and return outside, persistent-canvas navigation, sound, keyboard inspection, both downloads, mobile/reduced motion and no-JavaScript/no-WebGL fallback. All 20 chapter captures completed with no page errors or horizontal overflow. The observed render ledger peaked at 129 calls / 195,690 triangles on desktop and 196 calls / 381,612 triangles on phone, including initialization and multiple rendering passes; these are cost observations, not physical-device performance claims. See `heliot-review/report.json`.
