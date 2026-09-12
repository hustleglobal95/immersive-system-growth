"use client";

import { create } from "zustand";
import type { InteractionGraph, InteractionPrimitive } from "@/src/lib/interactionGraph";
import type { InteractionEvent, InteractionRunResult, InteractionTraceEntry } from "@/src/lib/interactionGraphEngine";

interface InteractionStoreState {
  state: string;
  variables: Record<string, InteractionPrimitive>;
  lastEvent: InteractionEvent | null;
  matchedTriggers: string[];
  trace: InteractionTraceEntry[];
  halted: boolean;
  revision: number;
  reset: (graph: InteractionGraph) => void;
  commit: (event: InteractionEvent, result: InteractionRunResult) => void;
}

export const useInteractionStore = create<InteractionStoreState>((set) => ({
  state: "idle",
  variables: {},
  lastEvent: null,
  matchedTriggers: [],
  trace: [],
  halted: false,
  revision: 0,
  reset: (graph) => set((current) => ({
    state: graph.initialState,
    variables: structuredClone(graph.variables),
    lastEvent: null,
    matchedTriggers: [],
    trace: [],
    halted: false,
    revision: current.revision + 1,
  })),
  commit: (event, result) => set((current) => ({
    state: result.state,
    variables: result.variables,
    lastEvent: event,
    matchedTriggers: result.matchedTriggers,
    trace: result.trace.slice(-48),
    halted: result.halted,
    revision: current.revision + 1,
  })),
}));
