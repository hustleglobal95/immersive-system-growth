import type { InteractionPrimitive } from "@/src/lib/interactionGraph";
import type { InteractionEvent } from "@/src/lib/interactionGraphEngine";
import {
  parseInteractionEventInput,
  parseInteractionUrlValueInput,
  sanitizeInteractionPayloadInput,
} from "@/src/lib/interactionEventSecurity";

export const FORGE_INTERACTION_EVENT="forge:interaction-event";
export const FORGE_SECURITY_TELEMETRY_EVENT="forge:security-telemetry";

export function dispatchForgeInteraction(event:InteractionEvent) {
  if(typeof window==="undefined") return false;
  const safe=parseRuntimeInteractionEvent(event);
  if(!safe) return false;
  window.dispatchEvent(new CustomEvent(FORGE_INTERACTION_EVENT,{detail:safe}));
  return true;
}

export function dispatchForgeLifecycle(
  type:Extract<InteractionEvent["type"],"sequence-complete"|"camera-complete"|"audio-complete"|"shader-complete"|"action-cancelled">,
  name:string,
  payload:Record<string,InteractionPrimitive>={},
) {
  return dispatchForgeInteraction({type,name,payload});
}

export function parseRuntimeInteractionEvent(value:unknown):InteractionEvent|null {
  const parsed=parseInteractionEventInput(value);
  if(parsed) return parsed;
  reportInteractionSecurityWarning("schema-rejection");
  return null;
}

export function sanitizeInteractionPayload(value:Record<string,unknown>|undefined) {
  const parsed=sanitizeInteractionPayloadInput(value);
  if(value && !parsed) reportInteractionSecurityWarning("payload-schema-rejection",Object.keys(value));
  return parsed;
}

export function parseInteractionUrlValue(value:unknown) {
  const parsed=parseInteractionUrlValueInput(value);
  if(parsed!==null) return parsed;
  reportInteractionSecurityWarning("url-value-rejection");
  return null;
}

export function reportInteractionSecurityWarning(reason:string,fields:string[]=[]){
  if(typeof window==="undefined") return;
  const detail={source:"interaction-graph",reason,fields:fields.slice(0,16)};
  console.warn("FORGE_SECURITY_INTERACTION",detail);
  window.dispatchEvent(new CustomEvent(FORGE_SECURITY_TELEMETRY_EVENT,{detail}));
}
