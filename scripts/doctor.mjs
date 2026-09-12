import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "package.json",
  "package-lock.json",
  "node_modules/next/package.json",
  "node_modules/typescript/package.json",
  "node_modules/eslint/package.json",
  "config/experience.json",
  "config/studio-project.json",
  "config/asset-manifest.json",
  "config/interaction-graph.json",
  "src/components/runtime/ExperienceRuntime.tsx",
  "src/components/three/SceneCanvas.tsx",
  "src/components/three/useThreeInteraction.ts",
  "src/lib/sampleExperience.ts",
  "src/lib/interactionGraph.ts",
  "src/lib/interactionGraphEngine.ts",
  "src/lib/runtimeCommands.ts",
  "src/runtime/InteractionGraphController.tsx",
  "src/runtime/RuntimeCommandController.tsx",
  "src/runtime/interactionEvents.ts",
  "src/runtime/shaderRegistry.ts",
  "src/store/interactionStore.ts",
  "src/studio/InteractionGraphEditor.tsx",
  "src/studio/StudioWorkbench.tsx",
  "src/studio/MaskLab.tsx",
  "src/studio/StudioLivePreview.tsx",
  "src/studio/SceneDirector.tsx",
  "src/studio/LayerEditor.tsx",
  "src/studio/SequencerEditor.tsx",
  "src/platform/studioPublish.ts",
  "src/platform/motionPresets.ts",
  "src/lib/maskReveal.ts",
  "src/lib/motionSequencer.ts",
  "src/lib/sequencerTransport.ts",
  "src/lib/keyframeOperations.ts",
  "src/lib/renderProfile.ts",
  "src/platform/glbInspector.ts",
  "scripts/asset-optimize-lib.mjs",
  "src/lib/maskShader.ts",
  "CLAUDE.md",
  "docs/ARCHITECTURE.md",
  "docs/MOTION_SEQUENCER.md",
  "docs/INTERACTION_GRAPH.md",
];

const [major, minor] = process.versions.node.split(".").map(Number);
let failed = major < 22 || (major === 22 && minor < 13);
if (failed) console.error("Node 22.13 or later required");
for (const item of required) {
  const ok = fs.existsSync(path.join(root, item));
  console.log(`${ok ? "✓" : "✗"} ${item}`);
  if (!ok) failed = true;
}

const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
for (const dependency of [
  "next",
  "react",
  "three",
  "@react-three/fiber",
  "@react-three/drei",
  "gsap",
  "lenis",
  "zustand",
]) {
  const ok = Boolean(pkg.dependencies?.[dependency]);
  console.log(`${ok ? "✓" : "✗"} dependency ${dependency}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error("\nForge doctor found blocking problems.");
  process.exit(1);
}
console.log("\nForge doctor passed.");
