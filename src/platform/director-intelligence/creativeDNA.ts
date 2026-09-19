import type { DirectorBrief, DirectorTreatment, DirectorTerritory } from "@/src/platform/directorSchema";
import type { RetrievedPrecedent } from "@/src/platform/director-intelligence/types";

export interface CreativeDNA {
  version:1;
  projectName:string;
  territoryId:string;
  northStar:string;
  contradiction:string;
  memoryPromise:string;
  signatureMechanism:string;
  composition:{
    dominance:string;
    negativeSpace:string;
    density:string;
    scaleContrast:string;
    cropping:string;
    depth:string;
    rhythm:string;
  };
  typography:{
    personality:string;
    scaleContrast:string;
    alignment:string;
    measure:string;
    hierarchy:string;
    motionRelationship:string;
  };
  color:{
    dominant:string;
    supporting:string;
    accent:string;
    temperature:string;
    contrastBehavior:string;
    progression:string;
  };
  image:{
    lens:string;
    crop:string;
    subjectDistance:string;
    texture:string;
    humanPresence:string;
    grading:string;
    motionCharacter:string;
  };
  threeD:{
    geometryCharacter:string;
    materialFamily:string;
    surfaceResponse:string;
    cameraRelationship:string;
    realismRule:string;
  };
  motion:{
    energy:string;
    inertia:string;
    acceleration:string;
    stillness:string;
    signatureBehavior:string;
  };
  lighting:{
    direction:string;
    hardness:string;
    temperature:string;
    contrast:string;
    progression:string;
  };
  interaction:{
    model:string;
    feedback:string;
    restraint:string;
  };
  sound:{
    texture:string;
    dynamics:string;
    spatiality:string;
    silence:string;
    interaction:string;
  };
  mobile:{
    preserve:string;
    simplify:string;
    neverLose:string;
  };
  antiPatterns:string[];
  precedentTransfers:string[];
}

const typeCharacter:Record<DirectorBrief["projectType"],{
  composition:string;type:string;image:string;material:string;light:string;sound:string;
}> = {
  brand:{composition:"One branded gesture should dominate each frame while supporting proof stays subordinate.",type:"A distinctive display voice paired with a quiet evidence voice.",image:"Image treatment should behave like part of the identity system, not a stock-content layer.",material:"A small proprietary material vocabulary should repeat with discipline.",light:"Lighting should reinforce changes in brand state.",sound:"Use one recognizable sonic motif only where it strengthens recall."},
  product:{composition:"The product owns the frame; copy and proof orbit its hierarchy rather than compete with it.",type:"Precise display typography with restrained labels and annotation behavior.",image:"Alternate tactile macro evidence with authoritative whole-object views.",material:"Surface response must communicate quality before explanatory copy.",light:"Shape form with controlled highlights, negative fill and detail-specific rims.",sound:"Mechanical details, clicks and contact should be sparse, specific and believable."},
  property:{composition:"Architecture, horizon and view corridors define the grid; UI follows those alignments.",type:"Architectural typography with disciplined metadata, generous measure and quiet authority.",image:"Move from place and scale into material intimacy without generic lifestyle filler.",material:"Borrow from the actual architecture and landscape palette rather than generic luxury cues.",light:"Daylight progression should describe place, privacy and elevation.",sound:"Move from public city texture toward private spatial quiet."},
  hospitality:{composition:"Atmosphere leads, utility follows; wide environmental frames alternate with tactile intimate details.",type:"Hospitality typography should feel generous, calm and unforced.",image:"Prioritize place, weather, texture and inhabitation over coverage.",material:"Local tactile materials should inform both environment and interface accents.",light:"Natural light and time-of-day are primary emotional instruments.",sound:"Build a quiet environmental bed with protected silence."},
  portfolio:{composition:"Selected work gets disproportionate scale and space while studio chrome remains quiet.",type:"A restrained studio voice should frame rather than overpower client work.",image:"Each project keeps its own image language while the studio controls rhythm and framing.",material:"Avoid a house material effect that competes with portfolio evidence.",light:"Match the art direction of each selected project rather than imposing one global rig.",sound:"Sound appears only when it is part of the work or presentation thesis."},
  saas:{composition:"Product reality and causality own the frame; decoration must not outrank workflow proof.",type:"High-legibility typography with decisive hierarchy and controlled display moments.",image:"Prefer real interface, diagrams and customer evidence over generic tech imagery.",material:"Surfaces should feel coherent with the actual product UI.",light:"Avoid theatrical lighting unless the brand genuinely uses a 3D world.",sound:"Default to silence unless sound explains product behavior."},
  commerce:{composition:"Editorial desire and direct product access alternate without breaking continuity.",type:"Editorial display typography with highly legible commerce utility.",image:"Silhouette, material and styling should create desire before catalog density takes over.",material:"Material detail should become a recurring navigation and transition language.",light:"Use light to reveal material and silhouette, not as generic gloss.",sound:"Keep commerce quiet; reserve sound for brand-defining editorial moments."},
  campaign:{composition:"One campaign device should mutate across frames instead of accumulating unrelated effects.",type:"Display type may become a primary visual object when it carries the campaign idea.",image:"Use a coherent campaign image grammar with deliberate repetition and rupture.",material:"Graphic and spatial materials should serve the campaign mechanism.",light:"Lighting can shift aggressively when it is part of the campaign transformation.",sound:"Use sound as a punctuation system rather than continuous wallpaper."},
  automotive:{composition:"Vehicle stance, proportion and surface tension dominate; environment proves context rather than distracts.",type:"Technical confidence with restrained labeling and strong scale contrast.",image:"Alternate controlled hero stance with functional/material detail and real-use evidence.",material:"Paint, glass, metal, carbon and interior materials need distinct response behavior.",light:"Long controlled highlights should describe body surfacing and volume.",sound:"Mechanical, road and cabin detail should feel authored and physically grounded."},
  fashion:{composition:"Body, silhouette, garment and negative space should form a graphic system rather than a product grid.",type:"Editorial typography can take spatial authority but must preserve the garment hierarchy.",image:"Use a coherent lens, crop and movement grammar across campaign and product imagery.",material:"Fabric behavior, translucency, weave and drape should shape the visual system.",light:"Light should reveal silhouette and textile behavior before decorative atmosphere.",sound:"Rhythm may be more expressive, but silence should still frame key looks."},
};

export function buildCreativeDNA(input:{
  brief:DirectorBrief;
  treatment:DirectorTreatment;
  precedents?:RetrievedPrecedent[];
  territoryId?:string;
}):CreativeDNA {
  const territory=territoryFor(input.treatment,input.territoryId);
  const profile=typeCharacter[input.brief.projectType];
  const grammar=input.treatment.grammar;
  const art=input.treatment.artBible;
  const truth=input.brief.differentiators[0] || input.brief.brandTruth;
  const tension=input.brief.constraints[0] || "category familiarity";
  const crossDomain=(input.precedents ?? []).filter((item)=>!item.precedent.industries.includes(input.brief.projectType)).slice(0,3);

  return {
    version:1,
    projectName:input.brief.projectName,
    territoryId:territory.id,
    northStar:art.northStar || territory.thesis,
    contradiction:`Hold ${truth} against ${tension}; the visual system should make that tension legible rather than smoothing it away.`,
    memoryPromise:territory.memory,
    signatureMechanism:territory.signatureMoment,
    composition:{
      dominance:first(grammar.composition,profile.composition),
      negativeSpace:art.whitespace || "Protect intentional negative space around the dominant subject.",
      density:densityRule(input.treatment),
      scaleContrast:`Use decisive scale contrast around the ${input.treatment.signatureMoment.name}; supporting sections should be visibly quieter.`,
      cropping:profile.image,
      depth:first(grammar.spatial,"Build clear foreground, subject and atmosphere planes only when each plane has a job."),
      rhythm:`Alternate visual compression and release across ${input.treatment.emotionalArc.map((beat)=>beat.label).join(" → ")}.`,
    },
    typography:{
      personality:art.typographyCharacter || profile.type,
      scaleContrast:"Use a large display-to-body jump; avoid a ladder of nearly equal text sizes.",
      alignment:input.brief.projectType==="property" || input.brief.projectType==="saas" ? "Use disciplined shared edges; break them only for a protected creative reason." : "Let alignment follow the dominant image/subject plane rather than centering by default.",
      measure:"Keep reading copy deliberately short; display lines should feel authored rather than browser-wrapped.",
      hierarchy:first(grammar.typography,profile.type),
      motionRelationship:"Typography should move on a different time constant or axis from the dominant visual system so both do not demand attention at once.",
    },
    color:{
      dominant:colorRule(grammar.color,0,"Choose one dominant environmental color family tied to the brand/world, not a generic premium default."),
      supporting:colorRule(grammar.color,1,"Use supporting colors to separate information and depth without creating a second identity."),
      accent:colorRule(grammar.color,2,"Reserve the accent for functional emphasis or the signature mechanism, not continuous decoration."),
      temperature:temperatureRule(art.paletteLogic,input.brief.projectType),
      contrastBehavior:"Use contrast changes to announce narrative state changes; avoid keeping every section at the same luminance intensity.",
      progression:`Let color progress with the emotional arc rather than repainting every scene independently. ${art.paletteLogic}`,
    },
    image:{
      lens:first(grammar.imagery,profile.image),
      crop:"Author recurring crop behavior—macro, whole, portrait, horizon or silhouette—rather than letting every asset choose its own framing.",
      subjectDistance:imageDistanceRule(input.brief.projectType),
      texture:profile.material,
      humanPresence:humanRule(input.brief.projectType),
      grading:art.photographyCharacter || profile.image,
      motionCharacter:"If video is used, camera movement and editorial cutting should obey the same rhythm as the interactive camera grammar.",
    },
    threeD:{
      geometryCharacter:`Use geometry only where it strengthens ${territory.thesis}; avoid adding 3D simply to signal technical sophistication.`,
      materialFamily:art.materialLogic || profile.material,
      surfaceResponse:first(grammar.materials,profile.material),
      cameraRelationship:first(grammar.camera,"Treat 3D as photographed subject matter with deliberate lens and framing."),
      realismRule:"Realism is required where material, scale or product/architecture proof matters; stylization is allowed only when it strengthens the territory thesis.",
    },
    motion:{
      energy:energyRule(input.treatment),
      inertia:first(grammar.motion,"Use physically coherent acceleration and settling rather than generic easing spectacle."),
      acceleration:"Acceleration should communicate mass and medium: mechanical objects settle differently from typography, atmosphere and camera.",
      stillness:"Protect stillness before and after the strongest beat. A premium experience cannot be at peak motion continuously.",
      signatureBehavior:`The most distinctive motion behavior belongs to ${input.treatment.signatureMoment.name}; do not repeat it casually elsewhere.`,
    },
    lighting:{
      direction:first(grammar.lighting,profile.light),
      hardness:hardnessRule(input.brief.projectType),
      temperature:temperatureRule(art.paletteLogic,input.brief.projectType),
      contrast:"Use lighting contrast to focus the hierarchy and reveal material; do not compensate for weak composition with glow.",
      progression:`Lighting should progress with the story and climax at ${input.treatment.signatureMoment.name}, then resolve rather than staying maximally dramatic.`,
    },
    interaction:{
      model:first(grammar.interaction,"One obvious interaction model should support the narrative."),
      feedback:"Feedback should confirm agency immediately while secondary motion remains subordinate.",
      restraint:"Do not stack hover, drag, tilt, magnetic and cursor effects on the same subject. One interaction should own each moment.",
    },
    sound:{
      texture:first(grammar.sound,profile.sound),
      dynamics:"Use dynamic contrast and protected silence. Constant sound removes the ability to create emphasis.",
      spatiality:"Spatial sound is justified only when location, object relationship or environment meaningfully benefits from it.",
      silence:"Silence is an authored state and should frame important reveals, reading moments and conversion.",
      interaction:"Interaction sound should feel sourced from the object/world rather than generic interface effects.",
    },
    mobile:{
      preserve:input.treatment.mobileInterpretation[0] || "Preserve the thesis, signature subject and primary action.",
      simplify:"Reduce travel, overlap and simultaneous effects before removing the central creative mechanism.",
      neverLose:`The mobile experience must still communicate: ${territory.memory}.`,
    },
    antiPatterns:[...input.treatment.noGoRules,...input.treatment.signatureMoment.protectFrom].filter(unique).slice(0,20),
    precedentTransfers:crossDomain.map((item)=>`${item.precedent.title}: ${item.precedent.transferableLessons[0] ?? item.precedent.strongestDecision}`),
  };
}

function territoryFor(treatment:DirectorTreatment,id?:string):DirectorTerritory {
  return treatment.territories.find((item)=>item.id===(id ?? treatment.selectedTerritoryId)) ?? treatment.territories[0];
}
function first(items:string[],fallback:string) { return items.find(Boolean) ?? fallback; }
function unique(value:string,index:number,array:string[]) { return value.length>0 && array.indexOf(value)===index; }
function colorRule(items:string[],index:number,fallback:string) { return items[index] || items[0] || fallback; }
function densityRule(treatment:DirectorTreatment) {
  const average=treatment.emotionalArc.reduce((sum,beat)=>sum+beat.informationDensity,0)/Math.max(1,treatment.emotionalArc.length);
  return average>=7 ? "Use deliberately dense proof moments, but surround them with sparse frames so density reads as evidence rather than clutter."
    : average<=4 ? "Maintain sparse visual density and make each added object justify its attention cost."
      : "Alternate sparse hero frames with denser evidence frames; do not let medium density become the default everywhere.";
}
function imageDistanceRule(type:DirectorBrief["projectType"]) {
  if(["product","automotive","fashion","commerce"].includes(type)) return "Alternate intimate detail with authoritative whole-subject framing.";
  if(["property","hospitality"].includes(type)) return "Alternate environmental scale with human/material intimacy.";
  return "Vary subject distance only when the change reveals new evidence or meaning.";
}
function humanRule(type:DirectorBrief["projectType"]) {
  if(["hospitality","fashion","commerce"].includes(type)) return "Human presence should demonstrate inhabitation, fit or attitude without becoming generic lifestyle filler.";
  if(type==="property") return "Use people sparingly for scale and lived credibility; architecture remains primary.";
  return "Include human presence only when it provides evidence, empathy or scale.";
}
function temperatureRule(palette:string,type:DirectorBrief["projectType"]) {
  if(/warm|amber|earth|sand|gold|sun/i.test(palette)) return "Warm-biased, with cooler counterpoints reserved for depth and functional separation.";
  if(/cool|blue|steel|silver|ice|cyan/i.test(palette)) return "Cool-biased, with warmer counterpoints used only where the narrative needs intimacy or action.";
  return ["hospitality","fashion","commerce"].includes(type) ? "Temperature may shift with intimacy, but each shift needs narrative purpose." : "Keep temperature controlled and brand-specific rather than defaulting to cinematic teal/orange contrast.";
}
function hardnessRule(type:DirectorBrief["projectType"]) {
  if(["automotive","product"].includes(type)) return "Controlled hard-to-medium sources should draw form and material edges; soften only for intimacy.";
  if(["hospitality","fashion"].includes(type)) return "Mix broad soft sources with selective harder accents to preserve texture and silhouette.";
  return "Choose hardness from subject/material needs, not a universal studio-light preset.";
}
function energyRule(treatment:DirectorTreatment) {
  const peak=Math.max(...treatment.emotionalArc.map((beat)=>beat.intensity));
  const floor=Math.min(...treatment.emotionalArc.map((beat)=>beat.intensity));
  return peak-floor>=6 ? "Use high dynamic range: genuine stillness around a small number of decisive peaks." : "Increase contrast between quiet and active beats; the current emotional range should not become visually flat.";
}
