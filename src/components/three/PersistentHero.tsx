"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { experience } from "@/src/lib/experience";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { GLTFModel } from "@/src/components/three/GLTFModel";
import { useExperienceStore } from "@/src/store/experienceStore";
export function HeroFallback() {
  const quality = useExperienceStore((s) => s.quality);
  return (
    <mesh castShadow receiveShadow>
      <torusKnotGeometry
        args={[
          0.85,
          0.22,
          quality === "low" ? 64 : 160,
          quality === "low" ? 8 : 20,
        ]}
      />
      <meshPhysicalMaterial
        color="#f97316"
        metalness={0.72}
        roughness={0.16}
        clearcoat={1}
      />
    </mesh>
  );
}
export function PersistentHero() {
  const quality=useExperienceStore(s=>s.quality);
  const group = useRef<Group>(null),
    frame = useCinematicFrame();
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const h = frame.current.hero;
    g.position.set(...h.position);
    g.rotation.set(...h.rotation);
    g.scale.setScalar(h.scale);
  });
  if (!experience.heroVisible) return null;
  return (
    <group ref={group}>
      {experience.heroModel ? (
        <GLTFModel url={quality==="low"&&experience.heroLowModel?experience.heroLowModel:experience.heroModel} />
      ) : (
        <HeroFallback />
      )}
    </group>
  );
}
