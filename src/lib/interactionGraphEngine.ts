import type {
  InteractionAction,
  InteractionConditionNode,
  InteractionEdge,
  InteractionEventType,
  InteractionGraph,
  InteractionPrimitive,
  InteractionTriggerNode,
} from "@/src/lib/interactionGraph";

export interface InteractionEvent {
  type: InteractionEventType;
  target?: string;
  sceneId?: string;
  name?: string;
  payload?: Record<string, InteractionPrimitive>;
}

export interface InteractionContext {
  quality: "low" | "medium" | "high";
  reducedMotion: boolean;
}

export interface InteractionSnapshot {
  state: string;
  variables: Record<string, InteractionPrimitive>;
}

export interface InteractionEffect {
  nodeId: string;
  action: InteractionAction;
}

export interface InteractionTraceEntry {
  nodeId: string;
  kind: "trigger" | "condition" | "action" | "state" | "guard";
  detail: string;
}

export interface InteractionRunResult extends InteractionSnapshot {
  matchedTriggers: string[];
  effects: InteractionEffect[];
  trace: InteractionTraceEntry[];
  halted: boolean;
}

export const INTERACTION_MAX_STEPS = 128;
const MAX_NODE_VISITS = 8;

export function createInteractionSnapshot(graph: InteractionGraph): InteractionSnapshot {
  return { state: graph.initialState, variables: structuredClone(graph.variables) };
}

export function normalizeInteractionEvent(
  graph: InteractionGraph,
  event: InteractionEvent,
  coarsePointer: boolean,
): InteractionEvent {
  if (!coarsePointer) return event;
  const substitution = graph.mobileSubstitutions.find(
    (candidate) => candidate.from === event.type && (!candidate.target || candidate.target === event.target),
  );
  return substitution ? { ...event, type: substitution.to } : event;
}

export function runInteractionEvent(
  graph: InteractionGraph,
  snapshot: InteractionSnapshot,
  event: InteractionEvent,
  context: InteractionContext,
): InteractionRunResult {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, InteractionEdge[]>();
  for (const edge of graph.edges) {
    const bucket = outgoing.get(edge.from) ?? [];
    bucket.push(edge);
    outgoing.set(edge.from, bucket);
  }
  for (const edges of outgoing.values()) edges.sort(edgeOrder);

  const state = snapshot.state;
  const result: InteractionRunResult = {
    state,
    variables: structuredClone(snapshot.variables),
    matchedTriggers: [],
    effects: [],
    trace: [],
    halted: false,
  };

  const triggers = graph.nodes
    .filter((node): node is InteractionTriggerNode => node.kind === "trigger")
    .filter((node) => matchesTrigger(node, event, result.state))
    .sort((a, b) => a.id.localeCompare(b.id));

  result.matchedTriggers = triggers.map((trigger) => trigger.id);
  const queue: Array<{ nodeId: string; branch: InteractionEdge["branch"] }> = [];
  for (const trigger of triggers) {
    result.trace.push({ nodeId: trigger.id, kind: "trigger", detail: describeEvent(event) });
    pushEdges(queue, outgoing.get(trigger.id), "always");
  }

  const visits = new Map<string, number>();
  let steps = 0;
  while (queue.length) {
    if (++steps > INTERACTION_MAX_STEPS) {
      result.halted = true;
      result.trace.push({ nodeId: "runtime", kind: "guard", detail: `Stopped after ${INTERACTION_MAX_STEPS} graph steps` });
      break;
    }
    const next = queue.shift();
    if (!next) break;
    const node = nodeById.get(next.nodeId);
    if (!node) continue;
    const count = (visits.get(node.id) ?? 0) + 1;
    visits.set(node.id, count);
    if (count > MAX_NODE_VISITS) {
      result.halted = true;
      result.trace.push({ nodeId: node.id, kind: "guard", detail: `Cycle guard stopped node after ${MAX_NODE_VISITS} visits` });
      break;
    }

    if (node.kind === "condition") {
      const passed = evaluateCondition(node, result, event, context);
      result.trace.push({ nodeId: node.id, kind: "condition", detail: passed ? "true" : "false" });
      pushEdges(queue, outgoing.get(node.id), passed ? "true" : "false");
      continue;
    }

    if (node.kind === "state") {
      result.state = node.state;
      result.trace.push({ nodeId: node.id, kind: "state", detail: `state=${node.state}` });
      pushEdges(queue, outgoing.get(node.id), "always");
      continue;
    }

    if (node.kind === "action") {
      if (node.action.type === "set-variable") result.variables[node.action.key] = node.action.value;
      if (node.action.type === "set-state") result.state = node.action.state;
      result.effects.push({ nodeId: node.id, action: node.action });
      result.trace.push({ nodeId: node.id, kind: "action", detail: describeAction(node.action) });
      pushEdges(queue, outgoing.get(node.id), "always");
      continue;
    }

    result.trace.push({ nodeId: node.id, kind: "trigger", detail: "Reached trigger node through an edge" });
    pushEdges(queue, outgoing.get(node.id), "always");
  }

  return result;
}

function matchesTrigger(node: InteractionTriggerNode, event: InteractionEvent, state: string) {
  if (node.event !== event.type) return false;
  if (node.states.length && !node.states.includes(state)) return false;
  if (node.target && node.target !== event.target) return false;
  if (node.sceneId && node.sceneId !== event.sceneId) return false;
  if (node.event === "custom" && node.name !== event.name) return false;
  if (node.event === "idle" && event.name && event.name !== node.id) return false;
  return true;
}

function evaluateCondition(
  node: InteractionConditionNode,
  snapshot: InteractionSnapshot,
  event: InteractionEvent,
  context: InteractionContext,
) {
  const actual = conditionValue(node, snapshot, event, context);
  switch (node.operator) {
    case "truthy": return Boolean(actual);
    case "falsy": return !actual;
    case "eq": return actual === node.value;
    case "neq": return actual !== node.value;
    case "gt": return typeof actual === "number" && typeof node.value === "number" && actual > node.value;
    case "gte": return typeof actual === "number" && typeof node.value === "number" && actual >= node.value;
    case "lt": return typeof actual === "number" && typeof node.value === "number" && actual < node.value;
    case "lte": return typeof actual === "number" && typeof node.value === "number" && actual <= node.value;
    case "includes": return typeof actual === "string" && typeof node.value === "string" && actual.includes(node.value);
  }
}

function conditionValue(
  node: InteractionConditionNode,
  snapshot: InteractionSnapshot,
  event: InteractionEvent,
  context: InteractionContext,
): InteractionPrimitive | undefined {
  if (node.source === "state") return snapshot.state;
  if (node.source === "quality") return context.quality;
  if (node.source === "reduced-motion") return context.reducedMotion;
  if (node.source === "variable") return node.key ? snapshot.variables[node.key] : undefined;
  if (!node.key) return undefined;
  if (node.key === "target") return event.target;
  if (node.key === "sceneId") return event.sceneId;
  if (node.key === "name") return event.name;
  if (node.key === "type") return event.type;
  return event.payload?.[node.key];
}

function pushEdges(
  queue: Array<{ nodeId: string; branch: InteractionEdge["branch"] }>,
  edges: InteractionEdge[] | undefined,
  branch: InteractionEdge["branch"],
) {
  if (!edges) return;
  for (const edge of edges) {
    if (edge.branch === "always" || edge.branch === branch) queue.push({ nodeId: edge.to, branch: edge.branch });
  }
}

function edgeOrder(a: InteractionEdge, b: InteractionEdge) {
  return b.priority - a.priority || a.id.localeCompare(b.id);
}

function describeEvent(event: InteractionEvent) {
  return [event.type, event.target, event.sceneId, event.name].filter(Boolean).join(" / ");
}

function describeAction(action: InteractionAction) {
  switch (action.type) {
    case "set-variable": return `${action.key}=${String(action.value)}`;
    case "set-state": return `state=${action.state}`;
    case "hotspot": return `${action.mode} hotspot${action.id ? ` ${action.id}` : ""}`;
    case "quality": return `quality=${action.value}`;
    case "motion": return `motion=${action.value}`;
    case "class": return `${action.mode} .${action.className} on ${action.target}`;
    case "seek": return `seek ${Math.round(action.progress * 100)}%`;
    case "emit": return `emit ${action.name}`;
    case "sequence": return `${action.command} sequence ${action.name}`;
    case "camera": return `${action.command} camera ${action.name}`;
    case "audio": return `${action.command} audio ${action.name}`;
    case "shader": return `shader ${action.target}.${action.parameter}`;
  }
}
