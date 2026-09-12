import assert from "node:assert/strict";
import test from "node:test";
import { parseInteractionGraph, type InteractionGraph } from "../src/lib/interactionGraph";
import { createInteractionSnapshot, expandInteractionEventForDevice, runInteractionEvent } from "../src/lib/interactionGraphEngine";

const graph = parseInteractionGraph({
  version: 1,
  id: "test-graph",
  initialState: "idle",
  states: ["idle", "ready", "detail"],
  variables: { enabled: false },
  nodes: [
    { id: "enter", kind: "trigger", label: "Enter", position: { x: 0, y: 0 }, event: "scene-enter", sceneId: "arrival", states: ["idle"] },
    { id: "enable", kind: "action", label: "Enable", position: { x: 1, y: 0 }, action: { type: "set-variable", key: "enabled", value: true } },
    { id: "ready", kind: "state", label: "Ready", position: { x: 2, y: 0 }, state: "ready" },
    { id: "inspect", kind: "trigger", label: "Inspect", position: { x: 0, y: 1 }, event: "custom", name: "inspect", states: ["ready"] },
    { id: "check", kind: "condition", label: "Enabled", position: { x: 1, y: 1 }, source: "variable", key: "enabled", operator: "eq", value: true },
    { id: "detail", kind: "state", label: "Detail", position: { x: 2, y: 1 }, state: "detail" },
    { id: "emit", kind: "action", label: "Emit", position: { x: 3, y: 1 }, action: { type: "emit", name: "detail-ready", payload: { source: "test" } } },
    { id: "hover", kind: "trigger", label: "Hover", position: { x: 0, y: 2 }, event: "hover-enter", target: "product-inspect", states: [] },
  ],
  edges: [
    { id: "e1", from: "enter", to: "enable", branch: "always", priority: 0 },
    { id: "e2", from: "enable", to: "ready", branch: "always", priority: 0 },
    { id: "e3", from: "inspect", to: "check", branch: "always", priority: 0 },
    { id: "e4", from: "check", to: "detail", branch: "true", priority: 0 },
    { id: "e5", from: "detail", to: "emit", branch: "always", priority: 0 },
  ],
  mobileSubstitutions: [{ from: "hover-enter", to: "click", target: "product-inspect" }],
});

test("interaction graph transitions state and variables deterministically", () => {
  const initial = createInteractionSnapshot(graph);
  const entered = runInteractionEvent(graph, initial, { type: "scene-enter", sceneId: "arrival" }, { quality: "high", reducedMotion: false });
  assert.equal(entered.state, "ready");
  assert.equal(entered.variables.enabled, true);
  assert.deepEqual(entered.matchedTriggers, ["enter"]);

  const inspected = runInteractionEvent(graph, entered, { type: "custom", name: "inspect" }, { quality: "high", reducedMotion: false });
  assert.equal(inspected.state, "detail");
  assert.equal(inspected.effects.at(-1)?.action.type, "emit");
  assert.equal(inspected.halted, false);
});

test("trigger state guards and false conditions do not leak downstream effects", () => {
  const initial = createInteractionSnapshot(graph);
  const blocked = runInteractionEvent(graph, initial, { type: "custom", name: "inspect" }, { quality: "high", reducedMotion: false });
  assert.deepEqual(blocked.matchedTriggers, []);
  assert.equal(blocked.state, "idle");
  assert.equal(blocked.effects.length, 0);

  const readyButDisabled = { state: "ready", variables: { enabled: false } };
  const checked = runInteractionEvent(graph, readyButDisabled, { type: "custom", name: "inspect" }, { quality: "high", reducedMotion: false });
  assert.equal(checked.state, "ready");
  assert.equal(checked.effects.length, 0);
  assert.ok(checked.trace.some((entry) => entry.nodeId === "check" && entry.detail === "false"));
});

test("coarse pointer substitution preserves click and adds authored hover semantics", () => {
  const events = expandInteractionEventForDevice(graph, { type: "click", target: "product-inspect" }, true);
  assert.deepEqual(events.map((event) => event.type), ["click", "hover-enter"]);
  const desktop = expandInteractionEventForDevice(graph, { type: "click", target: "product-inspect" }, false);
  assert.deepEqual(desktop.map((event) => event.type), ["click"]);
});

test("schema rejects dangling edges and undeclared variables", () => {
  const invalid = structuredClone(graph) as InteractionGraph;
  invalid.edges.push({ id: "bad-edge", from: "missing", to: "detail", branch: "always", priority: 0 });
  assert.throws(() => parseInteractionGraph(invalid));

  const badVariable = structuredClone(graph) as InteractionGraph;
  const action = badVariable.nodes.find((node) => node.id === "enable");
  if (action?.kind === "action") action.action = { type: "set-variable", key: "missing", value: true };
  assert.throws(() => parseInteractionGraph(badVariable));
});

test("cycle guard halts runaway graphs instead of locking the runtime", () => {
  const cyclic = parseInteractionGraph({
    version: 1,
    id: "cycle-graph",
    initialState: "idle",
    states: ["idle"],
    variables: { count: 0 },
    nodes: [
      { id: "start", kind: "trigger", label: "Start", position: { x: 0, y: 0 }, event: "custom", name: "start", states: [] },
      { id: "loop", kind: "action", label: "Loop", position: { x: 1, y: 0 }, action: { type: "emit", name: "tick", payload: {} } },
    ],
    edges: [
      { id: "start-loop", from: "start", to: "loop", branch: "always", priority: 0 },
      { id: "loop-loop", from: "loop", to: "loop", branch: "always", priority: 0 },
    ],
    mobileSubstitutions: [],
  });
  const result = runInteractionEvent(cyclic, createInteractionSnapshot(cyclic), { type: "custom", name: "start" }, { quality: "low", reducedMotion: true });
  assert.equal(result.halted, true);
  assert.ok(result.trace.some((entry) => entry.kind === "guard"));
});

test("Forge 6 runtime action contracts validate with bounded production controls", () => {
  const actions = [
    { type: "sequence", name: "ingredients", command: "play", durationMs: 2200, loop: false, release: true },
    { type: "camera", name: "detail-approach", command: "play", durationMs: 1200, release: false },
    { type: "audio", name: "ambient", command: "play", src: "/audio/ambient.mp3", volume: .6, loop: true, fadeMs: 800 },
    { type: "shader", target: "hero", parameter: "roughness", value: .2, durationMs: 500, easing: "ease-in-out" },
    { type: "orbit", target: "rig:top-bun", command: "enable", sensitivity: .006 },
    { type: "navigate", href: "/contact", replace: false },
  ];
  const runtimeGraph = parseInteractionGraph({
    version: 1,
    id: "runtime-actions",
    initialState: "idle",
    states: ["idle"],
    variables: {},
    nodes: [
      { id: "start", kind: "trigger", label: "Start", position: { x: 0, y: 0 }, event: "custom", name: "start", states: [] },
      ...actions.map((action, index) => ({ id: `action-${index + 1}`, kind: "action", label: `Action ${index + 1}`, position: { x: index + 1, y: 0 }, action })),
    ],
    edges: actions.map((_, index) => ({ id: `edge-${index + 1}`, from: index ? `action-${index}` : "start", to: `action-${index + 1}`, branch: "always", priority: 0 })),
    mobileSubstitutions: [],
  });
  const result = runInteractionEvent(runtimeGraph, createInteractionSnapshot(runtimeGraph), { type: "custom", name: "start" }, { quality: "high", reducedMotion: false });
  assert.deepEqual(result.effects.map((effect) => effect.action.type), ["sequence", "camera", "audio", "shader", "orbit", "navigate"]);
});

test("lifecycle event names match deterministically", () => {
  const lifecycle = parseInteractionGraph({
    version: 1,
    id: "lifecycle",
    initialState: "idle",
    states: ["idle"],
    variables: {},
    nodes: [
      { id: "done", kind: "trigger", label: "Sequence done", position: { x: 0, y: 0 }, event: "sequence-complete", name: "ingredients", states: [] },
      { id: "mark", kind: "action", label: "Mark", position: { x: 1, y: 0 }, action: { type: "emit", name: "advanced", payload: {} } },
    ],
    edges: [{ id: "done-mark", from: "done", to: "mark", branch: "always", priority: 0 }],
    mobileSubstitutions: [],
  });
  const wrong = runInteractionEvent(lifecycle, createInteractionSnapshot(lifecycle), { type: "sequence-complete", name: "arrival" }, { quality: "high", reducedMotion: false });
  assert.equal(wrong.effects.length, 0);
  const correct = runInteractionEvent(lifecycle, createInteractionSnapshot(lifecycle), { type: "sequence-complete", name: "ingredients" }, { quality: "high", reducedMotion: false });
  assert.equal(correct.effects[0]?.action.type, "emit");
});

test("drag targets are required and navigation and audio URLs fail closed", () => {
  const base = {
    version: 1,
    id: "validation",
    initialState: "idle",
    states: ["idle"],
    variables: {},
    edges: [],
    mobileSubstitutions: [],
  } as const;
  assert.throws(() => parseInteractionGraph({ ...base, nodes: [{ id: "drag", kind: "trigger", label: "Drag", position: { x: 0, y: 0 }, event: "drag", states: [] }] }));
  assert.throws(() => parseInteractionGraph({ ...base, nodes: [{ id: "nav", kind: "action", label: "Nav", position: { x: 0, y: 0 }, action: { type: "navigate", href: "javascript:alert(1)" } }] }));
  assert.throws(() => parseInteractionGraph({ ...base, nodes: [{ id: "audio", kind: "action", label: "Audio", position: { x: 0, y: 0 }, action: { type: "audio", name: "cue", command: "play", src: "http://unsafe.test/a.mp3" } }] }));
});
