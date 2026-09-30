import {
  blueprintImplementationChecklist,
  blueprintRiskReport,
  blueprintToDirectorBrief,
  parseInteractive3DBlueprint,
  type Interactive3DBlueprint,
} from "@/src/platform/interactive3dBlueprint";
import {
  evaluateInteractive3DBlueprintPolicy,
  type Interactive3DPolicyReport,
} from "@/src/platform/interactive3dPolicy";
import {
  cameraChoreographyForBlueprintMove,
  forgeInteractive3DRecipeRegistry,
  recipesForInteractive3DScene,
  type ForgeInteractive3DRecipeId,
} from "@/src/platform/interactive3dRecipeRegistry";

export interface CompiledInteractive3DScene {
  id: string;
  label: string;
  owner: "dom" | "hybrid" | "webgl";
  recipes: ForgeInteractive3DRecipeId[];
  camera: {
    move: Interactive3DBlueprint["experience"]["scenes"][number]["camera"]["move"];
    choreography: ReturnType<typeof cameraChoreographyForBlueprintMove>;
    rationale: string;
  };
  interaction: Interactive3DBlueprint["experience"]["scenes"][number]["interaction"];
  mobile: string;
  prewarm: string[];
}

export interface Interactive3DAssetJob {
  id: string;
  type: Interactive3DBlueprint["assets"][number]["type"];
  role: string;
  heroCandidate: boolean;
  disposition: "resolve" | "generate" | "commission" | "blocked";
  runtimeContract: string[];
}

export interface Interactive3DCompilePlan {
  version: 1;
  compiler: "forge-interactive-3d";
  blueprint: Interactive3DBlueprint;
  directorBrief: ReturnType<typeof blueprintToDirectorBrief>;
  policy: Interactive3DPolicyReport;
  renderer: {
    productionBaseline: "webgl";
    webgpu: "off" | "opt-in";
    persistentCanvas: true;
    qualityGovernor: "existing-forge-render-governor";
  };
  signatureSlice: {
    sceneId: string;
    moment: string;
    proveBeforeExpansion: true;
    acceptance: string[];
  };
  scenes: CompiledInteractive3DScene[];
  assetJobs: Interactive3DAssetJob[];
  recipeRegistry: typeof forgeInteractive3DRecipeRegistry;
  safeRepairPaths: string[];
  implementationChecklist: string[];
  risks: string[];
}

export function compileInteractive3DBlueprint(
  input: unknown,
): Interactive3DCompilePlan {
  const blueprint = parseInteractive3DBlueprint(input);
  const policy = evaluateInteractive3DBlueprintPolicy(blueprint);
  if (!policy.passed) {
    const summary = policy.blockers
      .map((item) => item.path + ": " + item.message)
      .join("; ");
    throw new Error("Interactive 3D Blueprint is not compilable: " + summary);
  }

  const signatureScene = blueprint.experience.scenes.find(
    (scene) => scene.id === blueprint.experience.signatureSceneId,
  );
  if (!signatureScene) throw new Error("Interactive 3D signature scene is missing.");

  return {
    version: 1,
    compiler: "forge-interactive-3d",
    blueprint,
    directorBrief: blueprintToDirectorBrief(blueprint),
    policy,
    renderer: {
      productionBaseline: "webgl",
      webgpu: blueprint.renderer.strategy === "webgpu-opt-in" ? "opt-in" : "off",
      persistentCanvas: true,
      qualityGovernor: "existing-forge-render-governor",
    },
    signatureSlice: {
      sceneId: signatureScene.id,
      moment: blueprint.experience.signatureMoment,
      proveBeforeExpansion: true,
      acceptance: [
        "Signature scene renders from Forge-native recipes only.",
        "Cold-first-use prewarm work completes before the signature interaction is enabled.",
        "Semantic DOM content remains usable before and without WebGL.",
        "Reduced-motion and mobile translations preserve the same narrative idea.",
        "Performance, accessibility, interaction and visual evidence gates pass before expansion.",
      ],
    },
    scenes: blueprint.experience.scenes.map((scene) => ({
      id: scene.id,
      label: scene.label,
      owner: scene.medium,
      recipes: recipesForInteractive3DScene(scene),
      camera: {
        move: scene.camera.move,
        choreography: cameraChoreographyForBlueprintMove(scene.camera.move),
        rationale: scene.camera.rationale,
      },
      interaction: scene.interaction,
      mobile: scene.mobile,
      prewarm: [...scene.prewarm],
    })),
    assetJobs: blueprint.assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      role: asset.role,
      heroCandidate: asset.heroCandidate,
      disposition:
        asset.status === "existing"
          ? "resolve"
          : asset.status === "generate"
            ? "generate"
            : asset.status === "commission"
              ? "commission"
              : "blocked",
      runtimeContract: runtimeAssetContract(asset.type),
    })),
    recipeRegistry: forgeInteractive3DRecipeRegistry,
    safeRepairPaths: [...policy.safeRepairPaths],
    implementationChecklist: blueprintImplementationChecklist(blueprint),
    risks: blueprintRiskReport(blueprint),
  };
}

export function formatInteractive3DCompilePlan(plan: Interactive3DCompilePlan) {
  return JSON.stringify(plan, null, 2);
}

function runtimeAssetContract(
  type: Interactive3DBlueprint["assets"][number]["type"],
): string[] {
  if (type === "model") {
    return [
      "Resolve to a Forge-manifest asset id; never load an arbitrary remote model URL.",
      "Runtime artifact must be GLB/glTF-compatible and pass glTF validation.",
      "Optimize geometry and generate LODs where the hero/supporting role requires them.",
      "Use Meshopt or Draco only through the existing Forge decoder path.",
      "Transcode production textures to KTX2/Basis where compatible.",
      "Record SHA-256, byte size, decoded-memory estimate and provenance before release.",
    ];
  }
  if (type === "image") {
    return [
      "Resolve through the Forge asset manifest.",
      "Generate registered optimized derivatives and preserve provenance.",
    ];
  }
  if (type === "video") {
    return [
      "Resolve through the Forge asset manifest.",
      "Preload only when the scene readiness contract requires it.",
    ];
  }
  return [
    "Resolve through the Forge asset manifest or a reviewed Forge-native data source.",
    "Preserve provenance and release ownership.",
  ];
}
