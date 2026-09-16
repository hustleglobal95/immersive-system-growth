import { parseCreativePlan, type CreativePlan, type CreativeMotionArchetype, type CreativeMotionPreset } from "@/src/platform/creativePlanSchema";
import { parseDirectorTreatment, type DirectorTreatment } from "@/src/platform/directorSchema";

const archetypeByProject: Partial<Record<DirectorTreatment["projectType"], CreativeMotionArchetype>> = {
  property: "architectural-build",
  product: "product-hero",
  automotive: "product-hero",
  hospitality: "threshold-passage",
  fashion: "parallax-story",
  commerce: "parallax-story",
  portfolio: "editorial-reveal",
  saas: "editorial-reveal",
  brand: "parallax-story",
  campaign: "threshold-passage",
};

const presetByIntensity: Array<[number, CreativeMotionPreset]> = [
  [9, "cinematic-focus"],
  [7, "camera-drift"],
  [5, "media-reveal"],
  [3, "copy-rise"],
  [0, "light-pulse"],
];

export interface DirectorCompilation {
  treatment: DirectorTreatment;
  creativePlan: CreativePlan;
  provenance: Record<string, string>;
}

export function compileDirectorTreatment(input: unknown): DirectorCompilation {
  const treatment = parseDirectorTreatment(input);
  const provenance: Record<string, string> = {};
  const selected = treatment.territories.find((territory) => territory.id === treatment.selectedTerritoryId)!;
  const primaryArchetype = archetypeByProject[treatment.projectType] ?? "editorial-reveal";

  const scenes = treatment.emotionalArc.map((beat, index) => {
    const shot = treatment.shotBible.find((candidate) => candidate.chapterId === beat.id) ?? treatment.shotBible[index % treatment.shotBible.length];
    const signature = beat.intensity >= 9;
    const runtimeArchetype = signature ? primaryArchetype : undefined;
    const runtimePreset = presetForIntensity(beat.intensity);
    const id = slug(beat.id || beat.label);
    provenance[`scenes.${index}.purpose`] = `director.emotionalArc[${index}]`;
    provenance[`scenes.${index}.direction`] = `director.shotBible:${shot.id}`;
    provenance[`scenes.${index}.runtime`] = signature ? "director.signatureMoment" : `director.intensity:${beat.intensity}`;

    return {
      id,
      purpose: beat.purpose,
      subject: shot.subject,
      copy: copyForBeat(treatment, beat, index),
      interaction: interactionForBeat(treatment, beat),
      transitionIn: shot.transitionIn,
      transitionOut: shot.transitionOut,
      direction: {
        objective: beat.purpose,
        spatialStory: treatment.grammar.spatial.join(" ").slice(0, 500),
        composition: treatment.grammar.composition.slice(0, 32),
        camera: {
          framing: [shot.framing],
          lens: [shot.lensCharacter],
          path: [shot.movement],
          speed: [shot.durationCharacter],
          focus: [`Primary subject: ${shot.subject}`, `Emotional target: ${beat.emotion}`],
        },
        lighting: {
          timeOfDay: treatment.grammar.lighting.slice(0, 2),
          key: treatment.grammar.lighting.slice(0, 2),
          fill: treatment.grammar.lighting.slice(1, 3),
          practicals: [],
          atmosphere: treatment.grammar.lighting.slice(0, 32),
        },
        materials: treatment.grammar.materials.slice(0, 32),
        motion: {
          subject: treatment.grammar.motion.slice(0, 32),
          environment: treatment.grammar.spatial.slice(0, 32),
          assembly: signature ? [treatment.signatureMoment.description.slice(0, 300)] : [],
          easing: [beat.intensity >= 8 ? "Use deliberate timing with a clear acceleration/deceleration story." : "Keep timing measured and subordinate to comprehension."],
          continuity: treatment.grammar.transitions.slice(0, 32),
        },
        sound: treatment.grammar.sound.slice(0, 32),
        interactionNotes: treatment.grammar.interaction.slice(0, 32),
        transitionNotes: treatment.grammar.transitions.slice(0, 32),
        assetRequirements: treatment.assets
          .filter((asset) => asset.productionDecision === "use" || asset.productionDecision === "upgrade" || asset.productionDecision === "create")
          .slice(0, 12)
          .map((asset) => `${asset.label}: ${asset.productionDecision} — ${asset.role}`.slice(0, 300)),
        implementationNotes: [
          `Intensity target: ${beat.intensity}/10.`,
          `Information density: ${beat.informationDensity}/10.`,
          `Interaction level: ${beat.interactionLevel}/10.`,
          ...(signature ? [`Protected signature moment: ${treatment.signatureMoment.name}.`] : []),
        ],
        mobileNotes: treatment.mobileInterpretation.slice(0, 32),
        negativeDirectives: treatment.noGoRules.slice(0, 32),
      },
      runtime: {
        motionPreset: runtimePreset,
        ...(runtimeArchetype ? { motionArchetype: runtimeArchetype } : {}),
        actions: [],
      },
    };
  });

  const creativePlan = parseCreativePlan({
    version: 1,
    conceptId: slug(`${treatment.projectName}-${selected.id}`),
    concept: treatment.thesis,
    audience: treatment.audience,
    promise: selected.oneLine,
    emotionalArc: treatment.emotionalArc.map((beat) => beat.emotion),
    cta: treatment.primaryAction,
    visual: {
      palette: [treatment.artBible.paletteLogic],
      typography: treatment.grammar.typography,
      materials: treatment.grammar.materials,
      motion: treatment.grammar.motion,
      sound: treatment.grammar.sound,
    },
    artDirection: {
      northStar: treatment.artBible.northStar,
      hierarchy: [
        "Thesis before feature volume.",
        "One primary subject per frame.",
        `Protect ${treatment.signatureMoment.name} as the highest-intensity moment.`,
      ],
      compositionRules: treatment.grammar.composition.slice(0, 32),
      cameraLanguage: treatment.grammar.camera.slice(0, 32),
      lightingLanguage: treatment.grammar.lighting.slice(0, 32),
      materialLanguage: treatment.grammar.materials.slice(0, 32),
      motionLanguage: treatment.grammar.motion.slice(0, 32),
      transitionLanguage: treatment.grammar.transitions.slice(0, 32),
      interactionLanguage: treatment.grammar.interaction.slice(0, 32),
      soundLanguage: treatment.grammar.sound.slice(0, 32),
      spatialRules: treatment.grammar.spatial.slice(0, 32),
      continuityRules: [
        "Carry a meaningful visual or spatial anchor across major transitions.",
        "Do not introduce a new motion grammar without an emotional-state reason.",
      ],
      realismRules: [
        "Physical subjects should preserve believable scale, light response and camera behavior.",
        "Stylization must be consistent with the locked thesis rather than arbitrary spectacle.",
      ],
      assetRules: treatment.assets.slice(0, 32).map((asset) => `${asset.label}: ${asset.productionDecision} (${asset.quality})`.slice(0, 300)),
      typographyRules: treatment.grammar.typography.slice(0, 32),
      colorRules: treatment.grammar.color.slice(0, 32),
      mobileRules: treatment.mobileInterpretation.slice(0, 32),
      performanceRules: [
        "Spend performance budget on the signature moment and hero assets before decorative effects.",
        "Use progressive enhancement for optional immersive systems.",
      ],
      accessibilityRules: [
        "Narrative meaning must remain available with reduced motion.",
        "Primary navigation and conversion controls must remain keyboard-operable and legible.",
      ],
      forbiddenPatterns: treatment.noGoRules.slice(0, 32),
    },
    constraints: {
      approved: [
        treatment.thesis,
        treatment.signatureMoment.description,
        ...treatment.productionPriorities,
      ],
      prohibited: treatment.noGoRules,
    },
    scenes,
    successEvent: `director-${slug(treatment.projectName)}-conversion`,
  });

  provenance.concept = "director.thesis";
  provenance.artDirection = "director.artBible + director.grammar";
  provenance.scenes = "director.emotionalArc + director.shotBible";
  return { treatment, creativePlan, provenance };
}

function presetForIntensity(intensity: number): CreativeMotionPreset {
  return presetByIntensity.find(([minimum]) => intensity >= minimum)?.[1] ?? "light-pulse";
}

function copyForBeat(treatment: DirectorTreatment, beat: DirectorTreatment["emotionalArc"][number], index: number) {
  if (index === 0) return treatment.thesis.slice(0, 120);
  if (beat.intensity >= 9) return treatment.signatureMoment.name.slice(0, 120);
  if (index === treatment.emotionalArc.length - 1) return treatment.primaryAction.slice(0, 120);
  return beat.label.slice(0, 120);
}

function interactionForBeat(treatment: DirectorTreatment, beat: DirectorTreatment["emotionalArc"][number]) {
  if (beat.intensity >= 9) return `Directed signature sequence. Visitor control is secondary to ${treatment.signatureMoment.name}.`.slice(0, 240);
  if (beat.interactionLevel >= 5) return "Allow purposeful visitor exploration without losing narrative position.";
  return "Primarily directed presentation; keep interaction lightweight and optional.";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "director";
}
