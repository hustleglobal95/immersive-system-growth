"use client";

import { MeshTransmissionMaterial } from "@react-three/drei";
import type { Vec3 } from "@/src/types/experience";

export function ScenePortal({ position = [0,0,-2], rotation = [0,0,0], size = [2.8,3.8,0.08], tint = "#ffffff" }: { position?: Vec3; rotation?: Vec3; size?: Vec3; tint?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh scale={size}>
        <boxGeometry args={[1,1,1]} />
        <MeshTransmissionMaterial color={tint} transmission={1} thickness={0.16} ior={1.46} roughness={0.04} chromaticAberration={0.018} distortion={0.05} distortionScale={0.08} />
      </mesh>
      <mesh position={[0, 0, -0.06]} scale={[size[0] * 1.04, size[1] * 1.04, size[2] * 0.3]}>
        <boxGeometry args={[1,1,1]} /><meshBasicMaterial color="#000000" transparent opacity={0.01} depthWrite={false} />
      </mesh>
    </group>
  );
}
