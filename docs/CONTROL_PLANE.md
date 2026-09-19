# Forge PRO+ Control Plane

The Control Plane is Forge's simplification layer.

It does not replace the runtime, Director, Sequencer, Interaction Graph, Asset Intelligence or Loop Engine. It moves subsystem choice out of the operator's decision space and into typed orchestration.

The default operating model is:

```text
select
→ understand context
→ expose relevant capabilities
→ prepare proposal
→ route to the existing Forge system
→ verify when required
→ preview / accept
```

## Product rule

The operator should think in outcomes:

- direct camera;
- compose motion;
- make inspectable;
- improve asset;
- fix mobile;
- polish;
- optimize.

The operator should not need to decide whether the task belongs to the Sequencer, Interaction Graph, Director, Asset Intelligence or a Loop before they can begin.

Expert surfaces remain available through Fine Tune / Advanced.

## 1. Selection Context Engine

`src/platform/control-plane/selectionContext.ts`

Studio selection is now a shared platform concept rather than a type owned by one React component.

A `SelectionContext` resolves:

- stable selection identity;
- active scene;
- selection label and summary;
- authored motion count;
- selected rig-node tracks;
- related interaction references;
- asset-manifest health;
- derivative coverage and savings;
- mobile-camera availability;
- current media kind;
- environment/post pressure;
- project validation blockers;
- selection-specific production issues.

Supported selection kinds:

```text
scene
camera
node
asset
environment
```

The context engine is read-only. It does not mutate project state.

## 2. Capability Registry

`src/platform/control-plane/capabilityRegistry.ts`

Every simplified action must be a registered capability.

A capability declares:

- stable capability ID;
- operator-facing label;
- supported selection kinds;
- semantic intents;
- execution class;
- risk class;
- Forge systems used;
- required verifiers;
- routing action;
- priority;
- optional advanced surface;
- optional eligibility predicate.

Execution classes:

```text
fast
deep
editor
navigation
```

Risk classes:

```text
instant-reversible
preview-required
approval-required
```

The registry validates itself.

Deep capabilities cannot be instant-reversible. Loop-backed capabilities must declare Loop Engine participation, verification requirements and preview/approval risk. Fast actions must remain reversible.

Studio asks the registry what is relevant for the current `SelectionContext`; it does not hardcode a separate action list for each subsystem.

## 3. Proposal Contract

`src/platform/control-plane/proposal.ts`

A meaningful action is represented as a proposal before it can become authoritative state.

The proposal records:

- intent;
- capability;
- selection identity;
- execution/risk class;
- bounded mutation scope;
- preserved state;
- execution plan;
- required verification;
- verification results;
- explanation;
- optional candidate bundle references.

Proposal states:

```text
draft
ready
verifying
accepted
rejected
failed
```

Preview-required proposals cannot become authoritative merely because their state is set to accepted. Only an explicit approval-required contract can cross that boundary, and later phases must still route authoritative project promotion through existing Vault/release controls.

## Studio integration

`ProductionStudioWorkbench` now consumes the Control Plane:

1. selection resolves into one `SelectionContext`;
2. the Capability Registry returns eligible actions;
3. the contextual direction card renders the highest-priority capabilities;
4. selecting a capability creates a proposal envelope;
5. the capability dispatch routes to existing Forge machinery.

Examples:

```text
Direct camera
→ select camera context

Compose motion
→ existing motion archetype / sequencer machinery

Make inspectable
→ Interaction workspace

Improve asset
→ Asset Quality Loop

Polish environment
→ Visual Polish Loop

Optimize runtime
→ Performance Loop
```

Loop-backed actions preselect the matching Loop rather than opening a generic engineering menu.

## Non-goals

This milestone does not:

- rewrite Studio;
- replace the Sequencer;
- replace the Interaction Graph;
- introduce a second runtime;
- execute natural-language mutations directly;
- bypass Loop verification;
- bypass Project Vault;
- automatically accept high-risk candidates.

It creates the architecture required to simplify those workflows safely.

## Migration rule

New default-surface capabilities should not be added as one-off Studio buttons.

A new operator-facing action should:

1. derive from `SelectionContext`;
2. register in the Capability Registry;
3. declare execution/risk class;
4. declare systems and verification;
5. produce a Proposal Contract;
6. route into existing Forge machinery;
7. expose advanced controls only as a secondary surface.

This keeps the default Studio surface simple even as Forge grows.

## Next milestone

The next Control Plane phase is the Intent Compiler + Next Action Engine.

It should:

- turn short natural-language direction into a bounded capability selection;
- rank the highest-value unresolved action;
- generate proposal plans rather than directly mutating state;
- introduce Current / Candidate preview for preview-required proposals;
- preserve the same Capability Registry and Proposal Contract.

The foundation in this document should remain stable while that layer is added.
