import { capabilitiesForContext, type ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";
import type { MotionArchetypeName } from "@/src/platform/motionArchetypes";

export interface IntentCandidate {
  capabilityId:string;
  label:string;
  score:number;
  reasons:string[];
}

export interface CompiledIntent {
  version:1;
  raw:string;
  normalized:string;
  selectionKey:string;
  status:"matched"|"ambiguous"|"unmatched";
  confidence:number;
  capabilityId?:string;
  candidates:IntentCandidate[];
  reason:string;
}

const semanticAliases:Record<string,string[]>={
  premium:["polish","cinematic","hierarchy"],
  expensive:["polish","cinematic","hierarchy"],
  luxurious:["polish","cinematic","hierarchy"],
  faster:["performance","optimize"],
  fast:["performance","optimize"],
  smooth:["motion","timing","coordinate"],
  mechanical:["motion","build","assemble"],
  slower:["motion","timing"],
  inspectable:["inspect","interaction","orbit"],
  interactive:["interaction","behavior"],
  responsive:["mobile"],
  phone:["mobile"],
  simplify:["polish","hierarchy"],
  dramatic:["cinematic","camera"],
};

export function compileIntent(context:SelectionContext,input:string):CompiledIntent {
  const normalized=normalize(input);
  if(!normalized) return {
    version:1,raw:input,normalized,selectionKey:context.selectionKey,status:"unmatched",confidence:0,candidates:[],reason:"No operator intent was supplied.",
  };

  const expanded=expandTokens(normalized);
  const rows=capabilitiesForContext(context).map((capability)=>scoreCapability(capability,normalized,expanded,context));
  const candidates=rows
    .filter((row)=>row.score>0)
    .sort((a,b)=>b.score-a.score || b.priority-a.priority || a.capability.id.localeCompare(b.capability.id))
    .slice(0,4)
    .map(({capability,score,reasons})=>({capabilityId:capability.id,label:capability.label,score,reasons}));

  if(!candidates.length) return {
    version:1,raw:input,normalized,selectionKey:context.selectionKey,status:"unmatched",confidence:0,candidates:[],
    reason:"No registered capability matched this intent for the current selection.",
  };

  const top=candidates[0];
  const second=candidates[1];
  const confidence=confidenceFor(top.score,second?.score ?? 0);
  const ambiguous=Boolean(second && top.score-second.score<=1 && confidence<.72);
  return {
    version:1,
    raw:input,
    normalized,
    selectionKey:context.selectionKey,
    status:ambiguous ? "ambiguous" : "matched",
    confidence,
    capabilityId:ambiguous ? undefined : top.capabilityId,
    candidates,
    reason:ambiguous
      ? `Two capabilities are similarly plausible: ${top.label} and ${second?.label ?? "another action"}.`
      : `${top.label} is the strongest registered capability for this selection and intent.`,
  };
}

export function motionArchetypeForIntent(context:SelectionContext,input:string):MotionArchetypeName {
  const value=normalize(input+" "+context.sceneLabel+" "+context.scene.camera.path);
  const has=(...terms:string[])=>terms.some((term)=>value.includes(term));

  if(has("architecture","architectural","building","tower","facade","structure","crane")) return "architectural-build";
  if(has("threshold","passage","portal","door","enter","arrival")) return "threshold-passage";
  if(has("parallax","depth","lateral","layered story","spatial story")) return "parallax-story";
  if(has("editorial","typography","type reveal","editorial reveal")) return "editorial-reveal";
  if(has("product","hero","macro","inspect","mechanical","assemble","assembly","watch","vehicle") || context.state.hasProductRig) return "product-hero";
  return "editorial-reveal";
}

export function compiledCapability(context:SelectionContext,compiled:CompiledIntent) {
  if(compiled.status!=="matched" || !compiled.capabilityId) return null;
  return capabilitiesForContext(context).find((capability)=>capability.id===compiled.capabilityId) ?? null;
}

function scoreCapability(
  capability:ResolvedCapability,
  normalized:string,
  expanded:Set<string>,
  context:SelectionContext,
) {
  let score=0;
  const reasons:string[]=[];
  const label=normalize(capability.label);
  if(normalized===label) {
    score+=12;
    reasons.push("exact label");
  } else if(normalized.includes(label)) {
    score+=7;
    reasons.push("label phrase");
  }

  for(const intent of capability.intents) {
    const phrase=normalize(intent);
    if(normalized.includes(phrase)) {
      score+=phrase.includes(" ") ? 6 : 4;
      reasons.push("intent:"+intent);
      continue;
    }
    const intentTokens=phrase.split(" ");
    const overlap=intentTokens.filter((token)=>expanded.has(token)).length;
    if(overlap) {
      score+=overlap*2;
      reasons.push("intent token:"+intent);
    }
  }

  if(context.issues.some((issue)=>issue.code==="static-scene") && capability.id==="scene.compose-motion") {
    score+=3;
    reasons.push("context:static scene");
  }
  if(context.state.manifestHealth<75 && capability.id==="asset.improve") {
    score+=4;
    reasons.push("context:asset pressure");
  }
  if(context.state.selectedNodeTrackCount===0 && capability.id==="node.build-reveal") {
    score+=3;
    reasons.push("context:unauthored node");
  }
  if(context.state.postPressure==="elevated" && capability.id==="environment.optimize") {
    score+=3;
    reasons.push("context:post pressure");
  }

  return {capability,score,reasons,priority:capability.priority};
}

function expandTokens(value:string) {
  const base=value.split(/[^a-z0-9]+/).filter(Boolean);
  const expanded=new Set(base);
  for(const token of base) for(const alias of semanticAliases[token] ?? []) expanded.add(alias);
  return expanded;
}

function confidenceFor(top:number,second:number) {
  const absolute=Math.min(1,top/12);
  const separation=top ? Math.min(1,Math.max(0,top-second)/Math.max(4,top)) : 0;
  return Number(Math.min(.99,.55*absolute+.45*separation).toFixed(2));
}

function normalize(value:string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}
