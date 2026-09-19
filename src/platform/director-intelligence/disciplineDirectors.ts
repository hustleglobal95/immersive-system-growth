import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { CreativeDNA } from "@/src/platform/director-intelligence/creativeDNA";
import type { ArtDirectionPlan } from "@/src/platform/director-intelligence/artDirector";

export type CreativeDiscipline="typography"|"camera"|"motion"|"lighting"|"material"|"image"|"interaction"|"sound";
export interface DisciplineDirection {
  id:CreativeDiscipline;
  premise:string;
  rules:string[];
  avoid:string[];
  mobile:string[];
  proof:string[];
}
export type DisciplineDirections=Record<CreativeDiscipline,DisciplineDirection>;

export function directDisciplines(input:{brief:DirectorBrief;treatment:DirectorTreatment;dna:CreativeDNA;art:ArtDirectionPlan}):DisciplineDirections {
  const {treatment,dna}=input;
  return {
    typography:{
      id:"typography",premise:dna.typography.personality,
      rules:[dna.typography.scaleContrast,dna.typography.alignment,dna.typography.measure,dna.typography.motionRelationship,"Author display line breaks at target breakpoints instead of relying on accidental browser wrapping."],
      avoid:["Do not use the same word-by-word reveal everywhere.","Do not let decorative type reduce reading order or contrast.","Do not add a third type family unless it creates a real semantic role."],
      mobile:["Re-author line breaks for portrait composition.","Reduce overlap before reducing hierarchy.","Preserve display/body contrast even when sizes compress."],
      proof:["Check real client copy at narrow and wide widths.","Verify final selected font licenses, glyph coverage and loading cost."],
    },
    camera:{
      id:"camera",premise:dna.threeD.cameraRelationship,
      rules:[...treatment.grammar.camera.slice(0,4),"Define shot size, lens character, camera height and subject relationship before path complexity.","Every camera move must reveal new evidence, spatial relationship or emotional state."],
      avoid:["Perpetual orbit.","Unmotivated drone movement.","Changing lens character randomly between adjacent chapters."],
      mobile:["Reframe the subject for portrait rather than shrinking the desktop path.","Reduce travel before removing the shot's purpose."],
      proof:["Check start, midpoint, settle and reverse states.","Verify the subject remains legible at the emotional peak."],
    },
    motion:{
      id:"motion",premise:dna.motion.energy,
      rules:[dna.motion.inertia,dna.motion.acceleration,dna.motion.stillness,dna.motion.signatureBehavior,"Use a small recognizable motion vocabulary so motion becomes identity rather than decoration."],
      avoid:["Equal animation density in every chapter.","Identical easing across camera, typography, object and atmosphere.","Adding motion to solve weak composition."],
      mobile:["Reduce simultaneous systems first.","Keep the signature behavior if it remains usable and performant."],
      proof:["Scrub forward and reverse.","Judge motion at real display refresh rates and on physical mobile hardware."],
    },
    lighting:{
      id:"lighting",premise:dna.lighting.direction,
      rules:[dna.lighting.hardness,dna.lighting.temperature,dna.lighting.contrast,dna.lighting.progression,"Light should explain volume, material or narrative state; every source needs a reason."],
      avoid:["Uniform HDRI dependence.","Bloom used as lighting.","Rim light on every object regardless of form."],
      mobile:["Reduce expensive volumetrics before changing the light hierarchy.","Keep subject/background separation at lower quality tiers."],
      proof:["Check hero surfaces under actual material values.","Verify light changes remain intentional without postprocessing."],
    },
    material:{
      id:"material",premise:dna.threeD.materialFamily,
      rules:[dna.threeD.surfaceResponse,dna.threeD.realismRule,"Define a narrow roughness/reflectance vocabulary by material class.","Use micro-detail only at distances where it can be perceived."],
      avoid:["Generic chrome/glass as a premium shortcut.","Uniform roughness across unrelated materials.","High-cost transmission on surfaces that do not need it."],
      mobile:["Preserve material identity while simplifying expensive transmission/reflection.","Use baked or cheaper response only when the perceptual result survives."],
      proof:["Validate against real reference material.","Inspect highlights at macro and hero distances."],
    },
    image:{
      id:"image",premise:dna.image.grading,
      rules:[dna.image.crop,dna.image.subjectDistance,dna.image.texture,dna.image.humanPresence,"Define a repeatable lens/crop/grade grammar before sourcing additional imagery."],
      avoid:["Mixed stock-photo languages.","Using cinematic grading to hide weak source imagery.","Cropping that destroys product/architecture evidence."],
      mobile:["Author portrait crops deliberately.","Keep essential faces/products/architecture inside safe focal regions."],
      proof:["Review the asset set as a contact sheet, not one image at a time.","Confirm source quality supports intended full-bleed and macro use."],
    },
    interaction:{
      id:"interaction",premise:dna.interaction.model,
      rules:[dna.interaction.feedback,dna.interaction.restraint,"One obvious action should own each moment.","Interaction should reveal meaning, evidence or control—not create chores."],
      avoid:["Hover-only essential behavior.","Stacked magnetic/tilt/cursor effects.","Novel interaction with no narrative or utility consequence."],
      mobile:["Touch gets an authored equivalent, not a missing hover fallback.","Protect reachable primary actions."],
      proof:["Keyboard and touch must preserve the intended journey.","Trace interaction state through scene transitions and reverse navigation."],
    },
    sound:{
      id:"sound",premise:dna.sound.texture,
      rules:[dna.sound.dynamics,dna.sound.spatiality,dna.sound.silence,dna.sound.interaction,"Sound should share the same emotional arc as camera, light and motion."],
      avoid:["Constant soundtrack used as atmosphere by default.","Generic whooshes on every transition.","Autoplay assumptions that break silent/mobile browsing."],
      mobile:["Design silent-first equivalence.","Respect autoplay and reduced-data contexts.","Keep interaction feedback useful without headphones."],
      proof:["Test with sound off first, then on.","Verify loudness, ducking and transition tails across the whole journey."],
    },
  };
}
