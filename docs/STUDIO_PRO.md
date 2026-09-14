# Forge Studio / Scene authoring

Open `/studio` on the running project. The Studio edits the same validated experience format as the production runtime. It is an authoring interface, not a Blender replacement or an automatic hosting service.

## Start locally

Use Node 22.13 or newer. From this project directory run `npm ci`, then `npm run dev -- --hostname 127.0.0.1`. Open `http://127.0.0.1:3000/studio`. If another project owns port 3000, stop that server deliberately or use `--port 3001`; a localhost URL alone does not launch or update this project.

## Everyday workflow

1. **Choose a world.** HELIOT loads initially when there is no browser draft. Switch to NOCTERRA from the experience menu. Switching preserves the previous experience draft in this browser and updates the project configuration path.
2. **Build a sequence.** Select a scene in the outline. Add a scene from its ending camera pose, duplicate it, or delete it with confirmation. Timing stays contiguous. Shared assets remain shared; deleting a scene removes assets scoped exclusively to it, but never deletes uploaded files.
3. **Compose visually.** Enter *Orbit / edit view*. Left-drag to orbit, right-drag to pan, and scroll to zoom. Use *Frame selected object* (F), then *Capture start* and *Capture end* in Camera. Return to film camera and press Play. Numeric fields and top/side path handles are available for precision. Quick shot presets replace the base path and its waypoints; they do not perform collision certification.
4. **Place objects.** Open the Objects or Library outline tab. Click or drag a library model into the viewport, upload a self-contained GLB, or add a hosted GLB URL. Select models in the outline or the viewport. W/E/R choose translate/rotate/scale. The underlying format uses uniform scale. Hero transforms affect the selected scene endpoint; ordinary asset transforms affect every scene that uses the asset.
5. **Set the mood and copy.** Light exposes presets, color, exposure and fog. Surface edits hero-material overrides. Story edits labels, headline, body and alignment. A warning appears when camera motion tracks override the base camera being edited.
6. **Animate and review.** Open the keyframe sequencer for typed motion tracks, curves and keyframe editing. Preview desktop, tablet and mobile framing. Composition guides, story-overlay toggle, playback speed, looping and focus mode help review the result.
7. **Preserve your work.** Browser autosave holds the working draft. *Save snapshot* also records a named/restorable version (eight most recent per experience). *Export JSON* validates and downloads the configuration. Import reopens an exported configuration. Export a backup outside the browser before clearing site data or changing devices.

## Uploads and delivery

GLB import is deliberately **local-only**. It accepts binary glTF 2, verifies length/magic/JSON, rejects externally referenced buffers/textures, and limits files to 20 MB. Uploads require a same-origin loopback request. Files are content-addressed under `data/studio-assets`, excluded from Git, and served through `/api/studio/assets/<sha256>.glb`.

Development mode permits local uploads. For a locally bound **production** test server, explicitly set `STUDIO_LOCAL_ASSET_UPLOADS=1`. Public production hosts are not an upload service. There is no automatic cloud persistence, authentication or asset CDN here.

An exported JSON file is **not** a complete site or a GLB bundle. For client deployment, move locally imported model files to your approved asset hosting/public model path and update their URLs before delivery. Preserve client rights and licensing for models and textures. The JSON keeps all authored scene, camera, lighting and motion data; publishing/merging/deployment remains a separate reviewed workflow.

## Boundaries

HELIOT's architecture, tunnel shape, fixed fixtures and certain story effects are authored in code and global timeline tracks. Changing chapters changes camera/story configuration, not the building geometry or those globally timed effects. Review the full film after retiming, especially interior shots. The viewport uses the real environment, not a 2D mockup. Material overrides apply to the hero; this is not an arbitrary per-mesh shader editor.

The interface preserves existing advanced production tools under **More tools** and the command launcher. It does not claim automated AI scene creation or one-click production deployment.

## Keyboard

Ctrl/Cmd K: tools and scene search. Ctrl/Cmd S: snapshot. Ctrl/Cmd Z / Shift Z: undo/redo outside text fields. Space: play/pause outside form controls. F: frame selection. W/E/R: transform mode. 1/2/3: camera/object/light inspector. ?: help. Escape: close a modal or leave focus view.

## Verification

`npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` cover the code and production build. `node --import tsx scripts/verify-studio-pro.mjs` launches a separate production server on port 3310 and exercises real Chromium rendering, authoring, snapshots, upload validation and JSON export. It writes screenshots and a machine-readable report under `test-results/studio-pro`.

The automated browser run uses low-quality rendering on a software GPU. It verifies interaction correctness and layout, not high-end hardware frame rates or every possible imported model. The existing repository has legacy warnings/tests outside this editor; retain their reports separately rather than implying those systems were certified by this acceptance test.
