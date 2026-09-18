"use client";

import { useCallback, useEffect, useRef } from "react";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { interactionGraph } from "@/src/lib/interactionGraphConfig";
import { interactionEventTypeSchema } from "@/src/lib/interactionGraph";
import {
  expandInteractionEventForDevice,
  runInteractionEvent,
  type InteractionEvent,
  type InteractionRunResult,
} from "@/src/lib/interactionGraphEngine";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useInteractionStore } from "@/src/store/interactionStore";
import {
  FORGE_INTERACTION_EVENT,
  sanitizeInteractionPayload,
} from "@/src/runtime/interactionEvents";

interface ForgeInteractionDetail {
  name?: string;
  target?: string;
  payload?: Record<string, unknown>;
}
interface DragPointerState {
  pointerId: number;
  target: string;
  x: number;
  y: number;
}

export function InteractionGraphController() {
  const experience = useExperienceConfig();
  const activeScene = useExperienceStore((state) => state.activeScene);
  const selectedHotspot = useExperienceStore((state) => state.selectedHotspot);
  const previousScene = useRef<number | null>(null);
  const previousHotspot = useRef<string | null>(null);
  const idleTimers = useRef<number[]>([]);
  const pointerFrame = useRef<number | null>(null);
  const wheelFrame = useRef<number | null>(null);
  const orientationFrame = useRef<number | null>(null);
  const dragPointer = useRef<DragPointerState | null>(null);

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
    for (const candidate of expandInteractionEventForDevice(interactionGraph, event, coarse)) {
      if (candidate.type === "drag") {
        const dx = numericPayload(candidate, "dx");
        const dy = numericPayload(candidate, "dy");
        if (dx !== undefined && dy !== undefined) useExperienceStore.getState().adjustOrbit(candidate.target, dx, dy);
      }
      run(candidate);
    }
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
    const hasTrigger = (type: InteractionEvent["type"]) => interactionGraph.nodes.some((node) => node.kind === "trigger" && node.event === type);
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
    const pointerDown = (event: PointerEvent) => {
      armIdle();
      const target = interactionTarget(event.target);
      if (!target) return;
      dragPointer.current = { pointerId: event.pointerId, target, x: event.clientX, y: event.clientY };
      if (hasTrigger("drag-start")) dispatch({ type: "drag-start", target, payload: pointerPayload(event, 0, 0) });
    };
    const pointerMove = (event: PointerEvent) => {
      if (hasTrigger("pointer")) {
        if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
        const target = interactionTarget(event.target);
        const x = window.innerWidth ? event.clientX / window.innerWidth * 2 - 1 : 0;
        const y = window.innerHeight ? -(event.clientY / window.innerHeight * 2 - 1) : 0;
        pointerFrame.current = requestAnimationFrame(() => dispatch({ type: "pointer", target, payload: { x, y } }));
      }
      const dragging = dragPointer.current;
      if (!dragging || dragging.pointerId !== event.pointerId) return;
      const dx = event.clientX - dragging.x;
      const dy = event.clientY - dragging.y;
      dragging.x = event.clientX;
      dragging.y = event.clientY;
      dispatch({ type: "drag", target: dragging.target, payload: pointerPayload(event, dx, dy) });
    };
    const pointerUp = (event: PointerEvent) => {
      const dragging = dragPointer.current;
      if (!dragging || dragging.pointerId !== event.pointerId) return;
      dragPointer.current = null;
      if (hasTrigger("drag-end")) dispatch({ type: "drag-end", target: dragging.target, payload: pointerPayload(event, 0, 0) });
    };
    const custom = (event: Event) => {
      const detail = (event as CustomEvent<ForgeInteractionDetail>).detail ?? {};
      if (!detail.name) return;
      dispatch({ type: "custom", name: detail.name, target: detail.target, payload: sanitizeInteractionPayload(detail.payload) });
    };
    const typed = (event: Event) => {
      const detail = (event as CustomEvent<InteractionEvent>).detail;
      if (!detail || !interactionEventTypeSchema.safeParse(detail.type).success) return;
      dispatch({
        type: detail.type,
        target: cleanToken(detail.target),
        sceneId: cleanSceneId(detail.sceneId),
        name: cleanToken(detail.name),
        payload: sanitizeInteractionPayload(detail.payload),
      });
    };
    const key = (event: KeyboardEvent) => {
      armIdle();
      if (!hasTrigger("key")) return;
      dispatch({
        type: "key",
        target: interactionTarget(event.target),
        name: cleanToken(event.code),
        payload: {
          key: event.key.slice(0, 80),
          code: event.code.slice(0, 80),
          repeat: event.repeat,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        },
      });
    };
    const wheel = (event: WheelEvent) => {
      armIdle();
      if (!hasTrigger("wheel")) return;
      if (wheelFrame.current !== null) cancelAnimationFrame(wheelFrame.current);
      const target = interactionTarget(event.target);
      wheelFrame.current = requestAnimationFrame(() => dispatch({
        type: "wheel",
        target,
        payload: {
          deltaX: bounded(event.deltaX, 4000),
          deltaY: bounded(event.deltaY, 4000),
          deltaMode: event.deltaMode,
        },
      }));
    };
    const orientation = (event: DeviceOrientationEvent) => {
      if (!hasTrigger("orientation")) return;
      if (orientationFrame.current !== null) cancelAnimationFrame(orientationFrame.current);
      orientationFrame.current = requestAnimationFrame(() => dispatch({
        type: "orientation",
        payload: {
          alpha: finiteOrNull(event.alpha),
          beta: finiteOrNull(event.beta),
          gamma: finiteOrNull(event.gamma),
          absolute: event.absolute,
        },
      }));
    };
    const scroll = () => armIdle();

    document.addEventListener("click", click);
    document.addEventListener("pointerover", pointerOver);
    document.addEventListener("pointerout", pointerOut);
    document.addEventListener("pointerdown", pointerDown, { passive: true });
    document.addEventListener("pointermove", pointerMove, { passive: true });
    document.addEventListener("pointerup", pointerUp, { passive: true });
    document.addEventListener("pointercancel", pointerUp, { passive: true });
    window.addEventListener("forge:interaction", custom as EventListener);
    window.addEventListener(FORGE_INTERACTION_EVENT, typed as EventListener);
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("deviceorientation", orientation);
    window.addEventListener("scroll", scroll, { passive: true });
    armIdle();

    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("pointerover", pointerOver);
      document.removeEventListener("pointerout", pointerOut);
      document.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerup", pointerUp);
      document.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("forge:interaction", custom as EventListener);
      window.removeEventListener(FORGE_INTERACTION_EVENT, typed as EventListener);
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("deviceorientation", orientation);
      window.removeEventListener("scroll", scroll);
      for (const timer of idleTimers.current) window.clearTimeout(timer);
      if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
      if (wheelFrame.current !== null) cancelAnimationFrame(wheelFrame.current);
      if (orientationFrame.current !== null) cancelAnimationFrame(orientationFrame.current);
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
      runtime.setRuntimeProgress(null);
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: max * action.progress, behavior: runtime.reducedMotion ? "auto" : action.behavior });
      continue;
    }
    if (action.type === "emit") {
      emit("forge:action", { name: action.name, payload: action.payload, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "sequence") {
      emit("forge:sequence", { ...action, type: undefined, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "camera") {
      emit("forge:camera", { ...action, type: undefined, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "audio") {
      emit("forge:audio", { ...action, type: undefined, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "shader") {
      emit("forge:shader", { ...action, type: undefined, nodeId: effect.nodeId });
      continue;
    }
    if (action.type === "orbit") {
      if (action.command === "enable") runtime.setOrbitControl(action.target, action.sensitivity);
      else if (action.command === "disable") {
        if (runtime.orbit.target === action.target) runtime.setOrbitControl(null);
      } else runtime.resetOrbit(action.target);
      continue;
    }
    if (action.type === "navigate") {
      const navigation = new CustomEvent("forge:navigate", { detail: action, cancelable: true });
      if (!window.dispatchEvent(navigation)) continue;
      if (action.replace) window.location.replace(action.href);
      else window.location.assign(action.href);
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

function numericPayload(event: InteractionEvent, key: string) {
  const value = event.payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pointerPayload(event: PointerEvent, dx: number, dy: number) {
  return {
    x: window.innerWidth ? event.clientX / window.innerWidth * 2 - 1 : 0,
    y: window.innerHeight ? -(event.clientY / window.innerHeight * 2 - 1) : 0,
    clientX: event.clientX,
    clientY: event.clientY,
    dx: bounded(dx, 1000),
    dy: bounded(dy, 1000),
    pressure: Number.isFinite(event.pressure) ? event.pressure : 0,
    pointerType: event.pointerType.slice(0, 32),
  };
}

function bounded(value: number, maximum: number) {
  return Math.max(-maximum, Math.min(maximum, Number.isFinite(value) ? value : 0));
}

function finiteOrNull(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanToken(value: string | undefined) {
  if (!value) return undefined;
  const clean = value.replace(/[^a-zA-Z0-9_.:-]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
  return clean || undefined;
}

function cleanSceneId(value: string | undefined) {
  if (!value) return undefined;
  const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return clean || undefined;
}
