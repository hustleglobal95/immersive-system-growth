# Forge Studio

`/studio` is the production control surface. It deliberately runs without the cinematic Canvas so complex authoring sessions do not compete with the experience renderer.

## Workspaces

- Project edits identity, theme and runtime readiness.
- Timeline displays proportional scene ranges, moves shared boundaries, edits semantic copy and applies camera/object or media presets.
- Masks authors eight deterministic image/video reveals, compares CSS and shader output and persists bounded parameters in the experience schema.
- Model inspects local GLB 2.0 files, reports structure and creates baseline deterministic tracks for selected named mesh nodes.
- Integrations configures static data, HTTPS JSON feeds and Shopify Storefront data through explicit mappings.
- Publish configures the release target and documents the protected workflow.
- Telemetry configures consent, sampling and Do Not Track behavior and displays samples from the current device.

Drafts are stored in the browser under `forge-studio-v2`. Export `experience.json` and `studio-project.json` before moving work to another machine. Import validates before replacing the current draft.

Studio does not upload GLB files or write directly to the repository. Copy approved assets under `public`, register them in the asset manifest and commit exported configuration through the normal review workflow.

The Mask Lab can add `/textures/reference/reveal-field.svg` to a scene as a safe authoring fixture. This is an original bundled texture, not client artwork. See [mask reveals](MASK_REVEALS.md).
