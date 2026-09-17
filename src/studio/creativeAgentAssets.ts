import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export type AgentExecutionMedium = "depth-image" | "real-3d" | "hybrid" | "cinematic-dom";
export type AgentAssetType = "model" | "image" | "video" | "texture" | "hdri" | "audio" | "ui" | "copy";
export type AgentAssetPriority = "hero-critical" | "signature-critical" | "supporting" | "optional";
export type AgentSceneRole = "establish" | "build" | "reveal" | "threshold" | "proof" | "resolve";

export interface AgentSceneAssetItem {
  name: string;
  type: AgentAssetType;
  reason: string;
  priority: AgentAssetPriority;
}

export interface AgentSceneAssetPlan {
  sceneIndex: number;
  sceneId: string;
  sceneLabel: string;
  executionMedium: AgentExecutionMedium;
  existingAssets: string[];
  reusableAssets: string[];
  assetsToCreate: AgentSceneAssetItem[];
  optionalAssets: AgentSceneAssetItem[];
  blockers: string[];
  productionNotes: string[];
  canBuildNow: boolean;
}

export interface AgentAssetPlanSummary {
  totalExistingAssetsUsed: number;
  totalReusableAssets: number;
  totalAssetsToCreate: number;
  criticalMissingAssets: string[];
  highestLeverageAssetToCreateFirst?: string;
  scenesBuildableNow: string[];
  blockedScenes: string[];
}

export interface AgentAssetPlanValidation {
  valid: boolean;
  errors: string[];
}

interface SceneAssetPlanInput {
  sceneIndex: number;
  label: string;
  role: AgentSceneRole;
  archetype: string;
}

export function buildSceneAssetPlans(input: {
  experience: ExperienceConfig;
  manifest: AssetManifest;
  scenes: SceneAssetPlanInput[];
  globalMedium: AgentExecutionMedium;
  idea: string;
  signatureMoment: string;
}): AgentSceneAssetPlan[] {
  return input.scenes.map((move) => buildSceneAssetPlan({ ...input, move }));
}

export function buildAssetPlanSummary(plans: AgentSceneAssetPlan[]): AgentAssetPlanSummary {
  const existing = unique(plans.flatMap((plan) => plan.existingAssets));
  const reusable = unique(plans.flatMap((plan) => plan.reusableAssets));
  const required = plans.flatMap((plan) => plan.assetsToCreate);
  const critical = required.filter((asset) => asset.priority === "hero-critical" || asset.priority === "signature-critical");
  const leverage = [...critical, ...required].sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))[0];

  return {
    totalExistingAssetsUsed: existing.length,
    totalReusableAssets: reusable.length,
    totalAssetsToCreate: required.length,
    criticalMissingAssets: unique(critical.map((asset) => asset.name)),
    highestLeverageAssetToCreateFirst: leverage?.name,
    scenesBuildableNow: plans.filter((plan) => plan.canBuildNow).map((plan) => plan.sceneLabel),
    blockedScenes: plans.filter((plan) => !plan.canBuildNow).map((plan) => plan.sceneLabel),
  };
}

export function validateSceneAssetPlans(plans: AgentSceneAssetPlan[], summary: AgentAssetPlanSummary): AgentAssetPlanValidation {
  const errors: string[] = [];
  if (!plans.length) errors.push("Creative Agent must produce at least one scene asset plan.");

  for (const plan of plans) {
    if (!plan.executionMedium) errors.push(`${plan.sceneLabel}: execution medium is missing.`);
    if (!plan.productionNotes.length) errors.push(`${plan.sceneLabel}: production notes are missing.`);
    for (const asset of plan.assetsToCreate) {
      if (!asset.name.trim()) errors.push(`${plan.sceneLabel}: an asset-to-create is missing a name.`);
      if (!asset.reason.trim()) errors.push(`${plan.sceneLabel}: ${asset.name || "asset"} is missing a reason.`);
      if (!asset.priority) errors.push(`${plan.sceneLabel}: ${asset.name || "asset"} is missing priority.`);
    }
    if (plan.blockers.length && plan.canBuildNow) errors.push(`${plan.sceneLabel}: blocked scene cannot be marked buildable now.`);
  }

  const expectedBlocked = plans.filter((plan) => !plan.canBuildNow).length;
  const expectedBuildable = plans.filter((plan) => plan.canBuildNow).length;
  if (summary.blockedScenes.length !== expectedBlocked) errors.push("Asset summary blocked-scene count does not match scene plans.");
  if (summary.scenesBuildableNow.length !== expectedBuildable) errors.push("Asset summary buildable-scene count does not match scene plans.");

  return { valid: errors.length === 0, errors };
}

function buildSceneAssetPlan(input: {
  experience: ExperienceConfig;
  manifest: AssetManifest;
  move: SceneAssetPlanInput;
  globalMedium: AgentExecutionMedium;
  idea: string;
  signatureMoment: string;
}): AgentSceneAssetPlan {
  const { experience, manifest, move, globalMedium, idea, signatureMoment } = input;
  const scene = experience.scenes[move.sceneIndex];
  const hasRig = Boolean(experience.productRig?.nodes.length);
  const executionMedium = chooseSceneMedium(globalMedium, move.role, manifest, hasRig);
  const keywords = keywordSet(`${idea} ${move.label} ${scene.copy.headline} ${scene.copy.body}`);
  const rankedModels = rankEntries(manifest.models, keywords);
  const rankedTextures = rankEntries(manifest.textures, keywords);
  const rankedHdr = rankEntries(manifest.hdr, keywords);
  const rankedVideo = rankEntries(manifest.video, keywords);
  const existingAssets = selectExistingAssets(executionMedium, rankedModels, rankedTextures, rankedHdr, rankedVideo);
  const reusableAssets = selectReusableAssets(executionMedium, rankedModels, rankedTextures, rankedHdr, rankedVideo, existingAssets);
  const assetsToCreate: AgentSceneAssetItem[] = [];
  const optionalAssets: AgentSceneAssetItem[] = [];
  const blockers: string[] = [];
  const signature = move.role === "reveal" || move.role === "threshold";
  const criticalPriority: AgentAssetPriority = signature ? "signature-critical" : "hero-critical";

  if (executionMedium === "real-3d") {
    if (!rankedModels.length && !hasRig) {
      const name = `${slug(move.label)}-hero-environment.glb`;
      assetsToCreate.push(asset(name, "model", "Real camera travel needs geometry that can survive viewpoint change, lighting and occlusion.", criticalPriority));
      blockers.push("No registered model or semantic rig can support the proposed real-3D camera move.");
    }
    if (!rankedHdr.length) assetsToCreate.push(asset(`${slug(move.label)}-lighting.hdr`, "hdri", "A controlled environment map is needed for credible material response and consistent scene lighting.", "supporting"));
    optionalAssets.push(asset(`${slug(move.label)}-detail-texture.webp`, "texture", "Add a scene-specific material/detail pass only if the hero geometry looks too generic at close range.", "optional"));
  }

  if (executionMedium === "depth-image") {
    if (!rankedTextures.length) {
      const name = `${slug(move.label)}-hero-source.webp`;
      assetsToCreate.push(asset(name, "image", "Image-depth execution needs one strong source image with clean foreground, midground and background separation.", criticalPriority));
      assetsToCreate.push(asset(`${slug(move.label)}-depth.webp`, "texture", "The depth map drives mesh displacement and camera parallax for the 2.5D illusion.", criticalPriority));
      blockers.push("No registered image/texture can serve as the depth source.");
    } else {
      assetsToCreate.push(asset(`${slug(move.label)}-depth.webp`, "texture", "Generate a depth map from the selected source image before authoring camera travel.", signature ? "signature-critical" : "supporting"));
    }
    optionalAssets.push(asset(`${slug(move.label)}-foreground-mask.webp`, "texture", "A clean foreground mask improves difficult silhouettes and reduces depth-edge tearing.", "optional"));
  }

  if (executionMedium === "hybrid") {
    if (!rankedModels.length && !hasRig) {
      assetsToCreate.push(asset(`${slug(move.label)}-hero-object.glb`, "model", "Hybrid execution still needs real geometry for the object or threshold that must hold up under viewpoint change.", criticalPriority));
      blockers.push("Hybrid plan is missing the real-geometry anchor.");
    }
    if (!rankedTextures.length) {
      assetsToCreate.push(asset(`${slug(move.label)}-environment-plate.webp`, "image", "A high-quality environment plate carries atmosphere and scale without modeling the full world.", criticalPriority));
      blockers.push("Hybrid plan is missing the image/depth environment source.");
    }
    assetsToCreate.push(asset(`${slug(move.label)}-depth.webp`, "texture", "Create depth for the environment plate so the 2.5D layer can match the real geometry camera move.", "supporting"));
    optionalAssets.push(asset(`${slug(move.label)}-transition-matte.webp`, "texture", "Use a transition matte only if the image-to-geometry handoff needs extra concealment.", "optional"));
  }

  if (executionMedium === "cinematic-dom") {
    if (!rankedTextures.length && !rankedVideo.length) {
      optionalAssets.push(asset(`${slug(move.label)}-editorial-plate.webp`, "image", "One authored visual plate would raise the scene above pure typography without forcing a WebGL dependency.", "optional"));
    } else {
      optionalAssets.push(asset(`${slug(move.label)}-mask-field.webp`, "texture", "A restrained mask/reveal texture can create a signature transition without increasing 3D cost.", "optional"));
    }
  }

  if (move.role === "resolve") {
    optionalAssets.push(asset(`${slug(move.label)}-ambient-loop.mp3`, "audio", "A subtle resolved-state ambience can carry the emotional tail without adding visual complexity.", "optional"));
  }

  const cheapest = cheapestVersion(executionMedium, rankedModels.length > 0 || hasRig, rankedTextures.length > 0);
  const best = bestVersion(executionMedium, signatureMoment);
  const productionNotes = [
    `Cheapest acceptable: ${cheapest}`,
    `Best version: ${best}`,
    blockers.length ? "Do not fake missing critical assets; keep this scene flagged until the blockers are resolved." : "This scene can be built now with the registered asset set; new assets are refinement, not a prerequisite.",
  ];

  return {
    sceneIndex: move.sceneIndex,
    sceneId: scene.id,
    sceneLabel: move.label,
    executionMedium,
    existingAssets,
    reusableAssets,
    assetsToCreate,
    optionalAssets,
    blockers,
    productionNotes,
    canBuildNow: blockers.length === 0,
  };
}

function chooseSceneMedium(globalMedium: AgentExecutionMedium, role: AgentSceneRole, manifest: AssetManifest, hasRig: boolean): AgentExecutionMedium {
  if (role === "establish" && globalMedium === "hybrid" && manifest.textures.length) return "depth-image";
  if (role === "resolve" && globalMedium !== "real-3d") return "cinematic-dom";
  if (role === "resolve" && globalMedium === "real-3d" && !manifest.models.length && !hasRig) return "cinematic-dom";
  return globalMedium;
}

function selectExistingAssets(
  medium: AgentExecutionMedium,
  models: AssetManifestEntry[],
  textures: AssetManifestEntry[],
  hdr: AssetManifestEntry[],
  video: AssetManifestEntry[],
) {
  const selected: string[] = [];
  if (medium === "real-3d" || medium === "hybrid") selected.push(...models.slice(0, 2).map((entry) => entry.path));
  if (medium === "depth-image" || medium === "hybrid" || medium === "cinematic-dom") selected.push(...textures.slice(0, 2).map((entry) => entry.path));
  if (medium === "real-3d" || medium === "hybrid") selected.push(...hdr.slice(0, 1).map((entry) => entry.path));
  if (medium === "cinematic-dom") selected.push(...video.slice(0, 1).map((entry) => entry.path));
  return unique(selected);
}

function selectReusableAssets(
  medium: AgentExecutionMedium,
  models: AssetManifestEntry[],
  textures: AssetManifestEntry[],
  hdr: AssetManifestEntry[],
  video: AssetManifestEntry[],
  existing: string[],
) {
  const candidates = medium === "real-3d"
    ? [...hdr.slice(1, 2), ...textures.slice(0, 2)]
    : medium === "depth-image"
      ? [...textures.slice(2, 4), ...video.slice(0, 1)]
      : medium === "hybrid"
        ? [...models.slice(2, 3), ...textures.slice(2, 4), ...hdr.slice(1, 2)]
        : [...textures.slice(1, 3), ...video.slice(1, 2)];
  return unique(candidates.map((entry) => entry.path).filter((path) => !existing.includes(path)));
}

function rankEntries(entries: AssetManifestEntry[], keywords: string[]) {
  return [...entries].sort((a, b) => scoreEntry(b.path, keywords) - scoreEntry(a.path, keywords));
}

function scoreEntry(path: string, keywords: string[]) {
  const lower = path.toLowerCase();
  return keywords.reduce((score, keyword) => score + (keyword.length > 2 && lower.includes(keyword) ? 2 : 0), 0) + (/(hero|master|final|main|high)/i.test(path) ? 1 : 0);
}

function keywordSet(value: string) {
  return unique(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2)).slice(0, 24);
}

function cheapestVersion(medium: AgentExecutionMedium, hasModel: boolean, hasImage: boolean) {
  if (medium === "real-3d") return hasModel ? "reuse the strongest registered GLB, one environment light and the existing material set." : "create one optimized hero GLB only; do not model the entire world.";
  if (medium === "depth-image") return hasImage ? "reuse one registered image and generate a single depth map plus restrained camera travel." : "create one hero still and one generated depth map.";
  if (medium === "hybrid") return `use ${hasModel ? "the existing hero geometry" : "one focused hero GLB"} with ${hasImage ? "an existing environment plate" : "one new environment plate"}; keep everything else lightweight.`;
  return "use existing typography, layout, masks and one registered image/video plate; no new 3D dependency.";
}

function bestVersion(medium: AgentExecutionMedium, signatureMoment: string) {
  if (medium === "real-3d") return `hero-quality geometry, authored materials, controlled HDRI/key lighting and a camera path built specifically around the signature moment: ${signatureMoment}`;
  if (medium === "depth-image") return `high-resolution source art, custom depth cleanup, foreground masks and a lens-matched camera move built around: ${signatureMoment}`;
  if (medium === "hybrid") return `lens-matched real geometry and depth imagery with exposure/horizon continuity so the handoff disappears during: ${signatureMoment}`;
  return `custom editorial art direction, authored masks, typography choreography and selective WebGL only where it strengthens: ${signatureMoment}`;
}

function asset(name: string, type: AgentAssetType, reason: string, priority: AgentAssetPriority): AgentSceneAssetItem {
  return { name, type, reason, priority };
}

function priorityWeight(priority: AgentAssetPriority) {
  if (priority === "signature-critical") return 4;
  if (priority === "hero-critical") return 3;
  if (priority === "supporting") return 2;
  return 1;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56) || "scene";
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
