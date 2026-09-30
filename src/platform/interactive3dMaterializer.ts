import { parseExperience, sceneMediaSchema } from "@/src/lib/configSchema";
import { createExperienceEngine } from "@/src/platform/createExperienceEngine";
import { compileInteractive3DBlueprint } from "@/src/platform/interactive3dCompiler";
import { cameraChoreographyForBlueprintMove } from "@/src/platform/interactive3dRecipeRegistry";
import type { Interactive3DBlueprint } from "@/src/platform/interactive3dBlueprint";
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

  for (let index = 0; index < next.scenes.length; index++) {
    const scene = next.scenes[index];
    const direction = input.blueprint.experience.scenes[index];
    scene.label = bounded(direction.label, 80);
    scene.range = generatedRange(index, next.scenes.length, plan.signatureSlice.sceneId, scene.id);
    scene.easing = "cinematic";
    scene.camera = generatedCamera(input.blueprint, direction.camera.move, index, next.scenes.length, false);
    scene.mobileCamera = generatedCamera(input.blueprint, direction.camera.move, index, next.scenes.length, true);
    scene.blocks = [];
    scene.motionTracks = [];
    scene.hero = {
      motion: "linear",
      from: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
      to: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    };
    scene.copy = {
      eyebrow: bounded(input.blueprint.project.name.toUpperCase(), 100),
      headline: bounded(direction.label, 120),
      body: bounded(direction.purpose, 800),
      align: compositionAlign(index, direction.depthStrategy),
    };
    scene.world = {
      ...scene.world,
      background: palette.background,
      fog: palette.fog,
      keyColor: palette.foreground,
      rimColor: palette.accent,
      ambient: clamp(scene.world.ambient, 0.35, 2.2),
      key: clamp(scene.world.key, 1.2, 8),
      rim: clamp(scene.world.rim, 0.5, 7),
      exposure: clamp(scene.world.exposure, 0.75, 1.25),
    };
    scene.post = {
      bloom: Math.min(scene.post.bloom, 0.28),
      vignette: clamp(scene.post.vignette, 0.08, 0.32),
    };
    scene.material = {
      ...scene.material,
      tint: palette.foreground,
      tintStrength: Math.min(scene.material.tintStrength, 0.12),
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

function generatedRange(
  index: number,
  count: number,
  signatureSceneId: string,
  sceneId: string,
): [number, number] {
  const weights = Array.from({ length: count }, (_, current) =>
    current === indexOfSignature(count, signatureSceneId, sceneId, index) ? 1.35 : current === 0 || current === count - 1 ? 1.08 : 1,
  );
  // The signature identity is only known for the current scene in this pure helper; replace the
  // current weight when this scene is the signature, while keeping all other chapters neutral.
  if (sceneId === signatureSceneId) weights[index] = 1.35;
  else weights[index] = index === 0 || index === count - 1 ? 1.08 : 1;
  const total = weights.reduce((sum, value) => sum + value, 0);
  const start = weights.slice(0, index).reduce((sum, value) => sum + value, 0) / total;
  const end = (weights.slice(0, index + 1).reduce((sum, value) => sum + value, 0)) / total;
  return [roundRange(start), roundRange(index === count - 1 ? 1 : end)];
}

function indexOfSignature(count: number, signatureSceneId: string, sceneId: string, index: number) {
  void count;
  return sceneId === signatureSceneId ? index : -1;
}

function generatedCamera(
  blueprint: Interactive3DBlueprint,
  move: Interactive3DScene["camera"]["move"],
  index: number,
  count: number,
  mobile: boolean,
): ExperienceCamera {
  const from = generatedCameraState(blueprint.experience.archetype, index / Math.max(1, count), mobile);
  const to = generatedCameraState(blueprint.experience.archetype, (index + 1) / Math.max(1, count), mobile);
  return {
    path: cameraPathForMove(move),
    from,
    to,
  };
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
