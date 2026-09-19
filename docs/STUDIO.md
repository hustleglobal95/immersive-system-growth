# Forge Studio

`/studio` is the production control surface. One validated draft drives the live production preview, Review, Ship and every Advanced specialist tool.

## Primary surfaces

- **Build** is the default canvas-first authoring surface. Selection Context, Next Best Action, semantic command intent and proposal review keep subsystem choice out of the operator's path. Scene, camera, rig node, copy, media, asset and environment selections each resolve their own relevant outcomes.
- **Review** is the Project Health control room. Validation, asset pressure, motion coverage, mobile translation and interaction readiness are presented through one health model with direct repair routes.
- **Ship** is the guided release surface. It honors Project Health, Project Vault/review controls, durable assets and protected publishing authority.

## Advanced

Advanced preserves full expert depth without making it permanent navigation:

- **Sequencer** — exact motion tracks, curves, recording, camera timing and low-level copy/media motion.
- **Interactions** — deterministic trigger/state/action graph.
- **Asset tools** — Asset Intelligence, bank, manifest and GLB inspection.
- **Telemetry** — real-device performance evidence.

Director, Creative Agent, Asset Creator, Project Vault and the Loop Engine remain available as specialist systems, but ordinary production does not require learning their internal names before taking action.

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

Studio exposes one project through a PRO+ control hierarchy rather than presenting every production subsystem at once:

- **Guided Build** is the first-run and project-progress path: idea → assets → scenes → motion → review → publish. A fresh project opens the guide automatically and the shell always exposes the current next step.
- **Build** is the normal visual authoring surface for scenes, copy, camera choices, coordinated motion, assets and live preview.
  The cockpit is selection-aware: selecting a scene, camera, rig node, environment or asset resolves one typed Selection Context. The PRO+ Control Plane then asks the Capability Registry which operator intents are valid for that context. The contextual direction card renders those registered capabilities instead of owning a separate hardcoded action tree.
  Selecting a capability creates a typed Proposal Contract before Forge routes into Motion, Interaction, Assets, Director or a Loop. Deep actions are marked preview-required; instant actions must remain reversible. See [PRO+ Control Plane](CONTROL_PLANE.md).
- **Advanced** contains the sequencer, interaction graph, model inspection, low-level asset tooling, performance telemetry and deployment configuration.

Use **Command-K / Ctrl-K** (or `/` outside a text field) to open the Forge command palette. **Assist** in the Studio header contains Creative Agent, Director and Asset Creator; these are specialist tools inside the same workflow rather than floating entry points.

### Guided Ship

Ship opens in guided mode. It reports project validation, release destination, server publishing connection and whether the current browser is authorized to create review branches. Repository credentials remain server-side.

`FORGE_STUDIO_PUBLISH_SECRET` is an owner credential. Advanced setup can exchange it once for an HTTP-only, SameSite=Strict browser session. Normal review publishing then uses that session and does not keep the secret in client state. The existing bearer-secret API authorization remains supported for automation and backward compatibility.

Telemetry and workflow internals remain available under Advanced controls rather than blocking the normal authoring path.


See [internal product operations](INTERNAL_PRODUCT.md) for Project Vault, Asset Vault, operator roles and production memory.
