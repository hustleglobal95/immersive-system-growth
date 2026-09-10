"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import type { Vec3 } from "@/src/types/experience";

export function ReflectiveFloor({ position = [0, -1.2, 0], size = [20, 20, 1] }: { position?: Vec3; size?: Vec3 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} scale={size} receiveShadow>
      <planeGeometry args={[1, 1]} />
      <MeshReflectorMaterial blur={[320, 90]} resolution={512} mixBlur={1} mixStrength={12} roughness={0.68} depthScale={0.2} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#0b0b0b" metalness={0.28} />
    </mesh>
  );
}
