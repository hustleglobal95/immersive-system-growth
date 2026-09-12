import type { InteractionPrimitive } from "@/src/lib/interactionGraph";
import type { InteractionEvent } from "@/src/lib/interactionGraphEngine";

export const FORGE_INTERACTION_EVENT = "forge:interaction-event";

export function dispatchForgeInteraction(event: InteractionEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FORGE_INTERACTION_EVENT, { detail: event }));
}

export function dispatchForgeLifecycle(
  type: Extract<InteractionEvent["type"], "sequence-complete" | "camera-complete" | "audio-complete" | "shader-complete" | "action-cancelled">,
  name: string,
  payload: Record<string, InteractionPrimitive> = {},
) {
  dispatchForgeInteraction({ type, name, payload });
}

export function sanitizeInteractionPayload(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  const payload: Record<string, InteractionPrimitive> = {};
  for (const [key, item] of Object.entries(value).slice(0, 32)) {
    if (item === null || typeof item === "boolean") payload[key] = item;
    else if (typeof item === "number" && Number.isFinite(item)) payload[key] = item;
    else if (typeof item === "string") payload[key] = item.slice(0, 500);
  }
  return payload;
}
