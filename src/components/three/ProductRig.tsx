"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Material, Mesh, Object3D, type Group, type MeshStandardMaterial } from "three";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { useThreeInteraction } from "@/src/components/three/useThreeInteraction";
import { sampleProductTrack } from "@/src/lib/productRig";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { ProductRigDefinition, Vec3 } from "@/src/types/experience";
import { applyHeroMaterial, captureHeroMaterial } from "@/src/lib/heroMaterial";
import { registerMaterialShaderTarget, reapplyShaderTarget } from "@/src/runtime/shaderRegistry";
import { captureSpatialObject, releaseSpatialObject } from "@/src/runtime/spatialRegistry";

interface Baseline {
  object: Object3D;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  materials: Material[];
  opacity: number[];
  previousInteraction: unknown;
}

function materialsFor(object: Object3D) {
  const materials = new Set<Material>();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material])
      materials.add(material);
  });
  return [...materials];
}

export function ProductRig({ url, rig }: { url: string; rig: ProductRigDefinition }) {
  const root = useRef<Group>(null);
  const frameCounter = useRef(0);
  const tint = useRef(new Color());
  const frame = useCinematicFrame();
  const interaction = useThreeInteraction("hero");
  const { scene } = useModelInstance(url);
  const prepared = useMemo(() => {
    const ownedMaterials = new Set<Material>();
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => {
          const clone = material.clone();
          ownedMaterials.add(clone);
          return clone;
        });
      } else {
        const clone = object.material.clone();
        ownedMaterials.add(clone);
        object.material = clone;
      }
    });
    const baselines = new Map<string, Baseline>();
    const missing: string[] = [];
    for (const name of rig.nodes) {
      const object = scene.getObjectByName(name);
      if (!object) {
        missing.push(name);
        continue;
      }
      const materials = materialsFor(object);
      const previousInteraction = object.userData.forgeInteraction as unknown;
      object.userData.forgeInteraction = `rig:${name}`;
      baselines.set(name, {
        object,
        position: object.position.toArray() as Vec3,
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
        scale: object.scale.toArray() as Vec3,
        visible: object.visible,
        materials,
        opacity: materials.map((material) => material.opacity),
        previousInteraction,
      });
    }
    if (missing.length)
      throw new Error("Product rig is missing GLB nodes: " + missing.join(", "));
    const materialBaselines = new Map([...ownedMaterials].map((material) => [material, captureHeroMaterial(material)]));
    return { baselines, ownedMaterials, materialBaselines };
  }, [rig.nodes, scene]);

  useEffect(() => {
    const unregister = [
      ...[...prepared.ownedMaterials].map((material) => registerMaterialShaderTarget("hero", material)),
      ...[...prepared.baselines.entries()].flatMap(([name, baseline]) =>
        baseline.materials.map((material) => registerMaterialShaderTarget(`rig:${name}`, material)),
      ),
    ];
    return () => {
      unregister.forEach((dispose) => dispose());
      releaseSpatialObject("hero");
      prepared.baselines.forEach((baseline) => {
        if (baseline.previousInteraction === undefined) delete baseline.object.userData.forgeInteraction;
        else baseline.object.userData.forgeInteraction = baseline.previousInteraction;
      });
      prepared.ownedMaterials.forEach((material) => material.dispose());
    };
  }, [prepared]);

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const hero = frame.current.hero;
    const store = useExperienceStore.getState();
    const orbit = store.orbit;
    group.position.set(...hero.position);
    group.rotation.set(
      hero.rotation[0] + (orbit.target === "hero" ? orbit.pitch : 0),
      hero.rotation[1] + (orbit.target === "hero" ? orbit.yaw : 0),
      hero.rotation[2],
    );
    group.scale.setScalar(hero.scale);
    const progress = store.reducedMotion ? 0 : frame.progress;
    tint.current.set(frame.current.material.tint);
    prepared.materialBaselines.forEach((baseline, material) => applyHeroMaterial(material, baseline, frame.current.material, tint.current));

    for (const baseline of prepared.baselines.values()) {
      baseline.object.position.set(...baseline.position);
      baseline.object.rotation.set(...baseline.rotation);
      baseline.object.scale.set(...baseline.scale);
      baseline.object.visible = baseline.visible;
      baseline.materials.forEach((material, index) => {
        material.opacity = baseline.opacity[index];
        material.transparent = material.opacity < 1;
      });
    }

    for (const track of rig.tracks) {
      const baseline = prepared.baselines.get(track.node);
      if (!baseline) continue;
      const value = sampleProductTrack(track, progress);
      if (track.property === "visible") {
        baseline.object.visible = value as boolean;
      } else if (track.property === "opacity") {
        for (const material of baseline.materials) {
          material.opacity = value as number;
          material.transparent = material.opacity < 1;
          (material as MeshStandardMaterial).depthWrite = material.opacity >= 0.98;
        }
      } else {
        const vector = value as Vec3;
        const target = baseline.object[track.property];
        if (track.mode === "absolute") target.set(...vector);
        else if (track.property === "scale")
          target.set(
            baseline.scale[0] * vector[0],
            baseline.scale[1] * vector[1],
            baseline.scale[2] * vector[2],
          );
        else
          target.set(
            baseline[track.property][0] + vector[0],
            baseline[track.property][1] + vector[1],
            baseline[track.property][2] + vector[2],
          );
      }
    }

    for (const [node, properties] of Object.entries(frame.current.motion.rig)) {
      const baseline = prepared.baselines.get(node);
      if (!baseline) continue;
      for (const [property, sampled] of Object.entries(properties)) {
        if (!sampled) continue;
        if (property === "visible") baseline.object.visible = sampled.value as boolean;
        else if (property === "opacity") {
          for (const material of baseline.materials) {
            const value = sampled.value as number;
            material.opacity = sampled.blend === "multiply" ? material.opacity * value : sampled.blend === "add" ? material.opacity + value : value;
            material.transparent = material.opacity < 1;
            (material as MeshStandardMaterial).depthWrite = material.opacity >= 0.98;
          }
        } else {
          const target = baseline.object[property as "position" | "rotation" | "scale"];
          const value = sampled.value as Vec3;
          if (sampled.blend === "absolute") target.set(...value);
          else if (property === "scale") target.set(target.x * value[0], target.y * value[1], target.z * value[2]);
          else target.set(target.x + value[0], target.y + value[1], target.z + value[2]);
        }
      }
    }

    if (orbit.target?.startsWith("rig:")) {
      const baseline = prepared.baselines.get(orbit.target.slice(4));
      if (baseline) {
        baseline.object.rotation.x += orbit.pitch;
        baseline.object.rotation.y += orbit.yaw;
      }
    }

    reapplyShaderTarget("hero");
    for (const name of prepared.baselines.keys()) reapplyShaderTarget(`rig:${name}`);
    frameCounter.current = (frameCounter.current + 1) % 12;
    if (frameCounter.current === 0) captureSpatialObject("hero", group, "subject");
  });

  return (
    <group ref={root} {...interaction}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
