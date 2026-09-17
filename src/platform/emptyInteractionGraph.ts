import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";

/** Smallest valid interaction graph: one idle state, no triggers. Used for new and imported projects without a graph. */
export function emptyInteractionGraph(id: string): InteractionGraph {
  return parseInteractionGraph({
    version: 1,
    id: `${id}-interactions`,
    initialState: "idle",
    states: ["idle"],
    variables: {},
    nodes: [{ id: "state-idle", kind: "state", label: "Idle", position: { x: 40, y: 80 }, state: "idle" }],
    edges: [],
    mobileSubstitutions: [],
  });
}
