import { parseExperience } from "@/src/lib/configSchema";
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

  if (heroModel?.source) {
    next.heroModel = heroModel.source;
    next.heroVisible = true;
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
    scene.blocks = [];
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
    const visual = index === plan.signatureSlice.sceneId
      ? undefined
      : supportVisuals[index % Math.max(1, supportVisuals.length)];
    const signatureVisual = scene.id === plan.signatureSlice.sceneId ? heroVisual : undefined;
    const assigned = signatureVisual ?? visual;
    if (assigned?.source) {
      scene.media = {
        kind: assigned.type === "video" ? "video" : "image",
        src: assigned.source,
        ...(assigned.type === "video" ? { poster: supportVisuals.find((asset) => asset.type === "image")?.source ?? assigned.source } : {}),
        alt: bounded(direction.dominantSubject, 300),
        transition: direction.depthStrategy === "layered-dom" ? "mask" : "dissolve",
        position: [50, 50],
        mobilePosition: [50, 50],
        layers: [],
      };
    } else {
      scene.media = {
        kind: "color",
        fill: palette.background,
        alt: bounded(direction.dominantSubject, 300),
        transition: "dissolve",
        layers: [],
      };
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
