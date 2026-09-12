import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";

export const interactionGraph = parseInteractionGraph(rawInteractionGraph);
