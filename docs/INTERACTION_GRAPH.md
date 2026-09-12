# Interaction Graph

Forge 6 adds a deterministic event and state orchestration layer above the existing cinematic timeline. The timeline remains the source of frame-accurate camera, object, DOM, media and shader motion. The interaction graph decides when those systems should react to input, state and conditions.

## Runtime model

The production path is:

```text
DOM / scene / hotspot / custom / idle event
                ↓
        interaction graph
                ↓
  trigger → condition → action/state
                ↓
 bounded deterministic result
                ↓
 runtime effects and Forge subsystem events
```

`config/interaction-graph.json` is validated at build time by `src/lib/interactionGraph.ts`. `src/lib/interactionGraphEngine.ts` is a pure evaluator. It does not touch React, DOM APIs, WebGL or the Zustand experience store. This keeps branching behavior reproducible in unit tests and in the Studio debugger.

`src/runtime/InteractionGraphController.tsx` is the client adapter. It translates scene changes, hotspots, DOM interaction targets, custom events, pointer input and idle timers into typed graph events, then applies the resulting effects.

## Node types

### Trigger

Starts evaluation. Supported events are scene enter/exit, click, hover enter/leave, pointer, custom, hotspot open/close and idle. Triggers can be restricted to specific graph states.

DOM click and hover targets use a logical attribute rather than an arbitrary CSS selector:

```html
<button data-forge-interaction="product-inspect">Inspect</button>
```

A trigger with `target: "product-inspect"` can react to that element without coupling the graph to DOM structure or class names.

### Condition

Branches on graph state, declared variables, event payload fields, current quality tier or reduced-motion state. Supported operators include equality, inequality, numeric comparisons, truthy/falsy and string inclusion.

### Action

Actions can:

- set graph variables or state
- open or close hotspots
- change adaptive quality mode
- change reduced-motion policy
- add, remove or toggle classes on logical interaction targets
- seek normalized page progress
- emit typed Forge events
- request motion-sequence, camera, audio and shader actions

The `sequence`, `camera`, `audio` and `shader` actions dispatch `forge:sequence`, `forge:camera`, `forge:audio` and `forge:shader` browser events. Runtime subsystems can subscribe without introducing direct component-to-component dependencies.

### State

Moves the finite state machine to a declared state. State nodes are useful when the same state transition is shared by multiple branches.

## Safety and determinism

The graph runtime has two hard guards:

- a maximum of 128 evaluated graph steps for one incoming event
- a maximum of 8 visits to any one node during a single evaluation

This allows intentional loops while preventing malformed graphs from locking the main thread.

Graph schemas reject duplicate node/edge IDs, dangling edges, unknown states and undeclared variables. State and variable mutation happens inside the pure evaluator before external effects are applied, so downstream conditions in the same event see the deterministic updated snapshot.

## Mobile interaction substitution

`mobileSubstitutions` describes how an authored interaction is replaced on coarse-pointer devices. For example:

```json
{
  "from": "hover-enter",
  "to": "click",
  "target": "product-inspect"
}
```

A tap/click on a coarse-pointer device keeps its native click semantics and additionally evaluates the authored hover-enter behavior. Desktop behavior is unchanged.

## Custom events

Application code can enter the graph without importing the engine:

```ts
window.dispatchEvent(new CustomEvent("forge:interaction", {
  detail: {
    name: "inspect-product",
    target: "product-inspect",
    payload: { source: "cta" }
  }
}));
```

Only bounded primitive payload values are accepted by the runtime adapter.

## Studio

Open `/studio` and select **Interactions**. The workspace provides:

- draggable trigger, condition, action and state nodes
- visible directed edges with true/false branch styling
- node property editing
- state and variable registries
- edge authoring and deletion
- graph validation feedback
- a deterministic simulator that never executes production side effects
- mobile/coarse-pointer substitution simulation
- execution traces and emitted-effect inspection

Interaction drafts are stored with the existing Studio draft in local browser storage and can be exported as `interaction-graph.json`.

## Authoring rule

Use the graph for **causality and branching**. Use the motion sequencer for **time-based choreography**. Do not duplicate a frame-accurate animation as dozens of graph actions. A graph action should start, stop, seek or select a cinematic sequence, not reimplement its keyframes.

## Testing

`tests/interaction-graph.test.ts` covers state transitions, conditions, mobile substitutions, schema rejection and cycle guards. The Studio browser suite covers visual graph authoring and deterministic simulation in Chromium and WebKit.
