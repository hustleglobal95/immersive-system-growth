"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ReflectiveFloor } from "@/src/components/three/ReflectiveFloor";
import { InstancedField } from "@/src/components/three/InstancedField";
import { useExperienceStore } from "@/src/store/experienceStore";

function Frame({
  position,
  scale,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[-scale[0] / 2, 0, 0]} scale={[0.05, scale[1], scale[2]]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#1c1b19"
          metalness={0.55}
          roughness={0.32}
        />
      </mesh>
      <mesh position={[scale[0] / 2, 0, 0]} scale={[0.05, scale[1], scale[2]]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#1c1b19"
          metalness={0.55}
          roughness={0.32}
        />
      </mesh>
      <mesh position={[0, scale[1] / 2, 0]} scale={[scale[0], 0.05, scale[2]]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#1c1b19"
          metalness={0.55}
          roughness={0.32}
        />
      </mesh>
    </group>
  );
}

export function DemoStage() {
  const quality = useExperienceStore((state) => state.quality);
  const architecture = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!architecture.current) return;
    const state = useExperienceStore.getState();
    const velocity = state.reducedMotion ? 0 : state.velocity;
    architecture.current.rotation.y = THREE.MathUtils.damp(
      architecture.current.rotation.y,
      velocity * 0.0007,
      4,
      delta,
    );
  });

  return (
    <group ref={architecture}>
      <InstancedField />
      {quality === "low" ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.22, 0]}
          scale={[24, 24, 1]}
          receiveShadow
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#090909"
            roughness={0.82}
            metalness={0.12}
          />
        </mesh>
      ) : (
        <ReflectiveFloor position={[0, -1.22, 0]} size={[24, 24, 1]} />
      )}

      <Frame position={[0, 0.35, -2.5]} scale={[4.6, 4.1, 0.12]} />
      <Frame
        position={[2.5, 0.1, -6.2]}
        scale={[3.3, 3.3, 0.1]}
        rotation={[0, -0.38, 0]}
      />
      <Frame
        position={[-3.1, 0.65, -8.8]}
        scale={[5.2, 4.4, 0.1]}
        rotation={[0, 0.5, 0]}
      />

      <mesh position={[0, 3.1, -5.2]} scale={[7.5, 0.025, 0.025]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-4.5, -0.3, -4.5]} scale={[0.025, 3.8, 0.025]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
