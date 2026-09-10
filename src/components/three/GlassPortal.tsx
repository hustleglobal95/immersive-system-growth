"use client";

import { MeshTransmissionMaterial } from "@react-three/drei";
import type { Vec3 } from "@/src/types/experience";

export function GlassPortal({
  position = [0, 0, -2],
  scale = [2.5, 3.5, 0.15],
}: {
  position?: Vec3;
  scale?: Vec3;
}) {
  return (
    <mesh position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <MeshTransmissionMaterial
        thickness={0.2}
        roughness={0.06}
        transmission={1}
        ior={1.45}
        chromaticAberration={0.025}
        anisotropy={0.08}
        distortion={0.08}
        distortionScale={0.12}
        temporalDistortion={0.03}
      />
    </mesh>
  );
}
