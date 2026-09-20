import { z } from "zod";
import { interactionEventTypeSchema, type InteractionPrimitive } from "@/src/lib/interactionGraph";
import type { InteractionEvent } from "@/src/lib/interactionGraphEngine";

export const FORGE_INTERACTION_EVENT = "forge:interaction-event";
export const FORGE_SECURITY_TELEMETRY_EVENT = "forge:security-telemetry";

const tokenPattern=/^[a-zA-Z0-9_.:-]{1,160}$/;
const sceneIdPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const payloadKeyPattern=/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/;
const dangerousStringPattern=/<[^>]*>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on(?:error|load|click)\s*=/i;

const finite=z.number().finite().min(-1000000).max(1000000);
const safeString=z.string().max(500).refine((value)=>!dangerousStringPattern.test(value),"Unsafe string content");
const primitive=z.union([safeString,finite,z.boolean(),z.null()]);
const payloadSchema=z.record(z.string().regex(payloadKeyPattern),primitive).superRefine((payload,context)=>{
  if(Object.keys(payload).length>32) context.addIssue({code:"custom",message:"Interaction payloads are limited to 32 properties"});
});
const runtimeEventSchema=z.object({
  type:interactionEventTypeSchema,
  target:z.string().regex(tokenPattern).optional(),
  sceneId:z.string().regex(sceneIdPattern).optional(),
  name:z.string().regex(tokenPattern).optional(),
  payload:payloadSchema.optional(),
}).strict();

const pointerKeys=new Set(["x","y","worldX","worldY","worldZ","clientX","clientY","dx","dy","pressure","pointerType","cancelled"]);
const keyKeys=new Set(["key","code","repeat","altKey","ctrlKey","metaKey","shiftKey"]);
const wheelKeys=new Set(["deltaX","deltaY","deltaMode"]);
const orientationKeys=new Set(["alpha","beta","gamma","absolute"]);
const videoKeys=new Set(["time","duration","progress"]);
const lifecycleKeys=new Set(["completed","reason","kind"]);

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
  const sanitized=sanitizeUnknownEvent(value);
  if(!sanitized) {
    reportInteractionSecurityWarning("dangerous-string");
    return null;
  }
  const parsed=runtimeEventSchema.safeParse(sanitized);
  if(!parsed.success) {
    reportInteractionSecurityWarning("schema-rejection",parsed.error.issues.map((issue)=>issue.path.join(".")).slice(0,8));
    return null;
  }
  const payload=parsed.data.payload;
  if(payload && !payloadKeysAllowed(parsed.data.type,payload)) {
    reportInteractionSecurityWarning("payload-property-rejection",Object.keys(payload));
    return null;
  }
  return parsed.data;
}

export function sanitizeInteractionPayload(value:Record<string,unknown>|undefined) {
  if(!value) return undefined;
  const parsed=payloadSchema.safeParse(sanitizeRecord(value));
  if(!parsed.success) {
    reportInteractionSecurityWarning("payload-schema-rejection",parsed.error.issues.map((issue)=>issue.path.join(".")).slice(0,8));
    return undefined;
  }
  return parsed.data;
}

export function parseInteractionUrlValue(value:unknown) {
  if(typeof value!=="string") {
    reportInteractionSecurityWarning("url-value-rejection");
    return null;
  }
  const sanitized=sanitizeUntrustedString(value,300);
  if(sanitized===null || !/^[a-zA-Z0-9_.:/?#=&%+@~-]{0,300}$/.test(sanitized)) {
    reportInteractionSecurityWarning("url-value-rejection");
    return null;
  }
  return sanitized;
}

export function reportInteractionSecurityWarning(reason:string,fields:string[]=[]){
  if(typeof window==="undefined") return;
  const detail={source:"interaction-graph",reason,fields:fields.slice(0,16)};
  console.warn("FORGE_SECURITY_INTERACTION",detail);
  window.dispatchEvent(new CustomEvent(FORGE_SECURITY_TELEMETRY_EVENT,{detail}));
}

function payloadKeysAllowed(type:InteractionEvent["type"],payload:Record<string,InteractionPrimitive>) {
  const keys=Object.keys(payload);
  const allowed=
    type==="key"?keyKeys:
    type==="wheel"?wheelKeys:
    type==="orientation"?orientationKeys:
    type==="video-time"?videoKeys:
    ["sequence-complete","camera-complete","audio-complete","shader-complete","action-cancelled"].includes(type)?lifecycleKeys:
    ["pointer","click","hover-enter","hover-leave","drag-start","drag","drag-end"].includes(type)?pointerKeys:
    null;
  return allowed ? keys.every((key)=>allowed.has(key)) : true;
}

function sanitizeUnknownEvent(value:unknown):unknown|null {
  if(!value || typeof value!=="object" || Array.isArray(value)) return value;
  const source=value as Record<string,unknown>;
  const result:Record<string,unknown>={};
  for(const [key,item] of Object.entries(source)) {
    if(key==="payload" && item && typeof item==="object" && !Array.isArray(item)) {
      const payload=sanitizeRecord(item as Record<string,unknown>);
      if(payload===null) return null;
      result.payload=payload;
      continue;
    }
    if(typeof item==="string") {
      const clean=sanitizeUntrustedString(item,key==="sceneId"?160:500);
      if(clean===null) return null;
      result[key]=clean;
    } else {
      result[key]=item;
    }
  }
  return result;
}

function sanitizeRecord(value:Record<string,unknown>) {
  const output:Record<string,unknown>={};
  for(const [key,item] of Object.entries(value).slice(0,33)) {
    if(typeof item==="string") {
      const clean=sanitizeUntrustedString(item,500);
      if(clean===null) return null;
      output[key]=clean;
    } else {
      output[key]=item;
    }
  }
  return output;
}

function sanitizeUntrustedString(value:string,maximum:number) {
  const bounded=value.slice(0,maximum);
  const stripped=bounded
    .replace(/<[^>]*>/g,"")
    .replace(/(?:javascript|vbscript)\s*:/gi,"")
    .replace(/data\s*:\s*text\/html/gi,"");
  if(stripped!==bounded || dangerousStringPattern.test(bounded)) return null;
  return stripped;
}
