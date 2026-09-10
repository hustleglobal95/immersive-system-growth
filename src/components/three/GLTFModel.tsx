"use client";

import { Clone, useGLTF } from "@react-three/drei";
import type { Vec3 } from "@/src/types/experience";

interface GLTFModelProps {
  url: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}

export function GLTFModel({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: GLTFModelProps) {
  const { scene } = useGLTF(url);
  return <Clone object={scene} position={position} rotation={rotation} scale={scale} castShadow receiveShadow />;
}

export function preloadGLTF(url: string) {
  if (url) useGLTF.preload(url);
}
