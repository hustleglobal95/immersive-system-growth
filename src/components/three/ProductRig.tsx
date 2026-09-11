"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Material, Mesh, Object3D, type Group, type MeshStandardMaterial } from "three";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { sampleProductTrack } from "@/src/lib/productRig";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { ProductRigDefinition, Vec3 } from "@/src/types/experience";
import { applyHeroMaterial, captureHeroMaterial } from "@/src/lib/heroMaterial";

interface Baseline {
  object: Object3D;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  materials: Material[];
  opacity: number[];
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
  const tint = useRef(new Color());
  const frame = useCinematicFrame();
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
      baselines.set(name, {
        object,
        position: object.position.toArray() as Vec3,
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
        scale: object.scale.toArray() as Vec3,
        visible: object.visible,
        materials,
        opacity: materials.map((material) => material.opacity),
      });
    }
    if (missing.length)
      throw new Error("Product rig is missing GLB nodes: " + missing.join(", "));
    const materialBaselines = new Map([...ownedMaterials].map((material) => [material, captureHeroMaterial(material)]));
    return { baselines, ownedMaterials, materialBaselines };
  }, [rig.nodes, scene]);

  useEffect(
    () => () => prepared.ownedMaterials.forEach((material) => material.dispose()),
    [prepared],
  );

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const hero = frame.current.hero;
    group.position.set(...hero.position);
    group.rotation.set(...hero.rotation);
    group.scale.setScalar(hero.scale);
    const progress = useExperienceStore.getState().reducedMotion ? 0 : frame.progress;
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
  });

  return (
    <group ref={root}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}
