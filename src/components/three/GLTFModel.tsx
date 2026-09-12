"use client";
import { useEffect, useMemo } from "react";
import { Material, Mesh } from "three";
import type { Vec3 } from "@/src/types/experience";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { registerMaterialShaderTarget } from "@/src/runtime/shaderRegistry";
export function GLTFModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  shaderTarget,
}: {
  url: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  shaderTarget?: string;
}) {
  const { scene } = useModelInstance(url);
  const materials = useMemo(() => {
    const found = new Set<Material>();
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) found.add(material);
    });
    return [...found];
  }, [scene]);
  useEffect(() => {
    if (!shaderTarget) return;
    const unregister = materials.map((material) => registerMaterialShaderTarget(shaderTarget, material));
    return () => unregister.forEach((dispose) => dispose());
  }, [materials, shaderTarget]);
  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      dispose={null}
    />
  );
}
