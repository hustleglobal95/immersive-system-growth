# Forge Studio

`/studio` is the Forge product: one production editor for building interactive 3D websites. It opens directly into the working site rather than a wizard, dashboard, or simplified shell.

## Editor model

The permanent editor workspaces are visible in the top bar:

- **Canvas** — live production site, scene/layer selection, contextual inspector, AI Build, direct camera/copy/environment editing, proposal review and scroll timeline.
- **References** — project website references, Forge corpus search, reference-analysis import, observed evidence, transferable principles, explicit no-copy boundaries, and mapping into composition, typography, motion, interaction, 3D, transitions, mobile and performance.
- **Motion** — frame-accurate sequencer, tracks, curves, recording, camera timing and responsive overrides.
- **Interactions** — deterministic trigger/state/action graph for pointer, scroll, sequence, camera, shader, audio, navigation and other runtime behaviors.
- **Assets** — intake, Asset Bank, manifest control, GLB inspection, rig mapping and optimization.
- **Effects** — cinematic systems, cursor reveals, mask reveals, warp, refraction and scene transitions.

Quality and release tools stay in the same product:

- **Project Health** — validation, asset pressure, motion coverage, mobile translation and interaction readiness.
- **Performance** — real-device telemetry and runtime evidence.
- **Search + AI** — discoverability, crawlability, entities and AI retrieval policy.
- **Publish** — protected release review creation gated by Project Health, durable assets and publishing authority.

AI Build, Creative Agent, Director, Asset Creator, Project Vault/Versions and the Loop Engine are production capabilities inside Forge. Evidence-directed project references automatically feed AI Build and Director; a URL by itself does not authorize visual inference. They do not create a second Studio or hide the editor behind a first-run flow.

## Working state

One validated draft drives the live production preview and every editor workspace.

Drafts are stored in the browser under `forge-studio-v2` as the fast working copy. Project Vault can persist the complete validated Studio state on a dedicated GitHub branch, including named versions and restore points, so important projects do not depend on one browser. Export remains available for portable handoffs. Import validates before replacing the current experience draft.

Asset intake does not upload binary files. Copy approved optimized assets into the staged public paths before publishing configuration. The PR publisher writes only validated JSON documents and always uses a new review branch. It does not merge or deploy.

## Recommended authoring sequence

1. Open or create the website directly in `/studio`.
2. Add relevant website references in References. Import a Forge reference-analysis JSON or explicitly record observed evidence, transferable principles and do-not-copy rules; URL-only references remain non-directive.
3. Use AI Build or manual scene/layer authoring to establish the site structure from the project brief plus active reference intelligence.
4. Inspect and optimize licensed assets, then register final outputs in Assets.
5. Map GLB nodes and establish the persistent 3D subject/rig.
6. Direct cameras, lights, copy, media, materials and environment from Canvas.
7. Build scroll choreography and keyframes in Motion.
8. Add deterministic behavior in Interactions.
9. Add masks, reveals, refraction, warp and transitions in Effects.
10. Scrub the live site forward, backward and across scene boundaries.
11. Resolve Project Health, performance and mobile issues.
12. Publish a protected review when the website is ready.

The Mask Lab can add `/textures/reference/reveal-field.svg` to a scene as a safe authoring fixture. This is an original bundled texture, not client artwork. See [mask reveals](MASK_REVEALS.md).

See [motion sequencer](MOTION_SEQUENCER.md) for the track contract, supported targets and editor controls.

## Control Plane

The editor remains selection-aware. Selecting a scene, camera, rig node, environment, copy, media or asset resolves a typed Selection Context. The Capability Registry determines which Forge actions are valid for that context, and Proposal Contracts keep deep changes previewable and reversible.

Operator intelligence, Director intelligence and Loop verification remain engine capabilities that can improve the current website. They are not separate permanent product surfaces.

Use **Command-K / Ctrl-K** (or `/` outside a text field) to open the Forge command palette.

See [PRO+ Control Plane](CONTROL_PLANE.md) and [internal product operations](INTERNAL_PRODUCT.md).
