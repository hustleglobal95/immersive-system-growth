import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { CreativeDNA } from "@/src/platform/director-intelligence/creativeDNA";

export interface ArtDirectionSceneFrame {
  beatId:string;
  label:string;
  intensity:number;
  dominant:string;
  supporting:string;
  composition:string;
  typeBehavior:string;
  colorLightBehavior:string;
  motionBehavior:string;
  proofBehavior:string;
}

export interface ArtDirectionPlan {
  version:1;
  thesis:string;
  visualRule:string;
  hierarchyRule:string;
  frameSystem:{
    dominantPlane:string;
    supportingPlane:string;
    foregroundPlane:string;
    negativeSpaceRule:string;
    densityRule:string;
  };
  typeSystem:string[];
  colorSystem:string[];
  imageSystem:string[];
  materialSystem:string[];
  lightingSystem:string[];
  motionSystem:string[];
  interactionSystem:string[];
  sceneFrames:ArtDirectionSceneFrame[];
  craftRules:string[];
  reject:string[];
}

export function directArt(input:{brief:DirectorBrief;treatment:DirectorTreatment;dna:CreativeDNA}):ArtDirectionPlan {
  const {brief,treatment,dna}=input;
  const sceneFrames=treatment.emotionalArc.map((beat)=>{
    const isPeak=beat.intensity>=9;
    const isProof=beat.proofLevel>=7;
    const quiet=beat.intensity<=4;
    return {
      beatId:beat.id,
      label:beat.label,
      intensity:beat.intensity,
      dominant:isPeak ? `Protect the signature mechanism: ${dna.signatureMechanism}`
        : isProof ? "Verified product/brand evidence owns the frame."
          : quiet ? "Negative space and one controlled subject own the frame."
            : "One subject or media plane owns attention; secondary information stays visibly subordinate.",
      supporting:beat.informationDensity>=7 ? "Use disciplined metadata/evidence as a secondary plane." : "Keep supporting material sparse and low contrast.",
      composition:isPeak ? `${dna.composition.scaleContrast} Break the normal frame logic once, deliberately.` : dna.composition.dominance,
      typeBehavior:isPeak ? "Reduce copy during the signature event; restore hierarchy after the visual payoff." : beat.informationDensity>=7 ? "Use smaller disciplined evidence typography with explicit grouping." : dna.typography.hierarchy,
      colorLightBehavior:isPeak ? `${dna.lighting.progression} Allow the largest contrast/state change here.` : quiet ? "Lower lighting/color contrast and protect visual rest." : dna.color.contrastBehavior,
      motionBehavior:isPeak ? dna.motion.signatureBehavior : quiet ? dna.motion.stillness : dna.motion.inertia,
      proofBehavior:isProof ? "Proof must be legible and attributable; do not bury evidence inside spectacle." : "Do not introduce proof density unless this beat answers a visitor question.",
    };
  });

  return {
    version:1,
    thesis:`Make ${treatment.thesis} visible before explanatory copy is required.`,
    visualRule:`Every frame must feel downstream of “${dna.northStar}” rather than a collection of premium web conventions.`,
    hierarchyRule:"One dominant subject, one secondary information system, one optional atmospheric layer. Anything else must justify its attention cost.",
    frameSystem:{
      dominantPlane:dna.composition.dominance,
      supportingPlane:"Supporting copy, evidence and controls should share alignment logic and never rival the dominant visual plane.",
      foregroundPlane:"Foreground occlusion/detail is optional and should exist primarily to create depth, transition continuity or tactile evidence.",
      negativeSpaceRule:dna.composition.negativeSpace,
      densityRule:dna.composition.density,
    },
    typeSystem:[dna.typography.personality,dna.typography.scaleContrast,dna.typography.alignment,dna.typography.measure,dna.typography.motionRelationship],
    colorSystem:[dna.color.dominant,dna.color.supporting,dna.color.accent,dna.color.contrastBehavior,dna.color.progression],
    imageSystem:[dna.image.lens,dna.image.crop,dna.image.subjectDistance,dna.image.grading,dna.image.humanPresence],
    materialSystem:[dna.threeD.materialFamily,dna.threeD.surfaceResponse,dna.threeD.realismRule],
    lightingSystem:[dna.lighting.direction,dna.lighting.hardness,dna.lighting.temperature,dna.lighting.contrast,dna.lighting.progression],
    motionSystem:[dna.motion.energy,dna.motion.inertia,dna.motion.acceleration,dna.motion.stillness,dna.motion.signatureBehavior],
    interactionSystem:[dna.interaction.model,dna.interaction.feedback,dna.interaction.restraint],
    sceneFrames,
    craftRules:[
      "Do not allow a supporting effect to become more visually specific than the core idea.",
      "If an effect could be transplanted unchanged to a competitor, either rewrite it around the brand truth or remove it.",
      "Use real content length, real assets and real device framing when judging composition.",
      `For ${brief.tier} work, concentrate custom production where it increases memory or proof rather than distributing polish evenly.`,
    ],
    reject:[
      ...dna.antiPatterns,
      "Generic premium styling used as a substitute for a project-specific visual mechanism.",
      "Simultaneous camera, typography, media and decorative motion competing for the same attention window.",
      "A mobile version that preserves effects but loses the core visual idea.",
    ].filter(unique).slice(0,24),
  };
}

function unique(value:string,index:number,array:string[]) { return value.length>0 && array.indexOf(value)===index; }
