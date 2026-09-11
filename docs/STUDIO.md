# Forge Studio

`/studio` is the production control surface. Its Preview workspace mounts the real production scene graph on demand; other workspaces remain renderer-free. One draft drives every workspace and passes through the same schemas used by runtime, CLI and CI.

## Workspaces

- Project edits identity, theme and runtime readiness.
- Templates applies one of six complete industry starting systems while preserving the project/deployment document.
- Preview scrubs or plays the production R3F scene, DOM media, masks and transition layers at desktop, tablet and mobile aspect ratios.
- Director edits eleven camera paths, mobile framing, light colors/intensity, atmosphere, exposure, postprocessing and opt-in hero PBR overrides.
- Timeline displays proportional scene ranges, moves shared boundaries, edits semantic copy and applies camera/object or media presets.
- Masks authors eight deterministic image/video reveals, compares CSS and shader output and persists bounded parameters in the experience schema.
- Layers composes up to six bounded image/color overlays per media scene with blend, opacity, timing and motion controls.
- Assets inspects local GLB, image and video files, calculates SHA-256, reports metadata/budgets and creates manifest records without uploading the binary.
- Model inspects local GLB 2.0 files, reports structure and creates baseline deterministic tracks for selected named mesh nodes.
- Integrations configures static data, HTTPS JSON feeds and Shopify Storefront data through explicit mappings.
- Publish configures the release target and can send validated JSON to a server-only GitHub integration that opens a review pull request.
- Telemetry configures consent, sampling and Do Not Track behavior and displays samples from the current device.

Drafts are stored in the browser under `forge-studio-v2` for compatibility with earlier drafts. Export `experience.json`, `studio-project.json` and `asset-manifest.json` before moving work to another machine. Import validates before replacing the current experience draft.

Asset intake does not upload binary files. Copy approved optimized assets into the staged public paths before publishing configuration. The PR publisher writes only validated JSON documents and always uses a new review branch. It does not merge or deploy.

## Recommended authoring sequence

1. Create the client folder or apply an industry template.
2. Inspect and optimize licensed assets, then register the final outputs.
3. Map GLB nodes and author deterministic product tracks.
4. Direct cameras, lights, materials, masks and transition layers in Studio.
5. Scrub forward, backward and across scene boundaries in Preview.
6. Export a handoff bundle or open a review PR.
7. Run the complete validation and browser gates before protected deployment.

The Mask Lab can add `/textures/reference/reveal-field.svg` to a scene as a safe authoring fixture. This is an original bundled texture, not client artwork. See [mask reveals](MASK_REVEALS.md).
