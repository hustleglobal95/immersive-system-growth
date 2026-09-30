import {
  parseInteractive3DBlueprint,
  type Interactive3DBlueprint,
} from "@/src/platform/interactive3dBlueprint";

export type Interactive3DPolicySeverity = "blocker" | "warning";

export interface Interactive3DPolicyIssue {
  code: string;
  severity: Interactive3DPolicySeverity;
  path: string;
  message: string;
  repairable: boolean;
  safeRepairPaths: string[];
}

export interface Interactive3DPolicyReport {
  passed: boolean;
  blockers: Interactive3DPolicyIssue[];
  warnings: Interactive3DPolicyIssue[];
  issues: Interactive3DPolicyIssue[];
  safeRepairPaths: string[];
}

export const INTERACTIVE_3D_SAFE_REPAIR_PATHS = [
  "performance.initialCriticalMb",
  "performance.maxActiveMb",
  "performance.maxDrawCalls",
  "performance.maxTriangles",
  "experience.scenes.*.prewarm",
  "experience.scenes.*.mobile",
  "experience.scenes.*.camera",
] as const;

export function evaluateInteractive3DBlueprintPolicy(
  input: unknown,
): Interactive3DPolicyReport {
  const blueprint = parseInteractive3DBlueprint(input);
  const issues: Interactive3DPolicyIssue[] = [];

  uniqueIdIssues(blueprint, issues);
  sceneIssues(blueprint, issues);
  assetIssues(blueprint, issues);
  budgetIssues(blueprint, issues);

  if (blueprint.renderer.strategy === "webgpu-opt-in") {
    issues.push(issue(
      "renderer.webgpu-progressive-only",
      "warning",
      "renderer.strategy",
      "WebGPU remains progressive enhancement. The production WebGL path stays authoritative until the selected Forge recipe stack is verified WebGPU-safe.",
      false,
    ));
  }

  const blockers = issues.filter((item) => item.severity === "blocker");
  const warnings = issues.filter((item) => item.severity === "warning");
  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
    issues,
    safeRepairPaths: [...INTERACTIVE_3D_SAFE_REPAIR_PATHS],
  };
}

export function assertInteractive3DBlueprintPolicy(
  input: unknown,
): Interactive3DBlueprint {
  const blueprint = parseInteractive3DBlueprint(input);
  const report = evaluateInteractive3DBlueprintPolicy(blueprint);
  if (!report.passed) {
    const summary = report.blockers
      .map((item) => item.path + ": " + item.message)
      .join("; ");
    throw new Error("Interactive 3D Blueprint policy failed: " + summary);
  }
  return blueprint;
}

function uniqueIdIssues(
  blueprint: Interactive3DBlueprint,
  issues: Interactive3DPolicyIssue[],
) {
  const sceneIds = blueprint.experience.scenes.map((scene) => scene.id);
  const assetIds = blueprint.assets.map((asset) => asset.id);
  for (const duplicate of duplicates(sceneIds)) {
    issues.push(issue(
      "scene.duplicate-id",
      "blocker",
      "experience.scenes",
      "Scene id " + duplicate + " is duplicated. Scene identity must be deterministic.",
      false,
    ));
  }
  for (const duplicate of duplicates(assetIds)) {
    issues.push(issue(
      "asset.duplicate-id",
      "blocker",
      "assets",
      "Asset id " + duplicate + " is duplicated. Blueprint asset references must resolve to one identity.",
      false,
    ));
  }
}

function sceneIssues(
  blueprint: Interactive3DBlueprint,
  issues: Interactive3DPolicyIssue[],
) {
  for (const scene of blueprint.experience.scenes) {
    const base = "experience.scenes." + scene.id;
    if (scene.medium !== "dom" && scene.prewarm.length === 0) {
      issues.push(issue(
        "scene.prewarm-required",
        "blocker",
        base + ".prewarm",
        "Hybrid/WebGL scenes must declare cold-first-use prewarm work before they can enter the signature path.",
        true,
        [base + ".prewarm"],
      ));
    }
    if (scene.camera.move === "custom") {
      issues.push(issue(
        "camera.custom-unbounded",
        "blocker",
        base + ".camera.move",
        "Custom camera output is not executable from AI. Register or select a deterministic Forge camera choreography first.",
        true,
        [base + ".camera"],
      ));
    }
    if (scene.medium === "webgl") {
      issues.push(issue(
        "ownership.webgl-semantic-warning",
        "warning",
        base + ".medium",
        "Essential copy, navigation and conversion controls must remain semantic DOM even when this scene is visually WebGL-owned.",
        false,
      ));
    }
    if (scene.interaction.input !== "none" && scene.interaction.physicalQuantity === "none") {
      issues.push(issue(
        "interaction.quantity-required",
        "blocker",
        base + ".interaction.physicalQuantity",
        "Interactive scenes must map input to a physical quantity or normalized progress value instead of raw pointer deltas.",
        true,
        [base + ".interaction.physicalQuantity"],
      ));
    }
  }
}

function assetIssues(
  blueprint: Interactive3DBlueprint,
  issues: Interactive3DPolicyIssue[],
) {
  const usableHero = blueprint.assets.some(
    (asset) => asset.heroCandidate && asset.status !== "missing",
  );
  if (!usableHero) {
    issues.push(issue(
      "asset.hero-required",
      "blocker",
      "assets",
      "The signature slice needs at least one non-missing hero candidate.",
      false,
    ));
  }

  for (const asset of blueprint.assets) {
    const base = "assets." + asset.id;
    if (asset.heroCandidate && asset.status === "missing") {
      issues.push(issue(
        "asset.hero-missing",
        "blocker",
        base + ".status",
        "A missing hero/signature-critical asset cannot be presented as production-ready.",
        false,
      ));
    }
    if (asset.status === "generate" || asset.status === "commission") {
      issues.push(issue(
        "asset.production-pipeline-pending",
        "warning",
        base + ".status",
        "Generated or commissioned assets remain untrusted source material until Forge quarantine, optimization, manifest and provenance gates pass.",
        false,
      ));
    }
    if (asset.type === "model" && asset.status === "existing" && asset.source) {
      if (/^https?:\/\//i.test(asset.source)) {
        issues.push(issue(
          "asset.remote-model-url",
          "blocker",
          base + ".source",
          "Production model assets must resolve through the Forge asset manifest, not an arbitrary remote URL.",
          false,
        ));
      } else if (!/\.glb(?:$|[?#])/i.test(asset.source)) {
        issues.push(issue(
          "asset.model-runtime-format",
          "warning",
          base + ".source",
          "Forge runtime 3D delivery should resolve to an optimized GLB artifact.",
          false,
        ));
      }
    }
  }
}

function budgetIssues(
  blueprint: Interactive3DBlueprint,
  issues: Interactive3DPolicyIssue[],
) {
  if (blueprint.performance.initialCriticalMb > 8) {
    issues.push(issue(
      "budget.critical-transfer",
      "warning",
      "performance.initialCriticalMb",
      "Initial critical 3D transfer exceeds the current Forge desktop default of 8 MB; mobile should normally be lower.",
      true,
      ["performance.initialCriticalMb"],
    ));
  }
  if (blueprint.performance.maxDrawCalls > 100) {
    issues.push(issue(
      "budget.draw-calls",
      "warning",
      "performance.maxDrawCalls",
      "Draw-call budget is above the hardened interactive-3D default of 100. Keep this intentional and measured.",
      true,
      ["performance.maxDrawCalls"],
    ));
  }
  if (blueprint.performance.maxTriangles > 1_000_000) {
    issues.push(issue(
      "budget.triangles",
      "warning",
      "performance.maxTriangles",
      "Visible triangle budget exceeds the current Forge desktop default of one million.",
      true,
      ["performance.maxTriangles"],
    ));
  }
}

function issue(
  code: string,
  severity: Interactive3DPolicySeverity,
  path: string,
  message: string,
  repairable: boolean,
  safeRepairPaths: string[] = [],
): Interactive3DPolicyIssue {
  return { code, severity, path, message, repairable, safeRepairPaths };
}

function duplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}
