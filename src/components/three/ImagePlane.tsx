"use client";

import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Vec3 } from "@/src/types/experience";

export function ImagePlane({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1.6, 0.9, 1],
}: {
  src: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}) {
  const map = useTexture(src);
  map.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={map} toneMapped={false} transparent />
    </mesh>
  );
}
