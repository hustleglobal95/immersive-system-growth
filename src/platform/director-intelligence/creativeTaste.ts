import type { TasteDimension, TasteProfile } from "@/src/platform/director-intelligence/types";
import { createTasteProfile } from "@/src/platform/director-intelligence/taste";

export interface CreativeTasteLayers {
  studio?:TasteProfile;
  operator?:TasteProfile;
  project?:TasteProfile;
}

export interface ResolvedCreativeTaste {
  profile:TasteProfile;
  contributions:Array<{layer:"studio"|"operator"|"project";weight:number;confidence:number}>;
  rule:string;
}

const weights={studio:.58,operator:.22,project:.20} as const;

export function resolveCreativeTaste(layers?:CreativeTasteLayers,fallback?:TasteProfile):ResolvedCreativeTaste {
  if(!layers && fallback) return {profile:fallback,contributions:[{layer:"studio",weight:1,confidence:fallback.confidence}],rule:"Legacy taste profile treated as a single studio-level influence."};
  const base=createTasteProfile();
  if(!layers) return {profile:base,contributions:[],rule:"No learned taste supplied; Director stays brief/evidence led."};
  const entries=(Object.keys(weights) as Array<keyof typeof weights>)
    .map((layer)=>({layer,profile:layers[layer],weight:weights[layer]}))
    .filter((item):item is {layer:keyof typeof weights;profile:TasteProfile;weight:number}=>Boolean(item.profile));
  if(!entries.length) return {profile:base,contributions:[],rule:"No learned taste supplied; Director stays brief/evidence led."};

  const dimensions={} as Record<TasteDimension,number>;
  for(const dimension of Object.keys(base.dimensions) as TasteDimension[]) {
    let numerator=0,denominator=0;
    for(const entry of entries) {
      const effective=entry.weight*Math.max(.15,entry.profile.confidence);
      numerator+=entry.profile.dimensions[dimension]*effective;
      denominator+=effective;
    }
    dimensions[dimension]=Number((denominator ? numerator/denominator : 0).toFixed(3));
  }
  const preferences=entries.flatMap((entry)=>entry.profile.preferences.map((preference)=>({...preference,id:`${entry.layer}-${preference.id}`}))).slice(-120);
  const confidence=Number(Math.min(.95,entries.reduce((sum,entry)=>sum+entry.profile.confidence*entry.weight,0)).toFixed(2));
  const antiCollapsePenalty=Math.max(...entries.map((entry)=>entry.profile.antiCollapsePenalty),base.antiCollapsePenalty);
  return {
    profile:{version:1,dimensions,preferences,confidence,antiCollapsePenalty},
    contributions:entries.map((entry)=>({layer:entry.layer,weight:entry.weight,confidence:entry.profile.confidence})),
    rule:"Studio taste is durable and dominant; operator taste is secondary; project taste is temporary. None may override factual brief or brand constraints.",
  };
}
