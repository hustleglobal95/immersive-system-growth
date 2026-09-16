# Forge Engineering Core — Execution Specification

Status: Proposed
Owner: Forge platform
Scope: Internal software engineering maturity, not end-user feature expansion
Primary objective: Make Forge substantially harder to break, easier to extend, safer for AI-driven authoring, and faster to evolve without lowering production quality.

---

## 1. Executive intent

Forge already has strong creative systems: structure, typography, motion, camera, interactions, assets, 3D, Studio, validation and publishing. The next phase must improve the engineering substrate underneath those systems.

This initiative does **not** aim to add more visible features. It aims to make existing and future Forge capabilities operate on a shared, versioned, testable, transactional platform core.

The target outcome is a repository where:

- domain rules live outside UI components;
- major mutations happen through commands;
- multi-step operations are atomic and reversible;
- project formats are versioned and migratable;
- architectural boundaries are enforced automatically;
- invalid states are rejected by invariants, not discovered visually later;
- old client projects continue opening after Forge evolves;
- AI agents and Studio use the same mutation surface;
- regressions in behavior, visuals and performance fail CI;
- one subsystem can fail without taking down the entire experience;
- the cost of adding a new capability decreases over time rather than increasing.

This is the engineering layer that turns Forge from a powerful codebase into a durable production platform.

---

## 2. Success criteria

This initiative is complete only when all of the following are true:

1. Core/domain/platform/runtime/studio import boundaries are mechanically enforced.
2. A canonical versioned Forge project envelope exists.
3. Existing projects can migrate forward without manual edits.
4. High-value project mutations are implemented as commands.
5. Command batches can run transactionally with rollback.
6. Undo/redo is command-driven for the covered mutation surface.
7. Core events are emitted from commands and consumed without direct cross-system coupling.
8. Project invariants run after import, after transactional commits, before export, and in CI.
9. Golden project fixtures cover minimal through stress-scale projects.
10. Deterministic snapshots protect core compilers/directors/generators.
11. Visual regression tests compare against approved baselines.
12. Performance budgets produce hard CI failures for defined regressions.
13. Runtime health exposes system-level readiness and degraded states.
14. Failure boundaries exist around WebGL, media, assets and interactions.
15. ProductionStudioWorkbench and other large UI surfaces contain substantially less business logic.
16. Existing Forge behavior remains backwards-compatible unless explicitly migrated.
17. `npm run check`, browser tests and production build remain green at every merge boundary.

---

## 3. Non-goals

Do not use this initiative to:

- redesign the Studio UI;
- add new cinematic effects;
- add new industry templates;
- replace React, Next.js, Three.js, GSAP, Zustand or Zod;
- rewrite the entire repository at once;
- change project behavior merely to satisfy a new architecture preference;
- introduce distributed systems, multiplayer collaboration or remote databases;
- create a plugin marketplace;
- force every legacy mutation through commands on day one;
- chase theoretical purity at the expense of shipping.

This is an incremental hardening program, not a rewrite.

---

## 4. Engineering principles

### 4.1 Preserve behavior first
Refactors must retain current production behavior unless a migration explicitly documents the change.

### 4.2 Strangler migration, never big-bang rewrite
New engineering infrastructure should wrap or replace one vertical slice at a time.

### 4.3 One source of truth per concept
Scene, asset, camera, motion, structure and interaction identity should not diverge across Studio/runtime/platform representations.

### 4.4 UI dispatches intent; domain code owns rules
React components should render state and dispatch commands. They should not become the canonical home of project mutation logic.

### 4.5 AI and humans use the same command surface
No separate "agent shortcuts" that bypass validation.

### 4.6 Quality gates are part of the product
A merge is not complete because code compiles. It must pass schema, invariant, deterministic, visual, browser and performance gates appropriate to the touched systems.

### 4.7 Performance is a contract
Creative ambition may increase, but budget regressions must be explicit and reviewed.

### 4.8 Failure should degrade locally
One broken video, optional WebGL enhancement or interaction should not collapse an otherwise usable site.

---

## 5. Target architecture

```text
src/
  core/
    ids/
    commands/
    transactions/
    events/
    registry/
    invariants/
    migrations/
    errors/

  domain/
    project/
    scene/
    asset/
    structure/
    typography/
    motion/
    camera/
    interaction/
    media/

  platform/
    orchestration/
    directors/
    compilers/
    recipes/
    validation/

  runtime/
    rendering/
    camera/
    motion/
    interaction/
    media/
    health/
    boundaries/

  studio/
    workspaces/
    panels/
    inspectors/
    adapters/

  design/
```

### Import direction

```text
core
  ↓
domain
  ↓
platform
  ↓
runtime
  ↓
studio / application
```

Rules:

- `core` imports no higher Forge layer.
- `domain` imports only `core` and domain-local modules.
- `platform` may import `core` + `domain`.
- `runtime` may import `core` + `domain` + `platform`.
- `studio` may consume lower layers.
- lower layers must never import `studio`.
- UI components must not become dependencies of domain/platform/runtime code.
- config parsing may depend on schema/domain types, not Studio implementation details.

These rules must be enforced in CI, not just documented.

---

## 6. Canonical Forge project envelope

Introduce one canonical project envelope without immediately deleting existing config files.

```ts
interface ForgeProjectEnvelope {
  forgeVersion: string;
  schemaVersion: number;
  projectId: ProjectId;
  metadata: ProjectMetadata;
  structure: StructureState;
  creativeDirection: CreativeDirectionState;
  typography: TypographyState;
  assets: AssetState;
  scenes: SceneState[];
  cameras: CameraState;
  motion: MotionState;
  interactions: InteractionState;
  materials: MaterialState;
  environments: EnvironmentState;
  performance: PerformanceState;
  deployment: DeploymentState;
  telemetry: TelemetryState;
}
```

### Migration rule
Existing files remain supported through adapters until migration coverage is complete.

### Identity rule
Introduce branded ID types or strongly typed opaque helpers for:

- ProjectId
- SceneId
- SectionId
- AssetId
- NodeId
- CameraId
- TrackId
- InteractionId
- MaterialId
- EnvironmentId

Do not attempt a repository-wide ID conversion in one PR. Convert by subsystem.

---

## 7. Workstreams

## W0 — Baseline and safety harness

Purpose: Freeze known-good behavior before refactoring.

Deliverables:

- record current `main` build/check/browser status;
- define golden project fixtures;
- add a stress fixture;
- capture approved visual baselines;
- record current performance baseline;
- document critical behavior that must not change.

Golden fixtures:

```text
fixtures/
  minimal/
  product/
  real-estate/
  hospitality/
  automotive/
  saas/
  flagship/
  stress/
```

Stress fixture target:

- 12–16 scenes;
- 25+ registered assets;
- multiple cameras;
- product rig;
- 50+ motion tracks;
- interaction graph;
- video/media;
- mobile overrides;
- material overrides;
- optional shader usage;
- structure plan;
- Type Vault selections.

Acceptance:

- fixtures validate with current schemas;
- each fixture can build/run through current Forge runtime;
- screenshots and performance metrics are stored as comparison evidence.

Dependency: none.

---

## W1 — Architecture boundary enforcement

Purpose: Stop architectural drift before adding new core abstractions.

Deliverables:

- define layer map;
- add import-boundary audit script;
- fail CI on prohibited imports;
- document allowed dependency directions;
- provide narrow adapters where legacy code violates the target model.

Preferred implementation:

- lightweight custom TypeScript/Node dependency audit first;
- avoid introducing a heavy architecture framework unless necessary.

Acceptance:

- runtime cannot import Studio;
- domain cannot import React UI code;
- core has no upward imports;
- CI reports exact violating file and rule.

Dependency: W0 recommended, but implementation may begin in parallel.

---

## W2 — Versioned schema + migration pipeline

Purpose: Make Forge projects survivable across future platform changes.

Deliverables:

```text
src/core/migrations/
  registry.ts
  migrateProject.ts
  v1-to-v2.ts
  v2-to-v3.ts
  fixtures/
```

Required behavior:

- every persisted project declares `schemaVersion`;
- migrations are one-way, ordered and deterministic;
- migration is pure where practical;
- imported older projects auto-migrate in memory;
- export writes the current schema;
- migration report lists applied steps;
- migration failure preserves original input and returns an actionable error.

Tests:

- old fixture → expected current fixture;
- migration idempotence at current version;
- unknown future schema fails safely;
- malformed migration input never partially mutates the source object.

Acceptance:

- at least one real legacy Forge project migrates through the new pipeline;
- migrations run before invariant checks;
- current projects export with explicit schema version.

Dependency: W1 not required. May run in parallel.

---

## W3 — Command system

Purpose: Move business mutations out of UI components and expose one safe mutation surface to Studio and AI.

Initial commands:

```text
scene.add
scene.delete
scene.duplicate
scene.move
scene.rename

camera.update
camera.applyChoreography

motion.applyArchetype
motion.resetScene

asset.assign
asset.remove

structure.applyPlan

typography.applyPairing

interaction.add
interaction.remove
```

Command contract:

```ts
interface ForgeCommand<I, O> {
  type: string;
  validate(input: I, context: CommandContext): CommandValidation;
  execute(input: I, context: CommandContext): CommandResult<O>;
  inverse?(result: CommandResult<O>): ForgeCommandInput;
}
```

Rules:

- commands are deterministic for the same state/input unless explicitly documented;
- commands return structured errors;
- commands cannot directly manipulate UI state;
- command validation is separate from React form validation;
- command outputs include affected IDs and emitted events.

Acceptance:

- at least scene add/delete/duplicate/move and motion archetype application leave `ProductionStudioWorkbench` and run through commands;
- existing visible behavior remains unchanged;
- unit tests cover success, invalid input and inverse/undo behavior.

Dependency: W1 helpful. Can begin after minimal command context is defined.

---

## W4 — Transactions + undo/redo

Purpose: Make multi-step operations safe, atomic and AI-friendly.

Transaction API concept:

```ts
forge.transaction("create-product-chapter", tx => {
  tx.dispatch(addScene(...));
  tx.dispatch(assignAsset(...));
  tx.dispatch(applyCamera(...));
  tx.dispatch(applyMotion(...));
  tx.dispatch(addInteraction(...));
});
```

Required behavior:

- collect commands;
- validate before commit where possible;
- execute in deterministic order;
- run invariants before final commit;
- rollback on failure;
- emit one transaction summary;
- create one undo group;
- expose dry-run mode for AI/Studio previews.

Acceptance:

- failed transaction leaves project byte-equivalent to pre-transaction state for covered state slices;
- undo/redo works across the transaction as one unit;
- transaction logs identify the failed command and reason.

Dependency: W3.

---

## W5 — Event bus + capability registry

Purpose: Reduce direct subsystem coupling and make Forge extensible.

Event examples:

```text
project.migrated
scene.created
scene.deleted
scene.reordered
asset.imported
asset.assigned
camera.changed
motion.applied
structure.changed
typography.changed
interaction.changed
performance.budgetExceeded
runtime.degraded
```

Event rules:

- events describe completed facts;
- commands emit events after successful state changes;
- events must not be used as hidden command channels;
- event payloads are typed and versioned where persisted.

Capability registry concept:

```ts
forge.registerCapability({
  id: "motion",
  version: 1,
  commands,
  validators,
  runtimeSystems,
  studioAdapters,
});
```

Initial registry targets:

- motion
- camera
- structure
- interaction
- assets
- typography

Acceptance:

- at least three existing subsystems register capability metadata;
- Studio may query capabilities instead of hardcoding every subsystem;
- one new test capability can be registered without editing Forge Core.

Dependency: W3 for command registration. Event bus can begin earlier.

---

## W6 — Invariants

Purpose: Prevent Forge from entering states that are structurally valid JSON but invalid as a production project.

Required invariants:

- project has at least one scene;
- scene IDs are unique;
- scene ranges are valid and ordered;
- required references resolve;
- referenced assets exist;
- interaction targets resolve;
- rig nodes exist in the declared model where locally inspectable;
- motion targets resolve to registered targets;
- cameras have valid FOV/near/far relationships;
- active structure references valid sections;
- active typography references valid selected families;
- mobile fallbacks are valid when required;
- no unsupported future schema is executed.

API:

```ts
assertForgeInvariants(project, context)
validateForgeInvariants(project, context)
```

Run points:

- after migration;
- after import;
- at transaction commit;
- before export;
- before publish;
- in CI for every fixture.

Acceptance:

- invariant failures are structured and actionable;
- transaction invariant failure triggers rollback;
- all golden fixtures pass.

Dependency: can begin in parallel with W3. Integrates with W4 later.

---

## W7 — Regression engineering

Purpose: Make quality loss measurable and merge-blocking.

### Deterministic snapshots
Protect:

- motion archetype compilation;
- camera choreography output;
- structure plan generation;
- project migration output;
- command results for canonical fixtures;
- config normalization.

### Visual regression
Baseline views:

- desktop hero;
- tablet hero;
- mobile hero;
- selected scene midpoints;
- final conversion scene;
- Studio cockpit;
- Structure Planner;
- Type Vault.

Rules:

- baseline updates require explicit approval;
- motion-sensitive captures must freeze time/progress;
- render nondeterminism must be minimized before comparing pixels.

### Browser matrix
Maintain at least:

- Chromium desktop;
- WebKit desktop;
- one mobile viewport per engine where practical.

Acceptance:

- a deliberate visible regression can be demonstrated to fail CI;
- a baseline approval path exists and is documented.

Dependency: W0.

---

## W8 — Performance contracts

Purpose: Stop performance degradation from accumulating unnoticed.

Introduce project-configurable hard and warning budgets.

Baseline budget categories:

```text
initial JS
route JS
initial 3D transfer
initial media transfer
texture memory estimate
triangle count
draw call count
LCP
CLS
INP or interaction latency proxy
main-thread long tasks
runtime frame budget
```

Example policy:

```json
{
  "initialJsKb": { "warn": 500, "fail": 600 },
  "initial3dMb": { "warn": 8, "fail": 12 },
  "lcpMs": { "warn": 2200, "fail": 2800 },
  "cls": { "warn": 0.08, "fail": 0.12 }
}
```

Rules:

- compare current PR against baseline, not only absolute ceilings;
- large percentage regressions fail even when under a loose global ceiling;
- intentional budget increases require project-level justification.

Acceptance:

- CI reports absolute value, baseline value and percentage delta;
- test PR can demonstrate a budget failure;
- performance report is retained as artifact.

Dependency: W0 baseline.

---

## W9 — Runtime health + fault isolation

Purpose: Make production failures observable and local.

Runtime health model:

```text
runtime            healthy | degraded | failed
rendering          healthy | degraded | failed
camera             healthy | degraded | failed
motion             healthy | degraded | failed
assets             healthy | degraded | failed
media              healthy | degraded | failed
interactions       healthy | degraded | failed
webgl              healthy | degraded | unavailable
```

Expose:

- loaded/failed asset count;
- optional subsystem failures;
- current quality tier;
- recent runtime errors;
- degraded fallback state;
- approximate FPS/frame-time diagnostics in debug mode.

Fault boundaries:

- WebGL boundary;
- asset boundary;
- media boundary;
- interaction boundary;
- optional shader/effect boundary;
- DOM fallback boundary.

Rules:

- optional media failure falls back to poster/image where available;
- WebGL failure preserves a usable DOM experience where project mode permits;
- one interaction failure is isolated and logged;
- production users do not see developer stack traces.

Acceptance:

- controlled failure tests prove local degradation instead of full-app collapse.

Dependency: independent; integrates best after W5 events.

---

## W10 — Studio thinning

Purpose: Make Studio an adapter/client of Forge Core instead of the owner of domain behavior.

Target rule:

```text
Studio = render state + collect input + dispatch commands + present results
```

Move out of large UI components:

- scene mutation logic;
- motion generation;
- structure application;
- asset assignment rules;
- project mutation rules;
- validation orchestration;
- undo grouping logic where command/transaction layer can own it.

Do not rewrite the full Studio at once.

Migration sequence:

1. scene operations;
2. motion archetype application;
3. structure application;
4. camera updates;
5. asset assignment;
6. interaction mutations;
7. project creation/import/export orchestration.

Acceptance:

- UI behavior unchanged;
- business logic line count in `ProductionStudioWorkbench` materially decreases;
- covered operations can be executed in headless tests without React.

Dependency: W3/W4.

---

## 8. Parallel execution plan

The initiative should be run as four lanes.

### Lane A — Core architecture

```text
W1 boundaries
   ↓
W3 commands
   ↓
W4 transactions
   ↓
W5 capability registry
```

### Lane B — Data durability

```text
W2 schema/migrations
   ↓
W6 invariants
```

### Lane C — Quality gates

```text
W0 baselines
   ├─ W7 regression engineering
   └─ W8 performance contracts
```

### Lane D — Runtime resilience

```text
W9 runtime health/fault isolation
```

After W3 + W4 stabilize:

```text
W10 Studio thinning
```

This is the main speed strategy: multiple lanes move concurrently, but integration waits on explicit contracts.

---

## 9. Merge strategy

Do not create one giant engineering-core PR.

Recommended PR sequence:

```text
PR-A0  Baseline fixtures + engineering metrics
PR-A1  Architecture boundaries
PR-B1  Schema version envelope + migration registry
PR-C1  Core command interfaces + scene commands
PR-D1  Invariant engine
PR-E1  Transactions + command undo groups
PR-F1  Event bus
PR-G1  Capability registry
PR-H1  Deterministic regression suite
PR-I1  Visual regression gates
PR-J1  Performance delta gates
PR-K1  Runtime health + fault boundaries
PR-L1  Studio scene/motion migration to commands
PR-L2  Studio structure/camera/assets migration
```

Every PR must be independently useful and revertible.

No PR should require a partially merged companion PR to keep `main` healthy.

---

## 10. Definition of done for every engineering PR

Every PR must include:

- explicit scope;
- preserved behavior statement;
- tests for new contracts;
- migration notes if persisted data changes;
- no unresolved TypeScript errors;
- no new lint errors;
- `npm run check` green;
- production build green;
- browser suite green when runtime/UI touched;
- performance delta attached when runtime bundle/render path changes;
- visual evidence attached when user-visible rendering changes;
- rollback/revert safety documented for foundational changes.

A PR is not considered complete because the code path "works on the happy path."

---

## 11. AI execution rules

Claude/Codex/ChatGPT operating on this initiative must follow these rules:

1. Never bypass existing validation to make a refactor pass.
2. Never delete legacy paths until the replacement is proven by fixtures.
3. Prefer adapters over simultaneous rewrites.
4. Keep public behavior stable unless the spec explicitly calls for change.
5. Add tests before or with each migrated vertical slice.
6. Do not mix unrelated cleanup into foundational PRs.
7. Do not rename large directory trees and change behavior in the same PR.
8. Before modifying a core abstraction, identify all current consumers.
9. Preserve deterministic behavior of directors/archetypes unless intentionally versioned.
10. Treat fixture failures as blockers, not nuisances.
11. Treat performance regression as a product regression.
12. Never update visual baselines simply to silence a failing test without explaining the visual change.
13. Use the same command/transaction path for AI mutations that Studio uses.
14. Prefer narrow stable interfaces over exposing internal state directly.
15. Keep changes reversible until the migration is complete.

---

## 12. Fast path without quality loss

The program should optimize for **parallelism, not shortcuts**.

Allowed accelerators:

- parallel branches with non-overlapping ownership;
- contract-first interfaces;
- fixture-first implementation;
- adapters around existing systems;
- automated codemods for repetitive import/ID migrations after tests exist;
- headless command tests instead of repeated manual Studio operation;
- reusable test harnesses;
- shared migration helpers;
- generated invariant reports;
- automated performance comparison;
- AI agents assigned to isolated workstreams with a common spec.

Disallowed accelerators:

- disabling tests;
- removing audits;
- weakening schemas;
- broad `any` typing;
- silently changing persisted formats;
- bypassing migration logic;
- merging red CI with a plan to fix later;
- replacing deterministic behavior with uncontrolled AI generation;
- approving visual baseline changes without inspection;
- large rewrites that eliminate the ability to compare old/new behavior.

The principle is simple:

> **Go faster by reducing coordination cost and rework, not by reducing verification.**

---

## 13. Suggested implementation order

### Phase 1 — Protect the current machine

- W0 baseline fixtures
- W1 architecture boundaries
- W2 schema version envelope
- W6 first invariant set

Exit gate:

- current projects still work;
- old/current project versions have a defined migration path;
- architecture violations fail CI;
- fixtures are stable.

### Phase 2 — Centralize mutation

- W3 command system
- W4 transactions
- initial W5 events

Exit gate:

- scene operations and motion application run headlessly;
- transaction rollback is proven;
- Studio uses commands for at least one important vertical slice.

### Phase 3 — Lock quality

- W7 deterministic + visual regression
- W8 performance contracts

Exit gate:

- deliberate visual and performance regressions are proven to fail CI.

### Phase 4 — Make runtime resilient

- W9 health and boundaries
- expand W5 events/capabilities

Exit gate:

- controlled WebGL/media/asset failures degrade locally.

### Phase 5 — Thin Studio

- W10 progressive migration

Exit gate:

- Studio is substantially less responsible for domain mutation;
- covered operations are testable without React;
- AI and Studio share the same command surface.

---

## 14. Engineering scorecard

Track these numbers per milestone:

```text
Architecture violations                 target: 0
Unversioned persisted project formats   target: 0
Core commands with headless tests        target: increasing
Covered mutation paths via commands      target: >80% of high-value actions
Transaction rollback coverage            target: all multi-step high-value actions
Invariant violations in fixtures         target: 0
Golden fixtures passing                  target: 100%
Deterministic snapshot failures          target: 0 unexplained
Visual regression failures               target: 0 unexplained
Performance regressions                  target: 0 unexplained
Runtime fatal errors in fault tests       target: 0 for optional subsystems
Studio business-logic LOC                target: decreasing milestone over milestone
```

Do not use total test count as the primary maturity metric. Measure coverage of contracts and failure modes.

---

## 15. Final acceptance test

The Engineering Core initiative is successful when the following scenario works:

1. Open a Forge project created several schema versions earlier.
2. Forge migrates it automatically and reports the migration steps.
3. Invariants confirm the migrated project is executable.
4. Studio or an AI agent issues a transaction: add scene, assign asset, apply camera, apply motion, create interaction.
5. One command is intentionally made invalid.
6. The transaction rolls back with no partial project mutation.
7. A corrected transaction commits and becomes one undoable action.
8. Events update interested subsystems without direct cross-calls.
9. Runtime loads the result.
10. An optional video is intentionally broken and falls back without killing the experience.
11. Visual regression matches approved baselines.
12. Performance remains inside approved budgets.
13. Production build, browser suite, audits, invariants and fixtures all pass.
14. The same mutation sequence can be executed headlessly without rendering Studio.

When that scenario passes, Forge has a real internal engineering backbone rather than only a large set of powerful features.

---

## 16. Immediate first sprint

Start with four parallel branches:

### Branch 1 — `eng/boundaries`
- architecture map;
- import-boundary checker;
- CI integration.

### Branch 2 — `eng/schema-migrations`
- schema version field;
- migration registry;
- one real migration fixture.

### Branch 3 — `eng/fixtures-invariants`
- golden fixture layout;
- first invariant engine;
- fixture CI runner.

### Branch 4 — `eng/commands-scene`
- command interfaces;
- scene add/delete/duplicate/move;
- headless tests;
- adapter into current Studio behavior.

Merge order:

```text
1. fixtures/baseline support
2. boundaries
3. schema/migrations
4. invariants
5. commands
```

The branches may develop concurrently, but each must rebase on the latest merged engineering foundation before final review.

After those land, immediately start transactions, events and performance/visual gates in parallel.

---

## 17. Bottom line

The goal is not "more enterprise architecture."

The goal is to make Forge faster to build **because** it is better engineered:

- fewer regressions;
- less duplicated logic;
- safer AI autonomy;
- easier debugging;
- easier project upgrades;
- easier subsystem additions;
- smaller blast radius when something fails;
- stronger confidence when shipping $10k, $30k and $60k+ work from the same platform.

The engineering rule for this initiative is:

> **Move fast by making changes smaller, contracts clearer, execution parallel, and verification automatic. Never move fast by lowering the bar.**
