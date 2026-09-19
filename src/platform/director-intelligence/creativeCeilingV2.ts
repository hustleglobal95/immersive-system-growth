import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { AssetGapReport, EvaluationReport } from "@/src/platform/director-intelligence/types";
import type { CreativeDNA } from "@/src/platform/director-intelligence/creativeDNA";
import type { ArtDirectionPlan } from "@/src/platform/director-intelligence/artDirector";
import type { VisualLanguageDivergence } from "@/src/platform/director-intelligence/visualLanguage";

export type CreativeCeilingDimension="concept"|"assets"|"visualLanguage"|"typography"|"camera"|"motion"|"interaction"|"originality"|"lighting"|"materials"|"imageDirection"|"sound"|"coherence";
export interface CreativeCeilingV2 {
  current:number;
  projected:number;
  dimensions:Record<CreativeCeilingDimension,number>;
  bottlenecks:Array<{dimension:CreativeCeilingDimension;score:number;reason:string}>;
  highestLeverage:Array<{dimension:CreativeCeilingDimension;gain:number;action:string}>;
  confidence:number;
}

export function estimateCreativeCeilingV2(input:{
  brief:DirectorBrief;
  treatment:DirectorTreatment;
  selected:EvaluationReport;
  assetGap:AssetGapReport;
  dna:CreativeDNA;
  art:ArtDirectionPlan;
  divergence:VisualLanguageDivergence;
}):CreativeCeilingV2 {
  const {brief,treatment,selected,assetGap,divergence}=input;
  const grammar=treatment.grammar;
  const dimensions:Record<CreativeCeilingDimension,number>={
    concept:avg(selected.scores.conceptualClarity,selected.scores.brandAdherence,selected.scores.memorability),
    assets:clamp(assetGap.completeness/10),
    visualLanguage:clamp(5.2+divergence.minimumDistance/22),
    typography:discipline(grammar.typography,selected.scores.aestheticCoherence),
    camera:discipline(grammar.camera,selected.scores.motionCameraJustification),
    motion:discipline(grammar.motion,selected.scores.motionCameraJustification),
    interaction:discipline(grammar.interaction,selected.scores.interactionPurpose),
    originality:avg(selected.scores.novelty,selected.scores.distinctiveness,selected.scores.portfolioNovelty),
    lighting:discipline(grammar.lighting,selected.scores.aestheticCoherence-0.4),
    materials:discipline(grammar.materials,selected.scores.assetRealism),
    imageDirection:discipline(grammar.imagery,avg(selected.scores.aestheticCoherence,selected.scores.assetRealism)),
    sound:discipline(grammar.sound,brief.projectType==="saas" ? 6.8 : 7.2),
    coherence:avg(selected.scores.aestheticCoherence,selected.scores.structuralExpression,selected.scores.brandAdherence),
  };
  const weights:Record<CreativeCeilingDimension,number>={
    concept:.13,assets:.09,visualLanguage:.10,typography:.07,camera:.08,motion:.08,interaction:.06,originality:.11,lighting:.06,materials:.05,imageDirection:.07,sound:.03,coherence:.07,
  };
  const current=clamp(Object.entries(dimensions).reduce((sum,[key,value])=>sum+value*weights[key as CreativeCeilingDimension],0));
  const reasons:Partial<Record<CreativeCeilingDimension,string>>={
    assets:"Available hero/signature assets cap the intended level of craft.",
    visualLanguage:"The three territories are not visually separated enough to prove genuine choice.",
    typography:"Typography lacks enough authored character, hierarchy or motion behavior.",
    camera:"Camera grammar is not yet specific enough to the thesis.",
    motion:"Motion grammar lacks contrast, medium-specific behavior or a protected signature.",
    interaction:"Interaction is not yet carrying enough narrative or utility meaning.",
    originality:"The direction still overlaps familiar category or portfolio devices.",
    lighting:"Lighting is under-directed relative to the intended world.",
    materials:"Material behavior is not specific enough to the subject or brand.",
    imageDirection:"Photography/video language is not yet coherent enough.",
    sound:"Sound has little authored role in the experience.",
    coherence:"The visual disciplines are not yet downstream of one strong north star.",
    concept:"The controlling idea or brand causality needs strengthening.",
  };
  const actions:Record<CreativeCeilingDimension,string>={
    concept:"Rewrite the controlling idea until the brand truth causes the experience mechanism.",
    assets:"Upgrade or create the highest-value hero/signature asset before polishing secondary scenes.",
    visualLanguage:"Force the closest territories into different composition/type/color/image/material/motion systems.",
    typography:"Author a type pairing, scale system, line-break grammar and motion relationship tied to the concept.",
    camera:"Define lens family, shot scale, camera height and motivated movement before adding path complexity.",
    motion:"Reduce motion vocabulary and protect one project-specific signature behavior.",
    interaction:"Make one interaction reveal meaning, evidence or control rather than adding more effects.",
    originality:"Replace the highest-collision visible device with a client-specific mechanism.",
    lighting:"Create a lighting bible with direction, hardness, temperature, contrast and story progression.",
    materials:"Create material classes with real reference targets and specific surface-response behavior.",
    imageDirection:"Create one photographic/film grammar for lens, crop, subject distance, grain and grading.",
    sound:"Author silence, ambience, interaction detail and transition punctuation as one dynamic system.",
    coherence:"Run Art Director review across all disciplines and remove any device that does not support the north star.",
  };
  const bottlenecks=(Object.entries(dimensions) as Array<[CreativeCeilingDimension,number]>)
    .sort((a,b)=>a[1]-b[1]).slice(0,5).map(([dimension,score])=>({dimension,score,reason:reasons[dimension] ?? "This discipline limits the current creative ceiling."}));
  const highestLeverage=bottlenecks.map((item)=>({
    dimension:item.dimension,
    gain:Number(Math.max(.2,Math.min(1.2,(9.5-item.score)*.34)).toFixed(1)),
    action:actions[item.dimension],
  }));
  const projected=clamp(current+highestLeverage.slice(0,3).reduce((sum,item)=>sum+item.gain,0)*.62);
  const confidence=Number(Math.max(.48,Math.min(.94,.58+brief.differentiators.length*.04+brief.existingAssets.length*.012+(divergence.sufficient?.08:0))).toFixed(2));
  return {current,projected,dimensions,bottlenecks,highestLeverage,confidence};
}

function discipline(items:string[],base:number) {
  const richness=Math.min(1.2,items.filter(Boolean).length*.24);
  return clamp(base*.84+1.2+richness);
}
function avg(...items:number[]) { return clamp(items.reduce((sum,item)=>sum+item,0)/Math.max(1,items.length)); }
function clamp(value:number) { return Math.max(0,Math.min(10,Number(value.toFixed(1)))); }
