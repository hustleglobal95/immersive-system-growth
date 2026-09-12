"use client";

import { useMemo, useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import {
  parseInteractionGraph,
  type InteractionAction,
  type InteractionGraph,
  type InteractionNode,
  type InteractionPrimitive,
  type InteractionTriggerNode,
} from "@/src/lib/interactionGraph";
import {
  createInteractionSnapshot,
  expandInteractionEventForDevice,
  runInteractionEvent,
  type InteractionEvent,
  type InteractionSnapshot,
  type InteractionTraceEntry,
} from "@/src/lib/interactionGraphEngine";
import styles from "./InteractionGraphEditor.module.css";

type NodeKind = InteractionNode["kind"];
type ActionType = InteractionAction["type"];
interface DragState { id: string; x: number; y: number; startX: number; startY: number }

const eventTypes = [
  "scene-enter", "scene-exit", "click", "hover-enter", "hover-leave", "pointer",
  "drag-start", "drag", "drag-end", "key", "wheel", "orientation", "video-time",
  "custom", "hotspot-open", "hotspot-close", "idle", "sequence-complete",
  "camera-complete", "audio-complete", "shader-complete", "action-cancelled",
] as const;
const actionTypes = [
  "set-variable", "set-state", "hotspot", "quality", "motion", "class", "seek",
  "emit", "sequence", "camera", "audio", "shader", "orbit", "navigate",
] as const;
const conditionSources = ["state", "variable", "event", "quality", "reduced-motion"] as const;
const conditionOperators = ["eq", "neq", "gt", "gte", "lt", "lte", "truthy", "falsy", "includes"] as const;
const namedTriggerEvents = new Set(["custom", "key", "sequence-complete", "camera-complete", "audio-complete", "shader-complete", "action-cancelled"]);
const targetTriggerEvents = new Set(["click", "hover-enter", "hover-leave", "pointer", "drag-start", "drag", "drag-end", "key", "wheel", "video-time", "hotspot-open", "hotspot-close"]);

export function InteractionGraphEditor({
  graph,
  setGraph,
}: {
  graph: InteractionGraph;
  setGraph: Dispatch<SetStateAction<InteractionGraph>>;
}) {
  const [selectedId, setSelectedId] = useState(graph.nodes[0]?.id ?? "");
  const [edgeFrom, setEdgeFrom] = useState(graph.nodes[0]?.id ?? "");
  const [edgeTo, setEdgeTo] = useState(graph.nodes[1]?.id ?? graph.nodes[0]?.id ?? "");
  const [edgeBranch, setEdgeBranch] = useState<"always" | "true" | "false">("always");
  const [newState, setNewState] = useState("");
  const [newVariable, setNewVariable] = useState("");
  const [coarse, setCoarse] = useState(false);
  const [simulation, setSimulation] = useState<InteractionSnapshot>(() => createInteractionSnapshot(graph));
  const [trace, setTrace] = useState<InteractionTraceEntry[]>([]);
  const [effects, setEffects] = useState<string[]>([]);
  const drag = useRef<DragState | null>(null);

  const selected = graph.nodes.find((node) => node.id === selectedId);
  const issues = useMemo(() => validateGraph(graph), [graph]);
  const canvasHeight = Math.max(620, ...graph.nodes.map((node) => node.position.y + 150));

  const updateNode = (id: string, update: (node: InteractionNode) => InteractionNode) => {
    setGraph((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? update(node) : node) }));
  };

  const addNode = (kind: NodeKind) => {
    const suffix = nextSuffix(graph, kind);
    const position = { x: 40 + (graph.nodes.length % 4) * 245, y: 80 + Math.floor(graph.nodes.length / 4) * 150 };
    const node = defaultNode(kind, `${kind}-${suffix}`, position, graph);
    setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedId(node.id);
    if (!edgeFrom) setEdgeFrom(node.id);
    if (!edgeTo) setEdgeTo(node.id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== selected.id),
      edges: current.edges.filter((edge) => edge.from !== selected.id && edge.to !== selected.id),
    }));
    const next = graph.nodes.find((node) => node.id !== selected.id)?.id ?? "";
    setSelectedId(next);
    setEdgeFrom((value) => value === selected.id ? next : value);
    setEdgeTo((value) => value === selected.id ? next : value);
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    if (graph.edges.some((edge) => edge.from === edgeFrom && edge.to === edgeTo && edge.branch === edgeBranch)) return;
    const id = uniqueId(`edge-${edgeFrom}-${edgeTo}`, new Set(graph.edges.map((edge) => edge.id)));
    setGraph((current) => ({ ...current, edges: [...current.edges, { id, from: edgeFrom, to: edgeTo, branch: edgeBranch, priority: 0 }] }));
  };

  const removeEdge = (id: string) => setGraph((current) => ({ ...current, edges: current.edges.filter((edge) => edge.id !== id) }));

  const pointerDown = (event: PointerEvent<HTMLButtonElement>, node: InteractionNode) => {
    setSelectedId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: node.id, x: node.position.x, y: node.position.y, startX: event.clientX, startY: event.clientY };
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    const x = Math.max(0, Math.round(current.x + event.clientX - current.startX));
    const y = Math.max(0, Math.round(current.y + event.clientY - current.startY));
    updateNode(current.id, (node) => ({ ...node, position: { x, y } }));
  };
  const pointerUp = () => { drag.current = null; };

  const addState = () => {
    const value = slug(newState);
    if (!value || graph.states.includes(value)) return;
    setGraph((current) => ({ ...current, states: [...current.states, value] }));
    setNewState("");
  };
  const addVariable = () => {
    const key = slug(newVariable);
    if (!key || Object.hasOwn(graph.variables, key)) return;
    setGraph((current) => ({ ...current, variables: { ...current.variables, [key]: false } }));
    setNewVariable("");
  };

  const runSelected = () => {
    if (!selected || selected.kind !== "trigger") return;
    let snapshot = simulation;
    const collectedTrace: InteractionTraceEntry[] = [];
    const collectedEffects: string[] = [];
    for (const event of expandInteractionEventForDevice(graph, eventForTrigger(selected), coarse)) {
      const result = runInteractionEvent(graph, snapshot, event, { quality: "high", reducedMotion: false });
      snapshot = { state: result.state, variables: result.variables };
      collectedTrace.push(...result.trace);
      collectedEffects.push(...result.effects.map((effect) => `${effect.nodeId}: ${effect.action.type}`));
    }
    setSimulation(snapshot);
    setTrace(collectedTrace);
    setEffects(collectedEffects);
  };

  const resetSimulation = () => {
    setSimulation(createInteractionSnapshot(graph));
    setTrace([]);
    setEffects([]);
  };

  return (
    <div className={styles.workspace}>
      <section className={`studio-card ${styles.graphCard}`} aria-labelledby="interaction-graph-title">
        <div className="studio-card__head">
          <div><span>EVENT ORCHESTRATION</span><h2 id="interaction-graph-title">Interaction graph</h2></div>
          <output>{graph.nodes.length} nodes / {graph.edges.length} edges</output>
        </div>
        <div className={styles.toolbar}>
          <button type="button" onClick={() => addNode("trigger")}>Add trigger</button>
          <button type="button" onClick={() => addNode("condition")}>Add condition</button>
          <button type="button" onClick={() => addNode("action")}>Add action</button>
          <button type="button" onClick={() => addNode("state")}>Add state</button>
          <button type="button" onClick={deleteSelected} disabled={!selected}>Delete selected</button>
        </div>
        <p className="studio-muted">Drag nodes to organize the graph. Runtime evaluation is deterministic, bounded by cycle guards, and independent of React render order.</p>
        <div className={styles.boardViewport}>
          <div className={styles.board} style={{ height: canvasHeight }} role="application" aria-label="Interaction node graph">
            <svg className={styles.edges} aria-hidden="true" width="1200" height={canvasHeight} viewBox={`0 0 1200 ${canvasHeight}`}>
              {graph.edges.map((edge) => {
                const from = graph.nodes.find((node) => node.id === edge.from);
                const to = graph.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.position.x + 190, y1 = from.position.y + 42, x2 = to.position.x, y2 = to.position.y + 42;
                const bend = Math.max(50, Math.abs(x2 - x1) * .45);
                return <path key={edge.id} data-branch={edge.branch} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} />;
              })}
            </svg>
            {graph.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={styles.node}
                data-kind={node.kind}
                data-selected={node.id === selectedId}
                style={{ left: node.position.x, top: node.position.y }}
                aria-label={`${node.label} ${node.kind}`}
                onPointerDown={(event) => pointerDown(event, node)}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
              >
                <small>{node.kind}</small>
                <strong>{node.label}</strong>
                <span>{nodeSummary(node)}</span>
              </button>
            ))}
          </div>
        </div>
        {issues.length > 0 && <div className={styles.issues} role="alert"><strong>Graph validation</strong>{issues.map((issue) => <p key={issue}>{issue}</p>)}</div>}
      </section>

      <aside className={`studio-card ${styles.inspector}`} aria-label="Interaction graph inspector">
        <div className="studio-card__head"><div><span>NODE INSPECTOR</span><h2>{selected?.label ?? "No node selected"}</h2></div><output>{selected?.id}</output></div>
        {selected ? <NodeInspector node={selected} graph={graph} update={(next) => updateNode(selected.id, () => next)} /> : <p className="studio-muted">Add or select a node to edit it.</p>}

        <hr />
        <h3>Connect nodes</h3>
        <label>From<select aria-label="Interaction edge source" value={edgeFrom} onChange={(event) => setEdgeFrom(event.target.value)}>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <label>To<select aria-label="Interaction edge destination" value={edgeTo} onChange={(event) => setEdgeTo(event.target.value)}>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <label>Branch<select aria-label="Interaction edge branch" value={edgeBranch} onChange={(event) => setEdgeBranch(event.target.value as typeof edgeBranch)}><option value="always">Always</option><option value="true">Condition true</option><option value="false">Condition false</option></select></label>
        <button type="button" onClick={addEdge} disabled={!edgeFrom || !edgeTo || edgeFrom === edgeTo}>Connect</button>
        <div className={styles.edgeList}>{graph.edges.map((edge) => <div key={edge.id}><span>{edge.from} → {edge.to} <em>{edge.branch}</em></span><button type="button" aria-label={`Delete edge ${edge.id}`} onClick={() => removeEdge(edge.id)}>×</button></div>)}</div>

        <hr />
        <h3>State registry</h3>
        <div className={styles.registry}>{graph.states.map((state) => <code key={state} data-active={simulation.state === state}>{state}</code>)}</div>
        <div className={styles.inline}><input aria-label="New interaction state" value={newState} onChange={(event) => setNewState(event.target.value)} placeholder="inspection" /><button type="button" onClick={addState}>Add</button></div>
        <h3>Variables</h3>
        <div className={styles.registry}>{Object.entries(graph.variables).map(([key, value]) => <code key={key}>{key}={String(value)}</code>)}</div>
        <div className={styles.inline}><input aria-label="New interaction variable" value={newVariable} onChange={(event) => setNewVariable(event.target.value)} placeholder="configured" /><button type="button" onClick={addVariable}>Add</button></div>
      </aside>

      <section className={`studio-card ${styles.debugger}`} aria-labelledby="interaction-debugger-title">
        <div className="studio-card__head"><div><span>DETERMINISTIC SIMULATOR</span><h2 id="interaction-debugger-title">Graph debugger</h2></div><output data-testid="interaction-sim-state">{simulation.state}</output></div>
        <div className={styles.debugControls}>
          <button type="button" className="studio-primary" onClick={runSelected} disabled={selected?.kind !== "trigger"}>Run selected trigger</button>
          <button type="button" onClick={resetSimulation}>Reset simulation</button>
          <label className="studio-check"><input type="checkbox" checked={coarse} onChange={(event) => setCoarse(event.target.checked)} />Coarse pointer / mobile</label>
        </div>
        <div className={styles.debugGrid}>
          <div><h3>Runtime snapshot</h3><pre>{JSON.stringify(simulation, null, 2)}</pre></div>
          <div><h3>Trace</h3>{trace.length ? <ol>{trace.map((entry, index) => <li key={`${entry.nodeId}-${index}`}><strong>{entry.nodeId}</strong><span>{entry.kind}: {entry.detail}</span></li>)}</ol> : <p className="studio-muted">Select a trigger node and run it. No production side effects are executed in the simulator.</p>}</div>
          <div><h3>Effects</h3>{effects.length ? <ul>{effects.map((effect, index) => <li key={`${effect}-${index}`}>{effect}</li>)}</ul> : <p className="studio-muted">No external effects emitted.</p>}</div>
        </div>
      </section>
    </div>
  );
}

function NodeInspector({ node, graph, update }: { node: InteractionNode; graph: InteractionGraph; update: (node: InteractionNode) => void }) {
  const common = <label>Label<input aria-label="Interaction node label" value={node.label} onChange={(event) => update({ ...node, label: event.target.value })} /></label>;
  if (node.kind === "trigger") return <>{common}<label>Event<select aria-label="Interaction trigger event" value={node.event} onChange={(event) => update(normalizeTrigger({ ...node, event: event.target.value as InteractionTriggerNode["event"] }))}>{eventTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{targetTriggerEvents.has(node.event) && <label>Target<input aria-label="Interaction trigger target" value={node.target ?? ""} onChange={(event) => update({ ...node, target: slugToken(event.target.value) || undefined })} /></label>}{["scene-enter", "scene-exit"].includes(node.event) && <label>Scene ID<input aria-label="Interaction trigger scene" value={node.sceneId ?? ""} onChange={(event) => update({ ...node, sceneId: slug(event.target.value) || undefined })} /></label>}{namedTriggerEvents.has(node.event) && <label>Event name<input aria-label="Interaction trigger name" value={node.name ?? ""} onChange={(event) => update({ ...node, name: slugToken(event.target.value) || undefined })} /></label>}{node.event === "idle" && <label>Idle delay ms<input aria-label="Interaction idle delay" type="number" min="250" max="120000" value={node.delayMs ?? 5000} onChange={(event) => update({ ...node, delayMs: Number(event.target.value) })} /></label>}<label>Allowed states<input aria-label="Interaction allowed states" value={node.states.join(", ")} onChange={(event) => update({ ...node, states: event.target.value.split(",").map(slug).filter((value) => graph.states.includes(value)) })} /></label></>;
  if (node.kind === "condition") return <>{common}<label>Source<select aria-label="Interaction condition source" value={node.source} onChange={(event) => update({ ...node, source: event.target.value as typeof node.source })}>{conditionSources.map((item) => <option key={item}>{item}</option>)}</select></label>{["variable", "event"].includes(node.source) && <label>Key<input aria-label="Interaction condition key" value={node.key ?? ""} onChange={(event) => update({ ...node, key: slugToken(event.target.value) || undefined })} /></label>}<label>Operator<select aria-label="Interaction condition operator" value={node.operator} onChange={(event) => update({ ...node, operator: event.target.value as typeof node.operator })}>{conditionOperators.map((item) => <option key={item}>{item}</option>)}</select></label>{!["truthy", "falsy"].includes(node.operator) && <label>Compare value<input aria-label="Interaction condition value" value={String(node.value ?? "")} onChange={(event) => update({ ...node, value: parsePrimitive(event.target.value) })} /></label>}</>;
  if (node.kind === "state") return <>{common}<label>State<select aria-label="Interaction state node" value={node.state} onChange={(event) => update({ ...node, state: event.target.value })}>{graph.states.map((state) => <option key={state}>{state}</option>)}</select></label></>;
  return <>{common}<ActionEditor node={node} graph={graph} update={update} /></>;
}

function ActionEditor({ node, graph, update }: { node: Extract<InteractionNode, { kind: "action" }>; graph: InteractionGraph; update: (node: InteractionNode) => void }) {
  const action = node.action;
  const setAction = (next: InteractionAction) => update({ ...node, action: next });
  return <>
    <label>Action<select aria-label="Interaction action type" value={action.type} onChange={(event) => setAction(defaultAction(event.target.value as ActionType, graph))}>{actionTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    {action.type === "set-variable" && <><label>Variable<select aria-label="Interaction action variable" value={action.key} onChange={(event) => setAction({ ...action, key: event.target.value })}>{Object.keys(graph.variables).map((key) => <option key={key}>{key}</option>)}</select></label><label>Value<input aria-label="Interaction action value" value={String(action.value ?? "")} onChange={(event) => setAction({ ...action, value: parsePrimitive(event.target.value) })} /></label></>}
    {action.type === "set-state" && <label>State<select aria-label="Interaction action state" value={action.state} onChange={(event) => setAction({ ...action, state: event.target.value })}>{graph.states.map((state) => <option key={state}>{state}</option>)}</select></label>}
    {action.type === "hotspot" && <><label>Mode<select aria-label="Hotspot action mode" value={action.mode} onChange={(event) => setAction({ ...action, mode: event.target.value as typeof action.mode })}><option>open</option><option>close</option></select></label><label>Hotspot ID<input aria-label="Hotspot action id" value={action.id ?? ""} onChange={(event) => setAction({ ...action, id: slugToken(event.target.value) || undefined })} /></label></>}
    {action.type === "quality" && <label>Quality<select aria-label="Interaction quality value" value={action.value} onChange={(event) => setAction({ ...action, value: event.target.value as typeof action.value })}><option>auto</option><option>low</option><option>medium</option><option>high</option></select></label>}
    {action.type === "motion" && <label>Motion policy<select aria-label="Interaction motion value" value={action.value} onChange={(event) => setAction({ ...action, value: event.target.value as typeof action.value })}><option>system</option><option>reduced</option><option>full</option></select></label>}
    {action.type === "class" && <><label>Interaction target<input aria-label="Class action target" value={action.target} onChange={(event) => setAction({ ...action, target: slugToken(event.target.value) })} /></label><label>Class name<input aria-label="Class action class" value={action.className} onChange={(event) => setAction({ ...action, className: event.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })} /></label><label>Mode<select aria-label="Class action mode" value={action.mode} onChange={(event) => setAction({ ...action, mode: event.target.value as typeof action.mode })}><option>add</option><option>remove</option><option>toggle</option></select></label></>}
    {action.type === "seek" && <><label>Progress<input aria-label="Seek action progress" type="number" min="0" max="1" step="0.01" value={action.progress} onChange={(event) => setAction({ ...action, progress: Math.max(0, Math.min(1, Number(event.target.value))) })} /></label><label>Behavior<select aria-label="Seek action behavior" value={action.behavior} onChange={(event) => setAction({ ...action, behavior: event.target.value as typeof action.behavior })}><option>smooth</option><option>auto</option></select></label></>}
    {action.type === "emit" && <label>Event name<input aria-label="Emit action name" value={action.name} onChange={(event) => setAction({ ...action, name: slugToken(event.target.value) })} /></label>}
    {action.type === "sequence" && <><NamedCommand action={action} label="Sequence" update={setAction} /><OptionalNumber label="Sequence duration ms" value={action.durationMs} minimum={0} maximum={120000} update={(value) => setAction({ ...action, durationMs: value })} /><label className="studio-check"><input aria-label="Sequence loop" type="checkbox" checked={action.loop} onChange={(event) => setAction({ ...action, loop: event.target.checked })} />Loop</label><label className="studio-check"><input aria-label="Sequence release" type="checkbox" checked={action.release} onChange={(event) => setAction({ ...action, release: event.target.checked })} />Release to scroll at completion</label></>}
    {action.type === "camera" && <><NamedCommand action={action} label="Camera shot" update={setAction} /><OptionalNumber label="Camera duration ms" value={action.durationMs} minimum={0} maximum={120000} update={(value) => setAction({ ...action, durationMs: value })} /><label className="studio-check"><input aria-label="Camera release" type="checkbox" checked={action.release} onChange={(event) => setAction({ ...action, release: event.target.checked })} />Release to scroll camera</label></>}
    {action.type === "audio" && <><NamedCommand action={action} label="Audio cue" update={setAction} /><label>Source<input aria-label="Audio action source" value={action.src ?? ""} placeholder="/audio/ambient.mp3" onChange={(event) => setAction({ ...action, src: event.target.value || undefined })} /></label><label>Volume<input aria-label="Audio action volume" type="number" min="0" max="1" step="0.05" value={action.volume ?? 1} onChange={(event) => setAction({ ...action, volume: Math.max(0, Math.min(1, Number(event.target.value))) })} /></label><OptionalNumber label="Audio fade ms" value={action.fadeMs} minimum={0} maximum={10000} update={(value) => setAction({ ...action, fadeMs: value })} /><label className="studio-check"><input aria-label="Audio loop" type="checkbox" checked={action.loop ?? false} onChange={(event) => setAction({ ...action, loop: event.target.checked })} />Loop</label></>}
    {action.type === "shader" && <><label>Target<input aria-label="Shader action target" value={action.target} placeholder="hero / rig:Door / asset:car" onChange={(event) => setAction({ ...action, target: slugToken(event.target.value) })} /></label><label>Parameter<input aria-label="Shader action parameter" value={action.parameter} placeholder="roughness / color / uniform:progress" onChange={(event) => setAction({ ...action, parameter: slugToken(event.target.value) })} /></label><label>Value<input aria-label="Shader action value" value={String(action.value)} onChange={(event) => setAction({ ...action, value: parsePrimitive(event.target.value) as number | string | boolean })} /></label><OptionalNumber label="Shader duration ms" value={action.durationMs} minimum={0} maximum={30000} update={(value) => setAction({ ...action, durationMs: value })} /><label>Easing<select aria-label="Shader action easing" value={action.easing} onChange={(event) => setAction({ ...action, easing: event.target.value as typeof action.easing })}><option>linear</option><option>smooth</option><option>ease-in</option><option>ease-out</option><option>ease-in-out</option></select></label></>}
    {action.type === "orbit" && <><label>3D target<input aria-label="Orbit action target" value={action.target} placeholder="hero / rig:Door / asset:car" onChange={(event) => setAction({ ...action, target: slugToken(event.target.value) })} /></label><label>Command<select aria-label="Orbit action command" value={action.command} onChange={(event) => setAction({ ...action, command: event.target.value as typeof action.command })}><option>enable</option><option>disable</option><option>reset</option></select></label><OptionalNumber label="Orbit sensitivity" value={action.sensitivity} minimum={0.0005} maximum={0.05} step={0.0005} update={(value) => setAction({ ...action, sensitivity: value })} /></>}
    {action.type === "navigate" && <><label>Destination<input aria-label="Navigate action href" value={action.href} onChange={(event) => setAction({ ...action, href: event.target.value })} /></label><label className="studio-check"><input aria-label="Navigate replace history" type="checkbox" checked={action.replace} onChange={(event) => setAction({ ...action, replace: event.target.checked })} />Replace browser history</label></>}
  </>;
}

function NamedCommand({ action, label, update }: { action: Extract<InteractionAction, { type: "sequence" | "camera" | "audio" }>; label: string; update: (action: InteractionAction) => void }) {
  const commands = action.type === "camera" ? ["play", "reset"] : ["play", "pause", "stop"];
  return <><label>{label}<input aria-label={`${label} action name`} value={action.name} onChange={(event) => update({ ...action, name: slugToken(event.target.value) } as InteractionAction)} /></label><label>Command<select aria-label={`${label} action command`} value={action.command} onChange={(event) => update({ ...action, command: event.target.value } as InteractionAction)}>{commands.map((command) => <option key={command}>{command}</option>)}</select></label></>;
}

function OptionalNumber({ label, value, minimum, maximum, step = 1, update }: { label: string; value: number | undefined; minimum: number; maximum: number; step?: number; update: (value: number | undefined) => void }) {
  return <label>{label}<input aria-label={label} type="number" min={minimum} max={maximum} step={step} value={value ?? ""} placeholder="default" onChange={(event) => update(event.target.value === "" ? undefined : Math.max(minimum, Math.min(maximum, Number(event.target.value))))} /></label>;
}

function defaultNode(kind: NodeKind, id: string, position: { x: number; y: number }, graph: InteractionGraph): InteractionNode {
  if (kind === "trigger") return { id, kind, label: "New trigger", position, event: "click", target: "feature", states: [] };
  if (kind === "condition") return { id, kind, label: "New condition", position, source: "state", operator: "eq", value: graph.initialState };
  if (kind === "state") return { id, kind, label: "State transition", position, state: graph.initialState };
  return { id, kind, label: "New action", position, action: defaultAction("emit", graph) };
}

function defaultAction(type: ActionType, graph: InteractionGraph): InteractionAction {
  if (type === "set-variable") return { type, key: Object.keys(graph.variables)[0] ?? "flag", value: false };
  if (type === "set-state") return { type, state: graph.initialState };
  if (type === "hotspot") return { type, mode: "open", id: "detail" };
  if (type === "quality") return { type, value: "auto" };
  if (type === "motion") return { type, value: "system" };
  if (type === "class") return { type, target: "feature", className: "is-active", mode: "add" };
  if (type === "seek") return { type, progress: .5, behavior: "smooth" };
  if (type === "emit") return { type, name: "interaction", payload: {} };
  if (type === "sequence") return { type, name: "arrival", command: "play", loop: false, release: false };
  if (type === "camera") return { type, name: "detail-approach", command: "play", release: false };
  if (type === "audio") return { type, name: "ambient", command: "play", volume: 1 };
  if (type === "shader") return { type, target: "hero", parameter: "roughness", value: .2, easing: "smooth" };
  if (type === "orbit") return { type, target: "hero", command: "enable", sensitivity: .006 };
  return { type: "navigate", href: "/", replace: false };
}

function normalizeTrigger(node: InteractionTriggerNode): InteractionTriggerNode {
  const base = { ...node, target: undefined, sceneId: undefined, name: undefined, delayMs: undefined };
  if (["click", "hover-enter", "hover-leave", "drag-start", "drag", "drag-end"].includes(node.event)) return { ...base, target: node.target ?? "feature" };
  if (["scene-enter", "scene-exit"].includes(node.event)) return { ...base, sceneId: node.sceneId ?? "arrival" };
  if (["custom", "sequence-complete", "camera-complete", "audio-complete", "shader-complete", "action-cancelled"].includes(node.event)) return { ...base, name: node.name ?? "interaction" };
  if (node.event === "key") return { ...base, target: node.target, name: node.name };
  if (["pointer", "wheel", "video-time", "hotspot-open", "hotspot-close"].includes(node.event)) return { ...base, target: node.target };
  if (node.event === "idle") return { ...base, delayMs: node.delayMs ?? 5000 };
  return base;
}

function eventForTrigger(node: InteractionTriggerNode): InteractionEvent {
  const payload: Record<string, InteractionPrimitive> = {};
  if (["drag-start", "drag", "drag-end"].includes(node.event)) Object.assign(payload, { dx: 12, dy: -4, x: .25, y: .1 });
  if (node.event === "key") Object.assign(payload, { key: "Enter", code: node.name ?? "Enter", repeat: false });
  if (node.event === "wheel") Object.assign(payload, { deltaX: 0, deltaY: 120, deltaMode: 0 });
  if (node.event === "orientation") Object.assign(payload, { alpha: 0, beta: 12, gamma: 4, absolute: false });
  if (node.event === "video-time") Object.assign(payload, { time: 2, duration: 10, progress: .2 });
  return { type: node.event, target: node.target, sceneId: node.sceneId, name: node.event === "idle" ? node.id : node.name, payload };
}

function nodeSummary(node: InteractionNode) {
  if (node.kind === "trigger") return [node.event, node.target, node.sceneId, node.name].filter(Boolean).join(" / ");
  if (node.kind === "condition") return `${node.source}${node.key ? `.${node.key}` : ""} ${node.operator} ${node.value ?? ""}`;
  if (node.kind === "state") return node.state;
  if (node.action.type === "sequence" || node.action.type === "camera" || node.action.type === "audio") return `${node.action.type} / ${node.action.name} / ${node.action.command}`;
  if (node.action.type === "shader") return `shader / ${node.action.target}.${node.action.parameter}`;
  if (node.action.type === "orbit") return `orbit / ${node.action.target} / ${node.action.command}`;
  if (node.action.type === "navigate") return `navigate / ${node.action.href}`;
  return node.action.type;
}

function validateGraph(graph: InteractionGraph) {
  try { parseInteractionGraph(graph); return [] as string[]; }
  catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return ((error as { issues?: Array<{ path?: PropertyKey[]; message?: string }> }).issues ?? []).map((issue) => `${issue.path?.join(".") || "graph"}: ${issue.message || "Invalid graph"}`);
    }
    return [error instanceof Error ? error.message : "Invalid graph"];
  }
}

function parsePrimitive(value: string): InteractionPrimitive {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed !== "" && Number.isFinite(Number(trimmed))) return Number(trimmed);
  return value;
}

function nextSuffix(graph: InteractionGraph, prefix: string) {
  const used = new Set(graph.nodes.map((node) => node.id));
  let index = graph.nodes.length + 1;
  while (used.has(`${prefix}-${index}`)) index++;
  return String(index);
}

function uniqueId(base: string, used: Set<string>) {
  const clean = slug(base) || "edge";
  if (!used.has(clean)) return clean;
  let index = 2;
  while (used.has(`${clean}-${index}`)) index++;
  return `${clean}-${index}`;
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function slugToken(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_.:-]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}
