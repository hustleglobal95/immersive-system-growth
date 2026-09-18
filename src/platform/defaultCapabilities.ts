import { CapabilityRegistry } from "@/src/core/registry/capabilityRegistry";

export function createDefaultCapabilityRegistry() {
  const registry = new CapabilityRegistry();
  registry.register({ id: "director", version: 2, validators: ["director:audit", "director:intelligence:audit"], studioAdapters: ["DirectorWorkbench", "DirectorIntelligence"] });
  registry.register({ id: "motion", version: 1, commands: ["motion.applyArchetype", "motion.resetScene"], validators: ["motion:systems:audit"], runtimeSystems: ["motion"] });
  registry.register({ id: "camera", version: 1, commands: ["camera.update", "camera.applyChoreography"], validators: ["camera:audit", "camera:spatial:audit"], runtimeSystems: ["camera"] });
  registry.register({ id: "structure", version: 1, commands: ["structure.applyPlan"], validators: ["site-structure.test"], studioAdapters: ["StructurePlanner"] });
  registry.register({ id: "interaction", version: 1, commands: ["interaction.add", "interaction.remove"], validators: ["interaction:validate"], runtimeSystems: ["interaction"] });
  registry.register({ id: "assets", version: 1, commands: ["asset.assign", "asset.remove"], validators: ["assets:audit", "bank:validate"], runtimeSystems: ["asset-loader"] });
  registry.register({ id: "typography", version: 1, commands: ["typography.applyPairing"], studioAdapters: ["TypeVaultWorkbench"] });
  registry.register({ id: "autonomy", version: 1, commands: ["scene.adjustPresentation", "motion.applyArchetype", "camera.applyChoreography"], validators: ["autonomy:benchmark"], runtimeSystems: ["visual-review", "forced-optimization"] });
  return registry;
}
