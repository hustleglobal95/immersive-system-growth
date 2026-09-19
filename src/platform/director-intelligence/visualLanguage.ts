import type { DirectorBrief, DirectorTreatment, DirectorTerritory } from "@/src/platform/directorSchema";

export interface VisualLanguage {
  territoryId:string;
  territoryName:string;
  modeId:string;
  modeLabel:string;
  premise:string;
  composition:string[];
  typography:string[];
  color:string[];
  image:string[];
  material:string[];
  lighting:string[];
  motion:string[];
  interaction:string[];
  sound:string[];
  graphicDevices:string[];
}

export interface VisualLanguageDistance {
  a:string;
  b:string;
  dimensions:Record<"composition"|"typography"|"color"|"image"|"material"|"lighting"|"motion"|"interaction"|"sound"|"graphic",number>;
  overall:number;
}

export interface VisualLanguageDivergence {
  threshold:number;
  minimumDistance:number;
  averageDistance:number;
  sufficient:boolean;
  matrix:VisualLanguageDistance[];
  blockers:string[];
}

const modes=[
  {
    id:"monumental-restraint",label:"Monumental restraint",
    composition:["single monumental subject","asymmetric negative space","long quiet frames"],
    typography:["large quiet display scale","few hierarchy levels","disciplined edge alignment"],
    color:["narrow dominant palette","functional accent only","large calm color fields"],
    image:["stable framing","whole-subject authority","selective macro evidence"],
    material:["few highly resolved surfaces","material truth over effects"],lighting:["sculptural directional light","protected shadow"],
    motion:["slow decisive travel","long holds","one peak transformation"],interaction:["directed exploration","minimal simultaneous controls"],
    sound:["protected silence","low-frequency environmental bed"],graphic:["overscale field","single alignment spine"],
  },
  {
    id:"tactile-editorial",label:"Tactile editorial",
    composition:["layered editorial depth","intentional crop collisions","alternating image and type authority"],
    typography:["expressive display voice","authored line breaks","editorial countermotion"],
    color:["paper/material base","ink-like contrast","small saturated interruptions"],
    image:["close tactile crop","visible texture","human-scale detail"],material:["fiber grain surface","soft imperfect tactility"],
    lighting:["broad side light","texture-revealing falloff"],motion:["measured slide and mask","type/media countermotion","soft settle"],
    interaction:["editorial reveal","content-led scrub"],sound:["subtle tactile detail","quiet room tone"],graphic:["rule lines","crop windows","caption system"],
  },
  {
    id:"optical-instrument",label:"Optical instrument",
    composition:["precision grid","isolated subject","instrument-like annotations"],typography:["technical grotesk","compact labels","high display precision"],
    color:["near-neutral field","one optical accent","luminance-led hierarchy"],image:["macro optics","compressed perspective","sharp focal isolation"],
    material:["glass metal precision","controlled reflectance"],lighting:["hard edge highlights","narrow rim control"],motion:["mechanical settle","measured assembly","focus-like transitions"],
    interaction:["inspection state","precision pointer response"],sound:["mechanical micro-detail","short contact cues"],graphic:["reticles","measurement marks","index system"],
  },
  {
    id:"atmospheric-cinema",label:"Atmospheric cinema",
    composition:["environmental depth","foreground occlusion","subject revealed through space"],typography:["quiet cinematic title","low-density copy","subordinate information"],
    color:["temperature progression","environmental color fields","controlled contrast shifts"],image:["long-lens atmosphere","slow environmental reveal","weather and texture"],
    material:["air haze water foliage","environment-led surface response"],lighting:["time-of-day progression","volumetric separation"],motion:["human-scale camera travel","slow threshold movement","environmental drift"],
    interaction:["pace control","threshold exploration"],sound:["spatial ambience","environment transitions"],graphic:["minimal chrome","environmental masking"],
  },
  {
    id:"graphic-system",label:"Graphic system",
    composition:["bold planar hierarchy","hard alignment breaks","designed 2D/3D collision"],typography:["type as object","compressed scale jumps","graphic repetition"],
    color:["high-contrast blocks","brand-color behavior","deliberate abrupt state change"],image:["graphic crop","poster-like subject isolation","flat-to-depth transitions"],
    material:["graphic surfaces","selective dimensional accent"],lighting:["graphic shadow","controlled flat light"],motion:["snapped structural re-layout","directional wipes","systematic repetition"],
    interaction:["interface-as-concept","stateful graphic transformation"],sound:["short graphic punctuation","rhythmic UI cue"],graphic:["bands","frames","overscale glyphs"],
  },
  {
    id:"organic-sensory",label:"Organic sensory",
    composition:["soft spatial asymmetry","natural clustering","breathing negative space"],typography:["warm editorial voice","generous measure","low-pressure labels"],
    color:["earth/natural family","temperature drift","muted accent"],image:["sensory macro detail","inhabited moments","natural depth"],
    material:["stone textile water wood skin","visible imperfection"],lighting:["soft daylight","dappled contrast","warm practical accents"],motion:["fluid drift","slow reveal","natural irregularity"],
    interaction:["gentle discovery","touch-friendly pace"],sound:["environmental texture","soft spatial bed","protected silence"],graphic:["soft masks","organic edge"],
  },
  {
    id:"kinetic-interface",label:"Kinetic interface",
    composition:["state-driven layout","functional panels with one dominant live system","structured information rhythm"],typography:["high-legibility UI voice","decisive display statement","data hierarchy"],
    color:["semantic functional color","dark/light state contrast","limited decorative palette"],image:["interface evidence","diagrammatic transitions","screen-real compositing"],
    material:["product-native surfaces","minimal faux material"],lighting:["interface glow only when functional","neutral presentation light"],motion:["causal state change","workflow compression","direct manipulation response"],
    interaction:["primary interaction drives narrative","reversible state exploration"],sound:["silent by default","functional confirmation only"],graphic:["diagram lines","live state indicators","data traces"],
  },
  {
    id:"raw-contrast",label:"Raw contrast",
    composition:["extreme scale contrast","intentional empty/packed alternation","hard crop"],typography:["unpolished expressive display","tight utilitarian labels","visible typographic tension"],
    color:["high-contrast neutral base","one disruptive accent","unblended state changes"],image:["direct flash or raw texture","close crop","unidealized evidence"],
    material:["unfinished raw surface","visible seams"],lighting:["hard source","deep shadow","minimal smoothing"],motion:["abrupt decisive movement","staccato hold","anti-smooth contrast"],
    interaction:["direct obvious action","no decorative hover stack"],sound:["dry transient detail","silence between events"],graphic:["exposed grid","registration marks","hard rules"],
  },
] as const;

export function generateVisualLanguages(brief:DirectorBrief,treatment:DirectorTreatment):VisualLanguage[] {
  const used=new Set<string>();
  return treatment.territories.map((territory)=>{
    const ranked=modes
      .map((mode)=>({mode,score:modeScore(brief,territory,mode)}))
      .sort((a,b)=>b.score-a.score || a.mode.id.localeCompare(b.mode.id));
    const primary=ranked.find((item)=>!used.has(item.mode.id))?.mode ?? ranked[0].mode;
    used.add(primary.id);
    const accent=ranked.find((item)=>item.mode.id!==primary.id && !used.has(item.mode.id))?.mode
      ?? ranked.find((item)=>item.mode.id!==primary.id)?.mode
      ?? primary;
    return languageFor(brief,territory,primary,accent);
  });
}

export function evaluateVisualLanguageDivergence(brief:DirectorBrief,languages:VisualLanguage[]):VisualLanguageDivergence {
  const matrix:VisualLanguageDistance[]=[];
  for(let i=0;i<languages.length;i++) for(let j=i+1;j<languages.length;j++) matrix.push(distance(languages[i],languages[j]));
  const minimumDistance=Math.min(...matrix.map((item)=>item.overall),100);
  const averageDistance=matrix.length ? Math.round(matrix.reduce((sum,item)=>sum+item.overall,0)/matrix.length) : 100;
  const threshold=brief.tier==="flagship" ? 64 : brief.tier==="signature" ? 58 : brief.tier==="immersive" ? 50 : 44;
  const blockers=matrix.filter((item)=>item.overall<threshold).map((item)=>`${item.a} and ${item.b} are only ${item.overall}% apart; ${brief.tier} work requires at least ${threshold}% visual-language distance.`);
  return {threshold,minimumDistance,averageDistance,sufficient:blockers.length===0,matrix,blockers};
}

function languageFor(
  brief:DirectorBrief,
  territory:DirectorTerritory,
  primary:typeof modes[number],
  accent:typeof modes[number],
):VisualLanguage {
  const truth=brief.differentiators[0] || brief.brandTruth;
  const crossPollinate=accent.id!==primary.id;
  return {
    territoryId:territory.id,
    territoryName:territory.name,
    modeId:crossPollinate ? `${primary.id}+${accent.id}` : primary.id,
    modeLabel:crossPollinate ? `${primary.label} × ${accent.label}` : primary.label,
    premise:`${primary.label} provides the dominant frame logic while ${accent.label} contributes selective contrast. Both must remain subordinate to the client truth: ${truth}. Territory thesis: ${territory.thesis}`,
    composition:[...primary.composition,`Use the territory premise as the hierarchy test: ${territory.visualPremise}`],
    typography:[...(hash(territory.id+"type")%2 ? primary.typography : accent.typography),`Typography must support the territory memory: ${territory.memory}`],
    color:[...accent.color,`Color changes should reinforce “${territory.oneLine}”.`],
    image:[...primary.image,`Image selection must prove: ${truth}.`],
    material:[...primary.material,...accent.material.slice(0,1)],
    lighting:[...accent.lighting],
    motion:[...primary.motion],
    interaction:[...primary.interaction,`Interaction should make “${territory.experientialPremise}” easier to feel, not merely more interactive.`],
    sound:[...accent.sound],
    graphicDevices:[...accent.graphic],
  };
}

const typeAffinity:Record<string,DirectorBrief["projectType"][]>={
  "monumental-restraint":["property","product","automotive","brand"],
  "tactile-editorial":["fashion","commerce","hospitality","portfolio"],
  "optical-instrument":["product","automotive","brand","saas"],
  "atmospheric-cinema":["property","hospitality","campaign","fashion"],
  "graphic-system":["campaign","brand","portfolio","fashion"],
  "organic-sensory":["hospitality","property","fashion","commerce"],
  "kinetic-interface":["saas","brand","portfolio","commerce"],
  "raw-contrast":["campaign","fashion","portfolio","automotive"],
};

function modeScore(brief:DirectorBrief,territory:DirectorTerritory,mode:typeof modes[number]) {
  const territoryTerms=new Set(tokens([
    territory.name,territory.thesis,territory.visualPremise,territory.experientialPremise,territory.memory,brief.brandTruth,...brief.differentiators,
  ].join(" ")));
  const modeTerms=new Set(tokens([
    mode.label,...mode.composition,...mode.typography,...mode.color,...mode.image,...mode.material,...mode.lighting,...mode.motion,...mode.interaction,...mode.sound,...mode.graphic,
  ].join(" ")));
  let overlap=0;for(const term of territoryTerms) if(modeTerms.has(term)) overlap++;
  const typeFit=typeAffinity[mode.id]?.includes(brief.projectType) ? 9 : 0;
  const deterministic=(hash(brief.projectName+"|"+territory.id+"|"+mode.id)%17)/10;
  return typeFit+overlap*1.7+deterministic;
}

function distance(a:VisualLanguage,b:VisualLanguage):VisualLanguageDistance {
  const dimensions={
    composition:axisDistance(a.composition,b.composition),typography:axisDistance(a.typography,b.typography),
    color:axisDistance(a.color,b.color),image:axisDistance(a.image,b.image),material:axisDistance(a.material,b.material),
    lighting:axisDistance(a.lighting,b.lighting),motion:axisDistance(a.motion,b.motion),interaction:axisDistance(a.interaction,b.interaction),
    sound:axisDistance(a.sound,b.sound),graphic:axisDistance(a.graphicDevices,b.graphicDevices),
  };
  const values=Object.values(dimensions);
  const lexical=Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
  const modeBonus=a.modeId===b.modeId ? 0 : 18;
  return {a:a.territoryId,b:b.territoryId,dimensions,overall:Math.min(100,lexical+modeBonus)};
}
function axisDistance(a:string[],b:string[]) {
  const left=new Set(tokens(a.join(" "))); const right=new Set(tokens(b.join(" ")));
  if(!left.size&&!right.size) return 0;
  let intersection=0; for(const token of left) if(right.has(token)) intersection++;
  const similarity=intersection/Math.max(1,left.size+right.size-intersection);
  return Math.round((1-similarity)*100);
}
function tokens(value:string) {
  const stop=new Set(["the","and","with","from","that","this","into","only","when","rather","should","through","use","one"]);
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g," ").split(/\s+/).filter((token)=>token.length>3&&!stop.has(token));
}
function hash(value:string) {
  let result=2166136261;
  for(let i=0;i<value.length;i++){result^=value.charCodeAt(i);result=Math.imul(result,16777619);}
  return Math.abs(result>>>0);
}
