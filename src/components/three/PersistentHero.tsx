"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { experience } from "@/src/lib/experience";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";

function LoadedModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} />;
}

function ProceduralArtifact() {
  return (
    <mesh castShadow receiveShadow>
      <torusKnotGeometry args={[0.85, 0.22, 220, 32]} />
      <meshPhysicalMaterial color="#f97316" metalness={0.72} roughness={0.16} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
}

export function PersistentHero() {
  const group = useRef<THREE.Group>(null);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);

  useFrame((_, delta) => {
    if (!group.current) return;
    const state = useExperienceStore.getState();
    const sampled = sampleExperience(state.progress, state.reducedMotion);
    const alpha = 1 - Math.exp(-experience.runtime.objectDamping * delta);
    const g = group.current;
    g.position.lerp(new THREE.Vector3(...sampled.hero.position), alpha);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, sampled.hero.rotation[0], alpha);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, sampled.hero.rotation[1], alpha);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, sampled.hero.rotation[2], alpha);
    const scale = THREE.MathUtils.lerp(g.scale.x, sampled.hero.scale, alpha);
    g.scale.setScalar(scale);
  });

  const content = experience.heroModel ? <LoadedModel url={experience.heroModel} /> : <ProceduralArtifact />;
  return (
    <group ref={group}>
      <Float speed={reducedMotion ? 0 : 1.25} rotationIntensity={reducedMotion ? 0 : 0.07} floatIntensity={reducedMotion ? 0 : 0.08} floatingRange={[-0.04, 0.04]}>
        {content}
      </Float>
    </group>
  );
}
