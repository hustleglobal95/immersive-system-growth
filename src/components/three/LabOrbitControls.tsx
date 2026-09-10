"use client";

import { useRef } from "react";
import type { ElementRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { useExperienceStore } from "@/src/store/experienceStore";

export function LabOrbitControls() {
  const freeCamera = useExperienceStore((state) => state.freeCamera);
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const frame = useRef(0);

  useFrame(() => {
    if (!freeCamera || !controls.current) return;
    frame.current += 1;
    if (frame.current % 8 !== 0) return;
    const target = controls.current.target;
    useExperienceStore.getState().setCameraTelemetry({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      fov: "fov" in camera ? (camera as THREE.PerspectiveCamera).fov : 42,
    });
  });

  if (!freeCamera) return null;
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} />;
}
