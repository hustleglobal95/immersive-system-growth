"use client";

import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Object3D } from "three";
import { dispatchForgeInteraction } from "@/src/runtime/interactionEvents";

interface DragState {
  pointerId: number;
  target: string;
  x: number;
  y: number;
  distance: number;
}

export function useThreeInteraction(fallbackTarget: string) {
  const drag = useRef<DragState | null>(null);
  const hover = useRef<string | null>(null);

  const targetFor = (event: ThreeEvent<PointerEvent>) => resolveTarget(event.object, fallbackTarget);
  const payloadFor = (event: ThreeEvent<PointerEvent>, dx = 0, dy = 0) => ({
    x: event.pointer.x,
    y: event.pointer.y,
    worldX: event.point.x,
    worldY: event.point.y,
    worldZ: event.point.z,
    clientX: event.clientX,
    clientY: event.clientY,
    dx: clamp(dx, 1000),
    dy: clamp(dy, 1000),
    pressure: Number.isFinite(event.pressure) ? event.pressure : 0,
    pointerType: event.pointerType.slice(0, 32),
  });

  return {
    onPointerOver(event: ThreeEvent<PointerEvent>) {
      const target = targetFor(event);
      if (hover.current === target) return;
      hover.current = target;
      dispatchForgeInteraction({ type: "hover-enter", target, payload: payloadFor(event) });
    },
    onPointerOut(event: ThreeEvent<PointerEvent>) {
      const target = hover.current ?? targetFor(event);
      hover.current = null;
      dispatchForgeInteraction({ type: "hover-leave", target, payload: payloadFor(event) });
    },
    onPointerDown(event: ThreeEvent<PointerEvent>) {
      event.stopPropagation();
      const target = targetFor(event);
      drag.current = {
        pointerId: event.pointerId,
        target,
        x: event.clientX,
        y: event.clientY,
        distance: 0,
      };
      const capture = event.target as unknown as { setPointerCapture?: (pointerId: number) => void };
      capture.setPointerCapture?.(event.pointerId);
      dispatchForgeInteraction({ type: "drag-start", target, payload: payloadFor(event) });
    },
    onPointerMove(event: ThreeEvent<PointerEvent>) {
      const target = targetFor(event);
      dispatchForgeInteraction({ type: "pointer", target, payload: payloadFor(event) });
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      current.x = event.clientX;
      current.y = event.clientY;
      current.distance += Math.hypot(dx, dy);
      dispatchForgeInteraction({ type: "drag", target: current.target, payload: payloadFor(event, dx, dy) });
    },
    onPointerUp(event: ThreeEvent<PointerEvent>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      dispatchForgeInteraction({ type: "drag-end", target: current.target, payload: payloadFor(event) });
      if (current.distance < 6) dispatchForgeInteraction({ type: "click", target: current.target, payload: payloadFor(event) });
    },
    onPointerCancel(event: ThreeEvent<PointerEvent>) {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      drag.current = null;
      dispatchForgeInteraction({ type: "drag-end", target: current.target, payload: { ...payloadFor(event), cancelled: true } });
    },
  };
}

function resolveTarget(object: Object3D, fallback: string) {
  let current: Object3D | null = object;
  while (current) {
    const target = current.userData.forgeInteraction as unknown;
    if (typeof target === "string" && target) return target;
    current = current.parent;
  }
  return fallback;
}

function clamp(value: number, maximum: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-maximum, Math.min(maximum, value));
}
