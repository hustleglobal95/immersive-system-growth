import { createMotionArchetype, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { parseExperience } from "@/src/lib/configSchema";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export type CreativeMedium = "depth-image" | "real-3d" | "hybrid" | "cinematic-dom";

export interface CreativeSceneMove {
  sceneIndex: number;
  label: string;
  role: "establish" | "build" | "reveal" | "threshold" | "proof" | "resolve";
  archetype: MotionArchetypeName;
  cameraStrategy: string;
  purpose: string;
}

export interface CreativeExecutionPlan {
  title: string;
  thesis: string;
  medium: CreativeMedium;
  mediumLabel: string;
  mediumReason: string;
  assetStrategy: string[];
  sceneMoves: CreativeSceneMove[];
  productionOrder: string[];
  risks: string[];
  signatureMoment: string;
  patchSummary: string[];
}

export function planCreativeExecution(input: {
  idea: string;
  experience: ExperienceConfig;
  manifest: AssetManifest;
  variation?: number;
}): CreativeExecutionPlan {
  const { idea, experience, manifest } = input;
  const variation = input.variation ?? 0;
  const lower = idea.toLowerCase();
  const modelCount = manifest.models.length;
  const imageCount = manifest.textures.length;
  const videoCount = manifest.video.length;
  const hasRig = Boolean(experience.productRig?.nodes.length);
  const sceneCount = experience.scenes.length;

  const medium = chooseMedium({ lower, modelCount, imageCount, videoCount, hasRig, variation });
  const mediumCopy = mediumDescription(medium, { modelCount, imageCount, hasRig });
  const sceneMoves = buildSceneMoves(experience, lower, medium, variation, hasRig);
  const signatureMoment = signatureFor(medium, lower, hasRig);

  const assetStrategy = [
    medium === "depth-image"
      ? "Use the strongest hero image as a depth source; generate foreground/midground/background separation before adding effects."
      : medium === "real-3d"
        ? "Use the best GLB as the spatial source of truth; preserve real geometry for camera movement, lighting and occlusion."
        : medium === "hybrid"
          ? "Reserve real geometry for the hero/signature object and use depth-treated imagery for surrounding atmosphere and transitions."
          : "Keep the experience DOM-first and use WebGL only where it adds spatial meaning rather than decorative cost.",
    modelCount ? `${modelCount} registered model${modelCount === 1 ? "" : "s"}: inspect hierarchy and choose one hero-quality asset before authoring choreography.` : "No registered model is available, so do not design the concept around an orbit or geometry-dependent reveal yet.",
    imageCount ? `${imageCount} registered texture/image asset${imageCount === 1 ? "" : "s"}: rank them by hero potential, depth separation and edge quality.` : "Add one strong visual source before expanding scene count; a weak asset cannot be fixed by motion density.",
    videoCount ? `${videoCount} video asset${videoCount === 1 ? "" : "s"}: use video as proof or atmosphere, not as a substitute for a coherent camera idea.` : "No video dependency is required for this direction.",
  ];

  return {
    title: planTitle(medium, variation),
    thesis: makeThesis(idea, medium, signatureMoment),
    medium,
    mediumLabel: mediumCopy.label,
    mediumReason: mediumCopy.reason,
    assetStrategy,
    sceneMoves,
    productionOrder: [
      "Lock the one-line experience thesis and signature moment.",
      "Choose the minimum hero asset set needed to prove the idea.",
      "Author the opening and signature camera beats before secondary transitions.",
      "Apply motion across the selected scene arc, then reduce anything that competes with the signature moment.",
      "Review mobile framing and performance before increasing visual complexity.",
    ],
    risks: buildRisks(medium, { modelCount, imageCount, hasRig, sceneCount }),
    signatureMoment,
    patchSummary: sceneMoves.map((move) => `${String(move.sceneIndex + 1).padStart(2, "0")} ${move.label}: ${move.archetype} · ${move.cameraStrategy}`),
  };
}

export function applyCreativeExecutionPlan(
  experience: ExperienceConfig,
  plan: CreativeExecutionPlan,
  selectedSceneIndexes?: number[],
): ExperienceConfig {
  const allowed = selectedSceneIndexes ? new Set(selectedSceneIndexes) : null;
  const scenes = experience.scenes.map((scene, sceneIndex) => {
    const move = plan.sceneMoves.find((item) => item.sceneIndex === sceneIndex);
    if (!move || (allowed && !allowed.has(sceneIndex))) return scene;
    const generated = createMotionArchetype(move.archetype, experience, sceneIndex).map((track) => ({
      ...track,
      id: `agent-v2-${sceneIndex}-${track.id}`,
      label: `Agent · ${track.label}`,
    }));
    return {
      ...scene,
      motionTracks: [
        ...scene.motionTracks.filter((track) => !track.id.startsWith("agent-") && !track.id.startsWith("agent-v2-")),
        ...generated,
      ],
    };
  });
  return parseExperience({ ...experience, scenes });
}

function chooseMedium(input: { lower: string; modelCount: number; imageCount: number; videoCount: number; hasRig: boolean; variation: number }): CreativeMedium {
  const { lower, modelCount, imageCount, hasRig, variation } = input;
  if (lower.includes("image") || lower.includes("photo") || lower.includes("depth")) return variation % 3 === 1 && modelCount ? "hybrid" : "depth-image";
  if (lower.includes("3d") || lower.includes("model") || lower.includes("orbit") || lower.includes("explode") || lower.includes("assembly")) return modelCount || hasRig ? "real-3d" : "hybrid";
  if ((modelCount || hasRig) && imageCount) return variation % 3 === 0 ? "hybrid" : variation % 3 === 1 ? "real-3d" : "depth-image";
  if (modelCount || hasRig) return "real-3d";
  if (imageCount) return "depth-image";
  return "cinematic-dom";
}

function buildSceneMoves(experience: ExperienceConfig, lower: string, medium: CreativeMedium, variation: number, hasRig: boolean): CreativeSceneMove[] {
  const count = experience.scenes.length;
  const indexes = count <= 4 ? [...Array(count).keys()] : unique([0, Math.floor((count - 1) * 0.32), Math.floor((count - 1) * 0.62), count - 1]);
  const roles: CreativeSceneMove["role"][] = ["establish", "build", "reveal", "resolve"];
  const cycle = strategyCycle(medium, lower, hasRig, variation);
  return indexes.map((sceneIndex, position) => {
    const scene = experience.scenes[sceneIndex];
    const role = roles[Math.min(position, roles.length - 1)];
    const archetype = cycle[position % cycle.length];
    return {
      sceneIndex,
      label: scene.label,
      role,
      archetype,
      cameraStrategy: cameraCopy(archetype, role),
      purpose: purposeCopy(role, medium),
    };
  });
}

function strategyCycle(medium: CreativeMedium, lower: string, hasRig: boolean, variation: number): MotionArchetypeName[] {
  const base: MotionArchetypeName[] = medium === "real-3d"
    ? (hasRig ? ["editorial-reveal", "architectural-build", "product-hero", "threshold-passage"] : ["editorial-reveal", "product-hero", "parallax-story", "threshold-passage"])
    : medium === "depth-image"
      ? ["editorial-reveal", "parallax-story", "threshold-passage", "editorial-reveal"]
      : medium === "hybrid"
        ? ["editorial-reveal", hasRig ? "architectural-build" : "parallax-story", "product-hero", "threshold-passage"]
        : ["editorial-reveal", "parallax-story", "editorial-reveal", "threshold-passage"];
  if (lower.includes("quiet") || lower.includes("restrain")) base.splice(1, 1, "editorial-reveal");
  return rotate(base, variation);
}

function cameraCopy(archetype: MotionArchetypeName, role: CreativeSceneMove["role"]) {
  const byArchetype: Record<MotionArchetypeName, string> = {
    "editorial-reveal": role === "establish" ? "Hold a disciplined frame, then introduce a slow pressure push." : "Use minimal camera travel and let composition do the reveal.",
    "parallax-story": "Use lateral separation with shallow perspective change; avoid exaggerated float.",
    "threshold-passage": "Commit forward through a spatial threshold and let exposure/copy hand off across the move.",
    "architectural-build": "Use a measured crane/reveal path while structure assembles in readable semantic order.",
    "product-hero": "Use a controlled macro approach with one decisive perspective change near the reveal beat.",
  };
  return byArchetype[archetype];
}

function purposeCopy(role: CreativeSceneMove["role"], medium: CreativeMedium) {
  if (role === "establish") return "Establish the visual rule and create anticipation without spending the signature moment early.";
  if (role === "build") return medium === "real-3d" ? "Prove spatial credibility and let geometry become the narrative." : "Increase dimensional separation while keeping the visitor oriented.";
  if (role === "reveal") return "Spend the strongest asset, camera move and lighting change on one memorable reveal.";
  return "Resolve the sequence with clarity, proof and a calmer interaction state rather than another climax.";
}

function mediumDescription(medium: CreativeMedium, input: { modelCount: number; imageCount: number; hasRig: boolean }) {
  if (medium === "real-3d") return { label: "Real 3D", reason: input.modelCount || input.hasRig ? "The project already has geometry/rig leverage, so real spatial camera movement is worth the cost." : "The idea depends on viewpoint change or occlusion that a single image cannot honestly support." };
  if (medium === "depth-image") return { label: "Image → Depth", reason: "The idea can get most of its perceived spatial value from depth separation, parallax and restrained camera pressure without paying for a complete 3D environment." };
  if (medium === "hybrid") return { label: "Hybrid 2.5D + 3D", reason: "Use geometry only where viewpoint freedom matters and let depth-treated imagery carry atmosphere, scale and transition coverage." };
  return { label: "Cinematic DOM + selective WebGL", reason: "The current asset set does not justify heavy 3D. Direction, typography, masking and camera-like motion will produce a better craft-to-complexity ratio." };
}

function signatureFor(medium: CreativeMedium, lower: string, hasRig: boolean) {
  if (lower.includes("enter") || lower.includes("through")) return "A single threshold crossing where the composition physically changes state as the camera commits forward.";
  if (medium === "real-3d" && hasRig) return "A reversible assembly/reveal where semantic parts resolve into the final object exactly as the camera reaches its hero angle.";
  if (medium === "real-3d") return "One controlled viewpoint change that reveals information impossible to see from the opening frame.";
  if (medium === "depth-image") return "Foreground separation and a restrained push create the first impossible-feeling moment of depth from a still image.";
  if (medium === "hybrid") return "A seamless handoff from depth-treated image space into true geometry without announcing the technical transition.";
  return "A typography/composition reveal whose timing feels spatial even though the experience remains lightweight.";
}

function buildRisks(medium: CreativeMedium, input: { modelCount: number; imageCount: number; hasRig: boolean; sceneCount: number }) {
  const risks: string[] = [];
  if (medium === "depth-image") risks.push("Depth edges can tear under aggressive camera movement; keep perspective shifts restrained and mask difficult silhouettes.");
  if (medium === "real-3d" && !input.modelCount && !input.hasRig) risks.push("The concept currently expects geometry that is not registered in the project.");
  if (medium === "hybrid") risks.push("The image-to-geometry handoff must match lens, exposure and horizon or the transition will feel synthetic.");
  if (!input.imageCount && medium !== "real-3d") risks.push("The current asset manifest has no image texture to support the proposed image-led treatment.");
  if (input.sceneCount > 8) risks.push("Do not spread the same intensity across every chapter; reserve the strongest production move for a small scene arc.");
  risks.push("Mobile should preserve the concept with reduced travel, not simply shrink the desktop choreography.");
  return risks;
}

function makeThesis(idea: string, medium: CreativeMedium, signature: string) {
  const trimmed = idea.trim().replace(/\s+/g, " ");
  return `${trimmed || "Create a memorable immersive experience."} Execute it as ${medium.replace("-", " ")} with one dominant rule: ${signature}`;
}

function planTitle(medium: CreativeMedium, variation: number) {
  const names: Record<CreativeMedium, string[]> = {
    "depth-image": ["Sculpted Still", "Parallax Chamber", "Depth Without Noise"],
    "real-3d": ["Spatial Proof", "Directed Geometry", "One Decisive Viewpoint"],
    hybrid: ["Seamless Threshold", "Selective Reality", "Image to Space"],
    "cinematic-dom": ["Editorial Cinema", "Lightweight Direction", "Composition First"],
  };
  const options = names[medium];
  return options[variation % options.length];
}

function rotate<T>(items: T[], amount: number) {
  if (!items.length) return items;
  const shift = ((amount % items.length) + items.length) % items.length;
  return [...items.slice(shift), ...items.slice(0, shift)];
}

function unique(values: number[]) {
  return [...new Set(values)];
}
