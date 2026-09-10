"use client";

import { useImageTexture } from "./useImageTexture";
import * as THREE from "three";

export function PanoramaDome({
  texture,
  radius = 20,
  rotationY = 0,
}: {
  texture: string;
  radius?: number;
  rotationY?: number;
}) {
  const map = useImageTexture(texture);
  return (
    <mesh rotation={[0, rotationY, 0]}>
      <sphereGeometry args={[radius, 64, 32]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}
