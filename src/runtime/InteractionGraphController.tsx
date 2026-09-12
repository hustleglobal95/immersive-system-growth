"use client";

import { useCallback, useEffect, useRef } from "react";
import { experience } from "@/src/lib/experience";
import { interactionGraph } from "@/src/lib/interactionGraphConfig";
import {
  expandInteractionEventForDevice,
  runInteractionEvent,
  type InteractionEvent,
  type InteractionRunResult,
} from "@/src/lib/interactionGraphEngine";
import type { InteractionPrimitive } from "@/src/lib/interactionGraph";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useInteractionStore } from "@/src/store/interactionStore";

interface ForgeInteractionDetail {
  name?: string;
  target?: string;
  payload?: Record<string, unknown>;
}

export function InteractionGraphController() {
  const activeScene = useExperienceStore((state) => state.activeScene);
  const selectedHotspot = useExperienceStore((state) => state.selectedHotspot);
  const previousScene = useRef<number | null>(null);
  const previousHotspot = useRef<string | null>(null);
  const idleTimers = useRef<number[]>([]);
  const pointerFrame = useRef<number | null>(null);

  const run = useCallback((event: InteractionEvent) => {
    const interactionState = useInteractionStore.getState();
    const experienceState = useExperienceStore.getState();
    const result = runInteractionEvent(
      interactionGraph,
      { state: interactionState.state, variables: interactionState.variables },
      event,
      { quality: experienceState.quality, reducedMotion: experienceState.reducedMotion },
    );
    interactionState.commit(event, result);
    applyEffects(result);
  }, []);

  const dispatch = useCallback((event: InteractionEvent) => {
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    for (const candidate of expandInteractionEventForDevice(interactionGraph, event, coarse)) run(candidate);
  }, [run]);

  const armIdle = useCallback(() => {
    for (const timer of idleTimers.current) window.clearTimeout(timer);
    idleTimers.current = [];
    for (const node of interactionGraph.nodes) {
      if (node.kind !== "trigger" || node.event !== "idle" || node.delayMs === undefined) continue;
      idleTimers.current.push(window.setTimeout(() => dispatch({ type: "idle", name: node.id }), node.delayMs));
    }
  }, [dispatch]);

  useEffect(() => {
    useInteractionStore.getState().reset(interactionGraph);
  }, []);

  useEffect(() => {
    const current = activeScene;
    const previous = previousScene.current;
    if (previous !== null && previous !== current) {
      dispatch({ type: "scene-exit", sceneId: experience.scenes[previous]?.id });
    }
    if (previous !== current) dispatch({ type: "scene-enter", sceneId: experience.scenes[current]?.id });
    previousScene.current = current;
  }, [activeScene, dispatch]);

  useEffect(() => {
    const previous = previousHotspot.current;
    if (previous && previous !== selectedHotspot) dispatch({ type: "hotspot-close", target: previous });
    if (selectedHotspot && previous !== selectedHotspot) dispatch({ type: "hotspot-open", target: selectedHotspot });
    previousHotspot.current = selectedHotspot;
  }, [dispatch, selectedHotspot]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const target = interactionTarget(event.target);
      if (target) dispatch({ type: "click", target });
    };
    const pointerOver = (event: PointerEvent) => {
      const element = interactionElement(event.target);
      if (!element || isInside(element, event.relatedTarget)) return;
      const target = element.dataset.forgeInteraction;
      if (target) dispatch({ type: "hover-enter", target });
    };
    const pointerOut = (event: PointerEvent) => {
      const element = interactionElement(event.target);
      if (!element || isInside(element, event.relatedTarget)) return;
      const target = element.dataset.forgeInteraction;
      if (target) dispatch({ type: "hover-leave", target });
    };
    const pointerMove = (event: PointerEvent) => {
      if (!interactionGraph.nodes.some((node) => node.kind === "trigger" && node.event === "pointer")) return;
      if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
      const target = interactionTarget(event.target);
      const x = window.innerWidth ? event.clientX / window.innerWidth * 2 - 1 : 0;
      const y = window.innerHeight ? -(event.clientY / window.innerHeight * 2 - 1) : 0;
      pointerFrame.current = requestAnimationFrame(() => dispatch({ type: "pointer", target, payload: { x, y } }));
    };
    const custom = (event: Event) => {
      const detail = (event as CustomEvent<ForgeInteractionDetail>).detail ?? {};
      if (!detail.name) return;
      dispatch({ type: "custom", name: detail.name, target: detail.target, payload: sanitizePayload(detail.payload) });
    };
    const activity = () => armIdle();

    document.addEventListener("click", click);
    document.addEventListener("pointerover", pointerOver);
    document.addEventListener("pointerout", pointerOut);
    document.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("forge:interaction", custom as EventListener);
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("scroll", activity, { passive: true });
    armIdle();

    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("pointerover", pointerOver);
      document.removeEventListener("pointerout", pointerOut);
      document.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("forge:interaction", custom as EventListener);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("scroll", activity);
      for (const timer of idleTimers.current) window.clearTimeout(timer);
      if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
    };
  }, [armIdle, dispatch]);

  return null;
}

function applyEffects(result: InteractionRunResult) {
  const runtime = useExperienceStore.getState();
  for (const effect of result.effects) {
    const action = effect.action;
    if (action.type === "set-variable" || action.type === "set-state") continue;
    if (action.type === "hotspot") {
      runtime.setSelectedHotspot(action.mode === "open" ? action.id ?? null : null);
      continue;
    }
    if (action.type === "quality") {
      runtime.setQuality(action.value);
      continue;
    }
    if (action.type === "motion") {
      runtime.setReducedMotion(action.value === "system" ? null : action.value === "reduced");
      continue;
    }
    if (action.type === "class") {
      for (const element of interactionElements(action.target)) {
        if (action.mode === "add") element.classList.add(action.className);
        else if (action.mode === "remove") element.classList.remove(action.className);
        else element.classList.toggle(action.className);
      }
      continue;
    }
    if (action.type === "seek") {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: max * action.progress, behavior: runtime.reducedMotion ? "auto" : action.behavior });
      continue;
    }
    if (action.type === "emit") {
      emit("forge:action", { name: action.name, payload: action.payload, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "sequence") {
      emit("forge:sequence", { name: action.name, command: action.command, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "camera") {
      emit("forge:camera", { name: action.name, command: action.command, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "audio") {
      emit("forge:audio", { name: action.name, command: action.command, volume: action.volume, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "shader") {
      emit("forge:shader", { target: action.target, parameter: action.parameter, value: action.value, nodeId: effect.nodeId });
    }
  }
}

function interactionElement(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>("[data-forge-interaction]") : null;
}

function interactionTarget(target: EventTarget | null) {
  return interactionElement(target)?.dataset.forgeInteraction;
}

function interactionElements(target: string) {
  return [...document.querySelectorAll<HTMLElement>("[data-forge-interaction]")]
    .filter((element) => element.dataset.forgeInteraction === target);
}

function isInside(element: Element, target: EventTarget | null) {
  return target instanceof Node && element.contains(target);
}

function emit(name: string, detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function sanitizePayload(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  const payload: Record<string, InteractionPrimitive> = {};
  for (const [key, item] of Object.entries(value).slice(0, 32)) {
    if (item === null || typeof item === "boolean" || typeof item === "number") payload[key] = item;
    else if (typeof item === "string") payload[key] = item.slice(0, 500);
  }
  return payload;
}
