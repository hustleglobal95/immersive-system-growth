"use client";

import { useEffect, useRef } from "react";
import type { ElementRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { useExperienceStore } from "@/src/store/experienceStore";

export function LabOrbitControls() {
  const freeCamera = useExperienceStore((state) => state.freeCamera);
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (freeCamera && controls.current) {
      controls.current.target.set(
        ...useExperienceStore.getState().cameraTelemetry.target,
      );
      controls.current.update();
    }
  }, [freeCamera]);

  useFrame(() => {
    if (!freeCamera || !controls.current) return;
    const prior=useExperienceStore.getState().cameraTelemetry;
    if (camera.position.distanceToSquared({x:prior.position[0],y:prior.position[1],z:prior.position[2]} as THREE.Vector3)<.0000001 && controls.current.target.distanceToSquared({x:prior.target[0],y:prior.target[1],z:prior.target[2]} as THREE.Vector3)<.0000001) return;
    const target = controls.current.target;
    useExperienceStore.getState().setCameraTelemetry({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      fov: "fov" in camera ? (camera as THREE.PerspectiveCamera).fov : 42,
    });
  });

  if (!freeCamera) return null;
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
    />
  );
}
