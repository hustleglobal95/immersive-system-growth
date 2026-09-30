import { parseExperience, sceneMediaSchema } from "@/src/lib/configSchema";
import { createExperienceEngine } from "@/src/platform/createExperienceEngine";
import { compileInteractive3DBlueprint } from "@/src/platform/interactive3dCompiler";
import { cameraChoreographyForBlueprintMove } from "@/src/platform/interactive3dRecipeRegistry";
import type { Interactive3DBlueprint, Interactive3DScene } from "@/src/platform/interactive3dBlueprint";
import type { MotionArchetypeName } from "@/src/platform/motionArchetypes";
import type { ExperienceConfig } from "@/src/types/experience";

export interface Interactive3DMaterialization {
  experience: ExperienceConfig;
  appliedCommands: Array<{ type: string; input: unknown }>;
  fingerprintBefore: string;
  fingerprintAfter: string;
  assetReadiness: {
    ready: boolean;
    blockers: string[];
  };
}

export function materializeInteractive3DExperience(input: {
  blueprint: Interactive3DBlueprint;
  experience: unknown;
}): Interactive3DMaterialization {
  const plan = compileInteractive3DBlueprint(input.blueprint);
  const source = parseExperience(input.experience);
  const baseIds = source.scenes.map((scene) => scene.id);
  const blueprintIds = plan.scenes.map((scene) => scene.id);
  if (JSON.stringify(baseIds) !== JSON.stringify(blueprintIds)) {
    throw new Error("Interactive 3D materialization requires blueprint scene IDs to match the template ExperienceConfig exactly.");
  }

  const next = structuredClone(source);
  const palette = input.blueprint.artDirection.palette;
  next.meta = {
    name: input.blueprint.project.name.slice(0, 100),
    description: bounded(input.blueprint.experience.thesis + " " + input.blueprint.experience.visualWorld, 500),
    themeColor: palette.accent,
    backgroundColor: palette.background,
  };
  next.runtime = {
    ...next.runtime,
    pointerInfluence: input.blueprint.experience.scenes.some((scene) => ["pointer","drag","mixed"].includes(scene.interaction.input))
      ? Math.max(0.04, Math.min(0.12, next.runtime.pointerInfluence || 0.08))
      : Math.min(0.04, next.runtime.pointerInfluence),
    maxPixels: Math.min(next.runtime.maxPixels, 4_000_000),
    preloadMb: Math.max(1, Math.min(100, input.blueprint.performance.initialCriticalMb)),
  };
  next.stage = "minimal";
  next.hotspots = [];
  next.productRig = undefined;
  next.conversion = undefined;
  next.assets = [];
  next.heroLowModel = undefined;

  const heroModel = input.blueprint.assets.find(
    (asset) => asset.heroCandidate && asset.type === "model" && asset.status === "existing" && asset.source,
  );
  const heroVisual = input.blueprint.assets.find(
    (asset) => asset.heroCandidate && ["image","video"].includes(asset.type) && asset.status === "existing" && asset.source,
  );
  const supportVisuals = input.blueprint.assets.filter(
    (asset) => !asset.heroCandidate && ["image","video"].includes(asset.type) && asset.status === "existing" && asset.source,
  );

  const persistentProductHero =
    input.blueprint.experience.archetype === "product-reveal" ||
    input.blueprint.experience.archetype === "configurator";
  if (heroModel?.source && persistentProductHero) {
    next.heroModel = heroModel.source;
    next.heroVisible = true;
  } else if (heroModel?.source) {
    next.heroModel = "";
    next.heroVisible = false;
    next.assets.push({
      id: heroModel.id,
      kind: "model",
      url: heroModel.source,
      scenes: [...blueprintIds],
      persist: true,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
    });
  } else {
    next.heroModel = "";
    next.heroVisible = false;
  }

  const ranges = generatedRanges(blueprintIds, plan.signatureSlice.sceneId);
  const desktopCameras = generatedCameraSequence(input.blueprint, false);
  const mobileCameras = generatedCameraSequence(input.blueprint, true);
  for (let index = 0; index < next.scenes.length; index++) {
    const scene = next.scenes[index];
    const direction = input.blueprint.experience.scenes[index];
    scene.label = bounded(direction.label, 80);
    scene.range = ranges[index];
    scene.easing = "cinematic";
    scene.camera = desktopCameras[index];
    scene.mobileCamera = mobileCameras[index];
    scene.blocks = [];
    scene.motionTracks = [];
    scene.hero = {
      motion: "linear",
      from: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
      to: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    };
    scene.copy = {
      eyebrow: direction.copy?.eyebrow ?? bounded(input.blueprint.project.name.toUpperCase(), 100),
      headline: direction.copy?.headline ?? bounded(direction.label, 120),
      body: direction.copy?.body ?? bounded(direction.purpose, 800),
      align: compositionAlign(index, direction.depthStrategy),
    };
    const light = generatedLighting(input.blueprint, index, scene.id === plan.signatureSlice.sceneId);
    scene.world = {
      background: palette.background,
      fog: palette.fog,
      fogDensity: light.fogDensity,
      ambient: light.ambient,
      key: light.key,
      rim: light.rim,
      keyColor: palette.foreground,
      rimColor: palette.accent,
      exposure: light.exposure,
    };
    scene.post = {
      bloom: light.bloom,
      vignette: light.vignette,
    };
    scene.material = {
      tint: palette.foreground,
      tintStrength: 0,
      metalness: null,
      roughness: null,
      clearcoat: null,
    };
    const visual = scene.id === plan.signatureSlice.sceneId
      ? undefined
      : supportVisuals[index % Math.max(1, supportVisuals.length)];
    const signatureVisual = scene.id === plan.signatureSlice.sceneId ? heroVisual : undefined;
    const assigned = signatureVisual ?? visual;
    if (assigned?.source) {
      scene.media = sceneMediaSchema.parse({
        kind: assigned.type === "video" ? "video" : "image",
        src: assigned.source,
        ...(assigned.type === "video" ? { poster: supportVisuals.find((asset) => asset.type === "image")?.source ?? assigned.source } : {}),
        alt: bounded(direction.dominantSubject, 300),
        transition: direction.depthStrategy === "layered-dom" ? "mask" : "dissolve",
        position: [50, 50],
        mobilePosition: [50, 50],
        layers: [],
      });
    } else {
      scene.media = sceneMediaSchema.parse({
        kind: "color",
        fill: palette.background,
        alt: bounded(direction.dominantSubject, 300),
        transition: "dissolve",
        layers: [],
      });
    }
  }

  let candidate = parseExperience(next);
  const engine = createExperienceEngine(candidate);
  const commands: Array<{ type: string; input: unknown }> = [];
  for (const scene of plan.scenes) {
    const choreography = cameraChoreographyForBlueprintMove(scene.camera.move);
    if (choreography) {
      commands.push({ type: "camera.applyChoreography", input: { sceneId: scene.id, choreography } });
    }
  }
  commands.push({
    type: "motion.applyArchetype",
    input: {
      sceneId: plan.signatureSlice.sceneId,
      archetype: motionArchetypeFor(input.blueprint),
    },
  });
  const result = engine.transactionRegistered(commands, {
    source: "ai",
    transactionId: "interactive3d-materialize-" + plan.signatureSlice.sceneId,
  });
  if (!result.ok) {
    throw new Error("Forge command materialization failed: " + result.errors.map((error) => error.message).join("; "));
  }
  candidate = parseExperience(result.state);
  const blockers = input.blueprint.assets
    .filter((asset) => asset.heroCandidate && asset.status !== "existing")
    .map((asset) => "Signature hero asset is not production-ready: " + asset.label + " (" + asset.status + ").");
  return {
    experience: candidate,
    appliedCommands: commands,
    fingerprintBefore: result.fingerprintBefore,
    fingerprintAfter: result.fingerprintAfter,
    assetReadiness: { ready: blockers.length === 0, blockers },
  };
}

type ExperienceCamera = ExperienceConfig["scenes"][number]["camera"];
type ExperienceCameraState = ExperienceCamera["from"];

function generatedLighting(
  blueprint: Interactive3DBlueprint,
  index: number,
  signature: boolean,
) {
  const spatial = blueprint.experience.archetype === "spatial-story" || blueprint.experience.archetype === "world-explorer";
  const product = blueprint.experience.archetype === "product-reveal" || blueprint.experience.archetype === "configurator";
  const pulse = Math.sin((index + 1) * 1.37) * 0.08;
  return {
    fogDensity: spatial ? 0.0075 : product ? 0.012 : 0.005,
    ambient: roundCamera((spatial ? 0.72 : product ? 0.58 : 0.68) + pulse),
    key: roundCamera((signature ? 3.6 : product ? 2.8 : 2.45) + pulse * 3),
    rim: roundCamera(signature ? 2.1 : product ? 1.45 : 1.1),
    exposure: roundCamera(signature ? 1.04 : 1),
    bloom: roundCamera(signature ? 0.12 : product ? 0.055 : 0.035),
    vignette: roundCamera(signature ? 0.18 : 0.12),
  };
}

function generatedRanges(
  sceneIds: string[],
  signatureSceneId: string,
): Array<[number, number]> {
  const weights = sceneIds.map((sceneId, index) =>
    sceneId === signatureSceneId ? 1.35 : index === 0 || index === sceneIds.length - 1 ? 1.08 : 1,
  );
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  return weights.map((weight, index) => {
    const start = cursor / total;
    cursor += weight;
    const end = index === weights.length - 1 ? 1 : cursor / total;
    return [roundRange(start), roundRange(end)];
  });
}

function generatedCameraSequence(
  blueprint: Interactive3DBlueprint,
  mobile: boolean,
): ExperienceCamera[] {
  const scenes = blueprint.experience.scenes;
  const count = scenes.length;
  const states: ExperienceCameraState[] = [
    generatedCameraState(blueprint.experience.archetype, 0, mobile),
  ];
  for (let index = 0; index < count; index++) {
    states.push(
      scenes[index].camera.move === "static"
        ? states[index]
        : generatedCameraState(
            blueprint.experience.archetype,
            (index + 1) / Math.max(1, count),
            mobile,
          ),
    );
  }
  return scenes.map((scene, index) => ({
    path: cameraPathForMove(scene.camera.move),
    from: states[index],
    to: states[index + 1],
  }));
}

function generatedCameraState(
  archetype: Interactive3DBlueprint["experience"]["archetype"],
  progress: number,
  mobile: boolean,
): ExperienceCameraState {
  const t = Math.max(0, Math.min(1, progress));
  const productLike = archetype === "product-reveal" || archetype === "configurator";
  const spatial = archetype === "spatial-story" || archetype === "world-explorer";
  let position: [number, number, number];
  let target: [number, number, number];
  let fov: number;

  if (productLike) {
    const angle = -0.55 + t * 1.1;
    const radius = 6.2 - Math.sin(Math.PI * t) * 2;
    position = [Math.sin(angle) * radius, 1.15 + Math.sin(Math.PI * t) * 0.55, Math.cos(angle) * radius];
    target = [0, 0.12, 0];
    fov = 43 - Math.sin(Math.PI * t) * 8;
  } else if (spatial) {
    const angle = -0.7 + t * 1.45;
    const radius = 7.6 - Math.sin(Math.PI * t) * 2.4;
    position = [Math.sin(angle) * radius, 1.65 + Math.sin(Math.PI * t) * 1.15, Math.cos(angle) * radius];
    target = [0, 0.45 + Math.sin(Math.PI * t) * 0.2, 0];
    fov = 50 - Math.sin(Math.PI * t) * 6;
  } else {
    const lateral = Math.sin(t * Math.PI * 2) * 1.35;
    position = [lateral, 0.7 + Math.sin(Math.PI * t) * 0.45, 6.2 - Math.sin(Math.PI * t) * 0.8];
    target = [0, 0.15, 0];
    fov = 47 - Math.sin(Math.PI * t) * 4;
  }

  if (mobile) {
    position = [position[0] * 0.58, position[1] + 0.35, position[2] * 1.28];
    fov = Math.min(72, fov + 12);
  }
  return {
    position: position.map(roundCamera) as [number, number, number],
    target: target.map(roundCamera) as [number, number, number],
    fov: roundCamera(fov),
  };
}

function cameraPathForMove(move: Interactive3DScene["camera"]["move"]): ExperienceCamera["path"] {
  switch (move) {
    case "dolly": return "dolly";
    case "truck": return "linear";
    case "crane": return "crane";
    case "orbit": return "orbit";
    case "macro": return "macro";
    case "reveal": return "pullback";
    case "static": return "linear";
    case "custom": return "linear";
  }
}

function roundCamera(value: number) {
  return Math.round(value * 10_000) / 10_000;
}
function roundRange(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function motionArchetypeFor(blueprint: Interactive3DBlueprint): MotionArchetypeName {
  if (blueprint.experience.archetype === "product-reveal" || blueprint.experience.archetype === "configurator") return "product-hero";
  if (blueprint.experience.archetype === "spatial-story" || blueprint.experience.archetype === "world-explorer") {
    return blueprint.project.projectType === "property" ? "architectural-build" : "threshold-passage";
  }
  if (blueprint.experience.archetype === "interactive-gallery") return "parallax-story";
  return "editorial-reveal";
}
function compositionAlign(index: number, depth: Interactive3DBlueprint["experience"]["scenes"][number]["depthStrategy"]) {
  if (depth === "full-3d" || depth === "material") return index % 2 ? "right" as const : "left" as const;
  return index % 3 === 2 ? "center" as const : "left" as const;
}
function bounded(value: string, max: number) {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  return clean.slice(0, max) || "Interactive 3D chapter";
}
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
