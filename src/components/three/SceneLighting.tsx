"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function SceneLighting() {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const { progress, reducedMotion } = useExperienceStore.getState();
    const world = sampleExperience(progress, reducedMotion).world;
    const alpha = 1 - Math.exp(-5 * delta);
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(ambient.current.intensity, world.ambient, alpha);
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(key.current.intensity, world.key, alpha);
    if (rim.current) rim.current.intensity = THREE.MathUtils.lerp(rim.current.intensity, world.rim, alpha);
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.45} />
      <directionalLight ref={key} position={[4, 6, 5]} intensity={4.2} color="#fff2df" castShadow />
      <pointLight ref={rim} position={[-4, 1.5, -2]} intensity={2.1} color="#ff7a1a" />
    </>
  );
}
