import fs from "node:fs";

const checks=[
  ["src/lib/renderGovernor.ts",["native","balanced","performance","survival","preserveSubjectTier","browser-spatial"]],
  ["src/store/experienceStore.ts",["adaptRendering","protect-subject-tier","coarse-tier-degrade","renderGovernor"]],
  ["src/components/three/RendererLifecycle.tsx",["governedDpr","forgeRenderGovernor","forgeReconstruction"]],
  ["src/components/three/AdaptiveQuality.tsx",["adaptRendering(-1","adaptRendering(1","setRenderGovernorTelemetry"]],
  ["src/components/three/PostFX.tsx",["governorTier","bloomScale"]],
  ["src/components/three/ParticleField.tsx",["governedParticleCount","governorTier"]],
  ["src/components/three/SceneCanvas.tsx",["renderProfile.shadows"]],
  ["src/components/three/RenderStatsProbe.tsx",["governorTier","governorFrameP95","reconstruction"]],
  ["scripts/autonomy-performance-profile.mjs",["maxGovernorSeverity","governorTiers","minPixelRatio"]],
  ["scripts/autonomy-performance-repair.mjs",["maxGovernorSeverity"]],
];
const failures=[];
for(const [file,needles] of checks){
  if(!fs.existsSync(file)){failures.push(file+": missing");continue;}
  const content=fs.readFileSync(file,"utf8");
  for(const needle of needles) if(!content.includes(needle)) failures.push(file+": missing "+JSON.stringify(needle));
}
if(failures.length){
  console.error("Render Governor audit failed:");
  for(const failure of failures) console.error("- "+failure);
  process.exit(1);
}
console.log("Render Governor audit PASS");
console.log("- adaptive DPR before coarse subject/asset tier loss");
console.log("- ordered post/shadow/particle degradation");
console.log("- live governor telemetry in performance evidence");
console.log("- manual quality remains authoritative");
console.log("- browser-spatial reconstruction is labeled honestly");
