import { z } from "zod";

const finite = z.number().finite();
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const token = z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/);
const eventName = z.string().regex(/^[a-zA-Z0-9_.:-]{1,120}$/);
const className = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$/);
const primitive = z.union([z.string().max(500), finite, z.boolean(), z.null()]);
const primitiveRecord = z.record(z.string().min(1).max(80), primitive);
const position = z.object({ x: finite.min(-5000).max(5000), y: finite.min(-5000).max(5000) }).strict();
const durationMs = finite.int().min(0).max(120000);
const audioUrl = z.string().refine(
  (value) => /^\/(?!\/)[^\s?#]*$/.test(value) || /^https:\/\/[^\s]+$/.test(value),
  "Use a root-relative path or HTTPS URL",
);
const navigationUrl = z.string().refine(
  (value) => /^(?:\/(?!\/)|#[a-z]|https:\/\/|mailto:)/i.test(value) && !/[\s<>]/.test(value),
  "Unsafe or unsupported navigation URL",
);
const runtimeEasing = z.enum(["linear", "smooth", "ease-in", "ease-out", "ease-in-out"]);

export const interactionEventTypeSchema = z.enum([
  "scene-enter",
  "scene-exit",
  "click",
  "hover-enter",
  "hover-leave",
  "pointer",
  "drag-start",
  "drag",
  "drag-end",
  "key",
  "wheel",
  "orientation",
  "video-time",
  "custom",
  "hotspot-open",
  "hotspot-close",
  "idle",
  "sequence-complete",
  "camera-complete",
  "audio-complete",
  "shader-complete",
  "action-cancelled",
]);

const sequenceAction = z.object({
  type: z.literal("sequence"),
  name: eventName,
  command: z.enum(["play", "pause", "stop"]),
  durationMs: durationMs.optional(),
  loop: z.boolean().default(false),
  release: z.boolean().default(false),
}).strict();
const cameraAction = z.object({
  type: z.literal("camera"),
  name: eventName,
  command: z.enum(["play", "reset"]).default("play"),
  durationMs: durationMs.optional(),
  release: z.boolean().default(false),
}).strict();
const audioAction = z.object({
  type: z.literal("audio"),
  name: eventName,
  command: z.enum(["play", "pause", "stop"]),
  src: audioUrl.optional(),
  volume: finite.min(0).max(1).optional(),
  loop: z.boolean().optional(),
  fadeMs: durationMs.max(10000).optional(),
}).strict();
const shaderAction = z.object({
  type: z.literal("shader"),
  target: token,
  parameter: token,
  value: z.union([finite, z.string().max(120), z.boolean()]),
  durationMs: durationMs.max(30000).optional(),
  easing: runtimeEasing.default("smooth"),
}).strict();

export const interactionActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set-variable"), key: id, value: primitive }).strict(),
  z.object({ type: z.literal("set-state"), state: id }).strict(),
  z.object({ type: z.literal("hotspot"), mode: z.enum(["open", "close"]), id: token.optional() }).strict(),
  z.object({ type: z.literal("quality"), value: z.enum(["auto", "low", "medium", "high"]) }).strict(),
  z.object({ type: z.literal("motion"), value: z.enum(["system", "reduced", "full"]) }).strict(),
  z.object({ type: z.literal("class"), target: token, className, mode: z.enum(["add", "remove", "toggle"]) }).strict(),
  z.object({ type: z.literal("seek"), progress: finite.min(0).max(1), behavior: z.enum(["auto", "smooth"]).default("smooth") }).strict(),
  z.object({ type: z.literal("emit"), name: eventName, payload: primitiveRecord.default({}) }).strict(),
  sequenceAction,
  cameraAction,
  audioAction,
  shaderAction,
  z.object({
    type: z.literal("orbit"),
    target: token,
    command: z.enum(["enable", "disable", "reset"]),
    sensitivity: finite.min(0.0005).max(0.05).optional(),
  }).strict(),
  z.object({ type: z.literal("navigate"), href: navigationUrl, replace: z.boolean().default(false) }).strict(),
]);

const nodeBase = {
  id,
  label: z.string().min(1).max(80),
  position,
};

const targetedEvents = new Set([
  "click",
  "hover-enter",
  "hover-leave",
  "drag-start",
  "drag",
  "drag-end",
]);
const namedEvents = new Set([
  "custom",
  "sequence-complete",
  "camera-complete",
  "audio-complete",
  "shader-complete",
  "action-cancelled",
]);

export const interactionTriggerNodeSchema = z.object({
  ...nodeBase,
  kind: z.literal("trigger"),
  event: interactionEventTypeSchema,
  target: token.optional(),
  sceneId: id.optional(),
  name: eventName.optional(),
  delayMs: finite.int().min(250).max(120000).optional(),
  states: z.array(id).max(24).default([]),
}).strict().superRefine((node, context) => {
  if (targetedEvents.has(node.event) && !node.target) {
    context.addIssue({ code: "custom", path: ["target"], message: `${node.event} triggers require a target` });
  }
  if (["scene-enter", "scene-exit"].includes(node.event) && !node.sceneId) {
    context.addIssue({ code: "custom", path: ["sceneId"], message: `${node.event} triggers require a sceneId` });
  }
  if (namedEvents.has(node.event) && !node.name) {
    context.addIssue({ code: "custom", path: ["name"], message: `${node.event} triggers require a name` });
  }
  if (node.event === "idle" && node.delayMs === undefined) {
    context.addIssue({ code: "custom", path: ["delayMs"], message: "Idle triggers require delayMs" });
  }
});

export const interactionConditionNodeSchema = z.object({
  ...nodeBase,
  kind: z.literal("condition"),
  source: z.enum(["state", "variable", "event", "quality", "reduced-motion"]),
  key: z.string().min(1).max(80).optional(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "truthy", "falsy", "includes"]),
  value: primitive.optional(),
}).strict().superRefine((node, context) => {
  if (["variable", "event"].includes(node.source) && !node.key) {
    context.addIssue({ code: "custom", path: ["key"], message: `${node.source} conditions require a key` });
  }
  if (!["truthy", "falsy"].includes(node.operator) && node.value === undefined) {
    context.addIssue({ code: "custom", path: ["value"], message: `${node.operator} conditions require a comparison value` });
  }
});

export const interactionActionNodeSchema = z.object({
  ...nodeBase,
  kind: z.literal("action"),
  action: interactionActionSchema,
}).strict();

export const interactionStateNodeSchema = z.object({
  ...nodeBase,
  kind: z.literal("state"),
  state: id,
}).strict();

export const interactionNodeSchema = z.discriminatedUnion("kind", [
  interactionTriggerNodeSchema,
  interactionConditionNodeSchema,
  interactionActionNodeSchema,
  interactionStateNodeSchema,
]);

export const interactionEdgeSchema = z.object({
  id,
  from: id,
  to: id,
  branch: z.enum(["always", "true", "false"]).default("always"),
  priority: finite.int().min(-100).max(100).default(0),
}).strict();

export const interactionGraphSchema = z.object({
  version: z.literal(1),
  id,
  initialState: id,
  states: z.array(id).min(1).max(64),
  variables: z.record(id, primitive).default({}),
  nodes: z.array(interactionNodeSchema).min(1).max(240),
  edges: z.array(interactionEdgeSchema).max(720),
  mobileSubstitutions: z.array(z.object({
    from: interactionEventTypeSchema,
    to: interactionEventTypeSchema,
    target: token.optional(),
  }).strict()).max(32).default([]),
}).strict().superRefine((graph, context) => {
  const states = new Set(graph.states);
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const variables = new Set(Object.keys(graph.variables));

  if (!states.has(graph.initialState)) {
    context.addIssue({ code: "custom", path: ["initialState"], message: "Initial state must be declared in states" });
  }
  if (states.size !== graph.states.length) {
    context.addIssue({ code: "custom", path: ["states"], message: "State names must be unique" });
  }

  graph.nodes.forEach((node, index) => {
    if (nodeIds.has(node.id)) context.addIssue({ code: "custom", path: ["nodes", index, "id"], message: "Node IDs must be unique" });
    nodeIds.add(node.id);
    if (node.kind === "state" && !states.has(node.state)) {
      context.addIssue({ code: "custom", path: ["nodes", index, "state"], message: "State node references an undeclared state" });
    }
    if (node.kind === "trigger") {
      node.states.forEach((state, stateIndex) => {
        if (!states.has(state)) context.addIssue({ code: "custom", path: ["nodes", index, "states", stateIndex], message: "Trigger references an undeclared state" });
      });
    }
    if (node.kind === "condition" && node.source === "variable" && node.key && !variables.has(node.key)) {
      context.addIssue({ code: "custom", path: ["nodes", index, "key"], message: "Condition references an undeclared variable" });
    }
    if (node.kind === "action" && node.action.type === "set-variable" && !variables.has(node.action.key)) {
      context.addIssue({ code: "custom", path: ["nodes", index, "action", "key"], message: "Action references an undeclared variable" });
    }
    if (node.kind === "action" && node.action.type === "set-state" && !states.has(node.action.state)) {
      context.addIssue({ code: "custom", path: ["nodes", index, "action", "state"], message: "Action references an undeclared state" });
    }
  });

  graph.edges.forEach((edge, index) => {
    if (edgeIds.has(edge.id)) context.addIssue({ code: "custom", path: ["edges", index, "id"], message: "Edge IDs must be unique" });
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from)) context.addIssue({ code: "custom", path: ["edges", index, "from"], message: "Edge source node does not exist" });
    if (!nodeIds.has(edge.to)) context.addIssue({ code: "custom", path: ["edges", index, "to"], message: "Edge destination node does not exist" });
  });
});

export type InteractionEventType = z.infer<typeof interactionEventTypeSchema>;
export type InteractionAction = z.infer<typeof interactionActionSchema>;
export type InteractionNode = z.infer<typeof interactionNodeSchema>;
export type InteractionTriggerNode = z.infer<typeof interactionTriggerNodeSchema>;
export type InteractionConditionNode = z.infer<typeof interactionConditionNodeSchema>;
export type InteractionEdge = z.infer<typeof interactionEdgeSchema>;
export type InteractionGraph = z.infer<typeof interactionGraphSchema>;
export type InteractionPrimitive = z.infer<typeof primitive>;
export type RuntimeEasing = z.infer<typeof runtimeEasing>;

export function parseInteractionGraph(value: unknown): InteractionGraph {
  return interactionGraphSchema.parse(value);
}
