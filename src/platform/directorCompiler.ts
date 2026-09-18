import { parseCreativePlan, type CreativePlan, type CreativeMotionArchetype, type CreativeMotionPreset } from "@/src/platform/creativePlanSchema";
import { parseDirectorTreatment, type DirectorTreatment } from "@/src/platform/directorSchema";
import { buildConstructionDirectives } from "@/src/platform/director-intelligence/constructionKnowledge";

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
  const construction = buildConstructionDirectives(treatment);

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
        composition: directiveList(treatment.grammar.composition, construction.compositionRules.slice(0, 4)),
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
          subject: directiveList(treatment.grammar.motion, construction.motionRules.slice(0, 4)),
          environment: treatment.grammar.spatial.slice(0, 32),
          assembly: signature ? [treatment.signatureMoment.description.slice(0, 300)] : [],
          easing: [beat.intensity >= 8 ? "Use deliberate timing with a clear acceleration/deceleration story." : "Keep timing measured and subordinate to comprehension."],
          continuity: directiveList(treatment.grammar.transitions, construction.transitionRules.slice(0, 4)),
        },
        sound: treatment.grammar.sound.slice(0, 32),
        interactionNotes: directiveList(treatment.grammar.interaction, construction.interactionRules.slice(0, 4)),
        transitionNotes: directiveList(treatment.grammar.transitions, construction.transitionRules.slice(0, 4)),
        assetRequirements: treatment.assets
          .filter((asset) => asset.productionDecision === "use" || asset.productionDecision === "upgrade" || asset.productionDecision === "create")
          .slice(0, 12)
          .map((asset) => `${asset.label}: ${asset.productionDecision} — ${asset.role}`.slice(0, 300)),
        implementationNotes: directiveList(
          [
            `Intensity target: ${beat.intensity}/10.`,
            `Information density: ${beat.informationDensity}/10.`,
            `Interaction level: ${beat.interactionLevel}/10.`,
            `Construction patterns: ${construction.patternIds.join(", ")}.`,
            ...(signature ? [`Protected signature moment: ${treatment.signatureMoment.name}.`] : []),
          ],
          construction.implementationRules.slice(0, 6),
        ),
        mobileNotes: directiveList(treatment.mobileInterpretation, construction.mobileRules.slice(0, 5)),
        negativeDirectives: directiveList(treatment.noGoRules, construction.forbiddenPatterns.slice(0, 6)),
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
      compositionRules: directiveList(treatment.grammar.composition, construction.compositionRules),
      cameraLanguage: treatment.grammar.camera.slice(0, 32),
      lightingLanguage: treatment.grammar.lighting.slice(0, 32),
      materialLanguage: treatment.grammar.materials.slice(0, 32),
      motionLanguage: directiveList(treatment.grammar.motion, construction.motionRules),
      transitionLanguage: directiveList(treatment.grammar.transitions, construction.transitionRules),
      interactionLanguage: directiveList(treatment.grammar.interaction, construction.interactionRules),
      soundLanguage: treatment.grammar.sound.slice(0, 32),
      spatialRules: treatment.grammar.spatial.slice(0, 32),
      continuityRules: directiveList(
        [
          "Carry a meaningful visual or spatial anchor across major transitions.",
          "Do not introduce a new motion grammar without an emotional-state reason.",
        ],
        construction.transitionRules,
      ),
      realismRules: [
        "Physical subjects should preserve believable scale, light response and camera behavior.",
        "Stylization must be consistent with the locked thesis rather than arbitrary spectacle.",
      ],
      assetRules: treatment.assets.slice(0, 32).map((asset) => `${asset.label}: ${asset.productionDecision} (${asset.quality})`.slice(0, 300)),
      typographyRules: treatment.grammar.typography.slice(0, 32),
      colorRules: treatment.grammar.color.slice(0, 32),
      mobileRules: directiveList(treatment.mobileInterpretation, construction.mobileRules),
      performanceRules: directiveList(
        [
          "Spend performance budget on the signature moment and hero assets before decorative effects.",
          "Use progressive enhancement for optional immersive systems.",
        ],
        construction.patternIds.includes("prewarm-signature-systems")
          ? ["Prewarm signature visual states before first scroll and compare cold-scroll against warm-scroll before calling the experience smooth."]
          : [],
      ),
      accessibilityRules: [
        "Narrative meaning must remain available with reduced motion.",
        "Primary navigation and conversion controls must remain keyboard-operable and legible.",
      ],
      forbiddenPatterns: directiveList(treatment.noGoRules, construction.forbiddenPatterns),
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
  provenance.construction = "director-intelligence.constructionKnowledge";
  return { treatment, creativePlan, provenance };
}

function directiveList(...groups: string[][]) {
  const values = groups.flat().map((value) => value.slice(0, 300));
  return values.filter((value, index) => value && values.indexOf(value) === index).slice(0, 32);
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
