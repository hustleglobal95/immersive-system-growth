# Interaction Graph

Forge 6 adds a deterministic event and state orchestration layer above the cinematic timeline. The timeline remains the source of frame-accurate camera, object, DOM, media and shader motion. The interaction graph decides when those systems react to input, state, conditions and subsystem lifecycle events.

## Runtime model

```text
DOM / R3F raycast / scene / media / device / custom event
                         ↓
                 interaction graph
                         ↓
           trigger → condition → action/state
                         ↓
              bounded deterministic result
                         ↓
     runtime command consumers + lifecycle events
```

`config/interaction-graph.json` is validated at build time by `src/lib/interactionGraph.ts`. `src/lib/interactionGraphEngine.ts` is a pure evaluator. It does not touch React, DOM APIs, WebGL or the Zustand experience store. This keeps graph behavior reproducible in unit tests and in the Studio debugger.

`src/runtime/InteractionGraphController.tsx` translates production input into typed graph events and applies direct effects. `src/runtime/RuntimeCommandController.tsx` consumes cinematic sequence, camera, audio and shader commands. Completed and cancelled commands re-enter the graph through typed lifecycle events.

## Triggers

Supported trigger events are:

- scene enter and exit
- DOM or R3F click
- hover enter and leave
- pointer movement
- drag start, drag and drag end
- keyboard
- wheel
- device orientation
- video time updates
- custom application events
- hotspot open and close
- idle timers
- sequence complete
- camera complete
- audio complete
- shader complete
- action cancelled

Triggers can be restricted to one or more graph states. Lifecycle events can be filtered by command name, which makes chains such as `sequence-complete: ingredients` deterministic.

DOM targets use logical attributes rather than arbitrary selectors:

```html
<button data-forge-interaction="product-inspect">Inspect</button>
```

R3F targets use the same logical namespace. Forge automatically exposes the persistent hero as `hero`, mapped product-rig nodes as `rig:<node-name>`, and scene assets as `asset:<asset-id>`.

## Conditions

Conditions can branch on graph state, declared variables, incoming event fields, quality tier or reduced-motion state. Operators include equality, inequality, numeric comparison, truthy/falsy and string inclusion.

## Actions

Direct actions can set graph variables or state, open and close hotspots, change quality, change the motion policy, modify logical DOM classes and seek normalized page progress.

Runtime actions include:

### Sequence

A sequence name resolves to a scene ID. `play`, `pause` and `stop` are supported. Optional duration, looping and release-to-scroll behavior can be authored. Sequence playback drives the same normalized cinematic progress used by camera, object, DOM and media systems, so the experience stays synchronized.

### Camera

A camera action can play or reset a named shot. The name can be a scene ID or a built-in shot such as `low-reveal`, `hero-orbit` or `detail-approach`. Camera playback blends from the current live camera to avoid snapping. Optional duration and release-to-scroll behavior are supported.

### Audio

Audio actions support play, pause and stop, an optional HTTPS or root-relative source, volume, looping and fades. Browsers can block sound before a user gesture. Forge reports that condition as `action-cancelled` rather than retrying indefinitely.

### Shader and material parameters

Shader actions address registered targets and parameters. Built-in material parameters include opacity, visibility, color, emissive color, roughness, metalness, emissive intensity, clearcoat, transmission, IOR and thickness. Custom shader uniforms use `uniform:<name>`.

Targets include:

```text
hero
rig:<mapped-node-name>
asset:<scene-asset-id>
```

Numeric and color parameters can animate over a bounded duration with a runtime easing curve. Overrides are persistent and are reapplied after authored cinematic material updates, so an interactive material choice is not overwritten on the next render frame.

### Orbit

Orbit actions enable, disable or reset drag rotation for a logical 3D target. Once enabled, raycast drag events update a bounded orbit offset. This is intended for inspection modes, product configurators and detail exploration.

### Navigate

Navigation actions accept root-relative routes, HTTPS destinations, hashes and `mailto:` links. Unsafe schemes are rejected by schema validation. A cancelable `forge:navigate` browser event is emitted before navigation so an application can intercept the transition.

## Lifecycle and cancellation

Long-running consumers emit events back into the graph:

```text
sequence-complete
camera-complete
audio-complete
shader-complete
action-cancelled
```

This makes orchestration composable. For example:

```text
click product
→ play inspection camera
→ camera-complete
→ enable orbit
→ drag product
→ click close
→ reset camera
→ camera-complete
→ return to browsing state
```

Replacing a running sequence, camera move or shader transition emits `action-cancelled`. Graph authors can branch on those events when cleanup is required.

## R3F raycast interaction

`useThreeInteraction` converts R3F pointer intersections into the same graph event model as DOM interactions. Payloads include normalized pointer coordinates, world intersection coordinates, client coordinates, drag deltas, pointer pressure and pointer type. A short press without meaningful drag distance is synthesized as a click.

This avoids separate interaction systems for DOM and WebGL content.

## Mobile interaction substitution

`mobileSubstitutions` defines coarse-pointer substitutions. A common mapping is:

```json
{
  "from": "hover-enter",
  "to": "click",
  "target": "product-inspect"
}
```

A tap keeps its native click semantics and additionally evaluates the authored hover behavior. Desktop behavior is unchanged.

## Custom and typed events

Legacy application entry remains available:

```ts
window.dispatchEvent(new CustomEvent("forge:interaction", {
  detail: {
    name: "inspect-product",
    target: "product-inspect",
    payload: { source: "cta" }
  }
}));
```

Runtime subsystems use the typed `forge:interaction-event` channel. Only bounded primitive payload values are accepted.

## Studio

Open `/studio` and select **Interactions**. Studio supports:

- draggable trigger, condition, action and state nodes
- true/false directed branches
- all production trigger types
- sequence, camera, audio, shader, orbit and navigation authoring
- state and variable registries
- graph validation
- deterministic simulation without production side effects
- mobile/coarse-pointer substitution simulation
- execution traces and effect inspection

Interaction drafts persist with the Studio draft and can be exported as `interaction-graph.json`.

## Safety and determinism

The graph evaluator has hard execution guards:

- at most 128 evaluated graph steps for one incoming event
- at most 8 visits to any one node in one evaluation

Schemas reject duplicate IDs, dangling edges, unknown states, undeclared variables, unsafe navigation URLs and unsafe audio URLs. Runtime payloads are bounded and sanitized.

## Authoring rule

Use the graph for causality, branching, state and command lifecycle. Use the motion sequencer for frame-accurate choreography. Do not reproduce keyframes as dozens of graph actions. The graph should select or control authored cinematic behavior.

## Testing

`tests/interaction-graph.test.ts` covers graph determinism, guards, mobile substitutions, lifecycle matching, production action schemas and unsafe input rejection. `tests/runtime-commands.test.ts` covers runtime easing, camera sampling and persistent shader overrides. Browser coverage verifies Studio authoring and an actual sequence command completing and re-entering the production graph in Chromium and WebKit.
