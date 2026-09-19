import type { InteractionGraph } from "@/src/lib/interactionGraph";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export interface ControlPlaneProjectState {
  experience:ExperienceConfig;
  assetManifest:AssetManifest;
  interactionGraph:InteractionGraph;
}

export function projectStateFingerprint(input:ControlPlaneProjectState) {
  const value=stableStringify({
    experience:input.experience,
    assetManifest:input.assetManifest,
    interactionGraph:input.interactionGraph,
  });
  return [
    hash32(value,0x811c9dc5),
    hash32(value,0x9e3779b1),
    hash32(value,0x85ebca6b),
    hash32(value,0xc2b2ae35),
  ].join("");
}

function stableStringify(value:unknown):string {
  if(value===null || typeof value!=="object") return JSON.stringify(value) ?? "undefined";
  if(Array.isArray(value)) return "["+value.map(stableStringify).join(",")+"]";
  const record=value as Record<string,unknown>;
  return "{"+Object.keys(record).sort().map((key)=>JSON.stringify(key)+":"+stableStringify(record[key])).join(",")+"}";
}

function hash32(value:string,seed:number) {
  let hash=seed>>>0;
  for(let index=0;index<value.length;index++) {
    hash^=value.charCodeAt(index);
    hash=Math.imul(hash,0x01000193)>>>0;
    hash^=hash>>>13;
  }
  return (hash>>>0).toString(16).padStart(8,"0");
}
