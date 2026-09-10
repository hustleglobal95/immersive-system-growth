"use client";

import type { Vec3 } from "@/src/types/experience";

export function Occluder({ position, rotation = [0, 0, 0], scale, debug = false }: { position: Vec3; rotation?: Vec3; scale: Vec3; debug?: boolean }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale} renderOrder={-1}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={debug ? "#ff00ff" : "#000000"} colorWrite={debug} depthWrite />
    </mesh>
  );
}
