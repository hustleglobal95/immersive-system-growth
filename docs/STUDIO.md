# Forge Studio

`/studio` is the production control surface. Its Preview workspace mounts the real production scene graph on demand; other workspaces remain renderer-free. One draft drives every workspace and passes through the same schemas used by runtime, CLI and CI.

## Workspaces

- Project edits identity, theme and runtime readiness.
- Templates applies one of six complete industry starting systems while preserving the project/deployment document.
- Preview scrubs or plays the production R3F scene, DOM media, masks and transition layers at desktop, tablet and mobile aspect ratios.
- Director edits eleven camera paths, mobile framing, light colors/intensity, atmosphere, exposure, postprocessing and opt-in hero PBR overrides.
- Timeline displays proportional scene ranges, moves shared boundaries, edits semantic copy and applies camera/object or media presets.
- Sequence edits typed scene-local keyframes on a zoomable dope sheet, records vector values through viewport transform gizmos, edits cubic curves and authors responsive overrides.
- Masks authors eight deterministic image/video reveals, compares CSS and shader output and persists bounded parameters in the experience schema.
- Layers composes up to six bounded image/color overlays per media scene with blend, opacity, timing and motion controls.
- Assets inspects local GLB, image and video files, calculates SHA-256, reports metadata/budgets and creates manifest records without uploading the binary.
- Model inspects local GLB 2.0 files, reports hierarchy and geometry complexity, scores suggested semantic mappings, provides optimization guidance and creates baseline deterministic tracks for selected named mesh nodes.
- Integrations configures static data, HTTPS JSON feeds and Shopify Storefront data through explicit mappings.
- Publish configures the release target and can send validated JSON to a server-only GitHub integration that opens a review pull request.
- Telemetry configures consent, sampling and Do Not Track behavior and displays samples from the current device.

Drafts are stored in the browser under `forge-studio-v2` as the fast working copy. Project Vault can persist the complete validated Studio state on a dedicated GitHub branch, including named versions and restore points, so important projects do not depend on one browser. Export remains available for portable handoffs. Import validates before replacing the current experience draft.

Asset intake does not upload binary files. Copy approved optimized assets into the staged public paths before publishing configuration. The PR publisher writes only validated JSON documents and always uses a new review branch. It does not merge or deploy.

## Recommended authoring sequence

1. Create the client folder or apply an industry template.
2. Inspect and optimize licensed assets, then register the final outputs.
3. Map GLB nodes, then add scene-local node tracks or global product choreography.
4. Direct cameras, lights, materials, masks and transition layers in Studio.
5. Use Sequence for keyframe timing, responsive overrides, curves and record-mode adjustments.
6. Scrub forward, backward and across scene boundaries in Preview.
7. Export a handoff bundle or open a review PR.
8. Run the complete validation and browser gates before protected deployment.

The Mask Lab can add `/textures/reference/reveal-field.svg` to a scene as a safe authoring fixture. This is an original bundled texture, not client artwork. See [mask reveals](MASK_REVEALS.md).

See [motion sequencer](MOTION_SEQUENCER.md) for the track contract, supported targets and editor controls.


## Studio interaction layers

Studio now exposes one project through three levels of control rather than presenting every production subsystem at once:

- **Guided Build** is the first-run and project-progress path: idea → assets → scenes → motion → review → publish. A fresh project opens the guide automatically and the shell always exposes the current next step.
- **Studio cockpit** is the normal visual authoring surface for scenes, copy, camera choices, coordinated motion, assets and live preview.
- **Advanced** contains the sequencer, interaction graph, model inspection, low-level asset tooling, performance telemetry and deployment configuration.

Use **Command-K / Ctrl-K** (or `/` outside a text field) to open the Forge command palette. **Assist** in the Studio header contains Creative Agent, Director and Asset Creator; these are specialist tools inside the same workflow rather than floating entry points.

### Guided Ship

Ship opens in guided mode. It reports project validation, release destination, server publishing connection and whether the current browser is authorized to create review branches. Repository credentials remain server-side.

`FORGE_STUDIO_PUBLISH_SECRET` is an owner credential. Advanced setup can exchange it once for an HTTP-only, SameSite=Strict browser session. Normal review publishing then uses that session and does not keep the secret in client state. The existing bearer-secret API authorization remains supported for automation and backward compatibility.

Telemetry and workflow internals remain available under Advanced controls rather than blocking the normal authoring path.


See [internal product operations](INTERNAL_PRODUCT.md) for Project Vault, Asset Vault, operator roles and production memory.
