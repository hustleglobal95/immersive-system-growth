import type { CameraChoreographyName } from "@/src/platform/cameraChoreography";
import type { Interactive3DScene } from "@/src/platform/interactive3dBlueprint";

export const forgeInteractive3DRecipeRegistry = {
  "forge.dom-scene": {
    owner: "dom",
    systems: [
      "src/components/dom/SceneBlocks.tsx",
      "src/components/dom/CinematicDomMotion.tsx",
    ],
  },
  "forge.persistent-canvas": {
    owner: "webgl",
    systems: [
      "src/components/three/SceneCanvas.tsx",
      "src/components/three/RendererLifecycle.tsx",
      "src/components/three/AdaptiveQuality.tsx",
      "src/components/three/RenderStatsProbe.tsx",
    ],
  },
  "forge.scene-assets": {
    owner: "webgl",
    systems: [
      "src/components/three/SceneAssets.tsx",
      "src/components/three/AssetBoundary.tsx",
    ],
  },
  "forge.camera-director": {
    owner: "hybrid",
    systems: [
      "src/platform/cameraDirector.ts",
      "src/components/three/CameraRig.tsx",
    ],
  },
  "forge.interaction-graph": {
    owner: "hybrid",
    systems: [
      "src/runtime/InteractionGraphController.tsx",
      "src/platform/agentic/creativeStateGraph.ts",
    ],
  },
  "forge.cinematic-frame": {
    owner: "webgl",
    systems: [
      "src/components/three/CinematicFrame.tsx",
      "src/components/three/SceneLighting.tsx",
    ],
  },
  "forge.world-atmosphere": {
    owner: "webgl",
    systems: [
      "src/components/three/WorldAtmosphere.tsx",
      "src/components/three/ParticleField.tsx",
    ],
  },
  "forge.masked-media": {
    owner: "hybrid",
    systems: [
      "src/components/three/MaskedMediaLayer.tsx",
      "src/components/dom/SceneBlocks.tsx",
    ],
  },
  "forge.postfx": {
    owner: "webgl",
    systems: [
      "src/components/three/PostFX.tsx",
      "src/lib/renderGovernor.ts",
    ],
  },
} as const;

export type ForgeInteractive3DRecipeId = keyof typeof forgeInteractive3DRecipeRegistry;

export function recipesForInteractive3DScene(
  scene: Interactive3DScene,
): ForgeInteractive3DRecipeId[] {
  if (scene.medium === "dom") return ["forge.dom-scene"];

  const recipes: ForgeInteractive3DRecipeId[] = [
    "forge.persistent-canvas",
    "forge.scene-assets",
    "forge.camera-director",
    "forge.interaction-graph",
    "forge.cinematic-frame",
  ];

  if (scene.depthStrategy === "layered-dom" || scene.depthStrategy === "parallax") {
    recipes.push("forge.masked-media");
  }
  if (
    scene.depthStrategy === "material" ||
    scene.depthStrategy === "atmospheric" ||
    scene.depthStrategy === "full-3d"
  ) {
    recipes.push("forge.world-atmosphere", "forge.postfx");
  }
  return [...new Set(recipes)];
}

export function cameraChoreographyForBlueprintMove(
  move: Interactive3DScene["camera"]["move"],
): CameraChoreographyName | null {
  switch (move) {
    case "static":
      return null;
    case "dolly":
      return "director-precision-push";
    case "truck":
      return "director-parallax-truck";
    case "crane":
      return "director-crane-reveal";
    case "orbit":
      return "director-hero-orbit";
    case "macro":
      return "director-macro-approach";
    case "reveal":
      return "director-pullback-reveal";
    case "custom":
      return null;
  }
}
