"use client";
import type { Vec3 } from "@/src/types/experience";
import { useModelInstance } from "@/src/components/three/useModelInstance";
export function GLTFModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  url: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}) {
  const { scene } = useModelInstance(url);
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
