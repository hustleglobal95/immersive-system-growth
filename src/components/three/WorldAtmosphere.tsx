"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function WorldAtmosphere() {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color("#070707");
    scene.fog = new THREE.FogExp2("#070707", 0.035);
  }, [scene]);

  useFrame(() => {
    const { progress, reducedMotion } = useExperienceStore.getState();
    const world = sampleExperience(progress, reducedMotion).world;
    if (scene.background instanceof THREE.Color) scene.background.set(world.background);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(world.fog);
      scene.fog.density = world.fogDensity;
    }
  });

  return null;
}
