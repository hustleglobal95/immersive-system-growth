"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { experience } from "@/src/lib/experience";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function CameraRig() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const frame = useRef(0);

  useFrame((_, delta) => {
    const state = useExperienceStore.getState();
    if (state.freeCamera) return;
    const sampled = sampleExperience(state.progress, state.reducedMotion);
    const damping = state.reducedMotion ? 30 : experience.runtime.cameraDamping;
    const alpha = 1 - Math.exp(-damping * delta);
    const influence = state.reducedMotion ? 0 : experience.runtime.pointerInfluence;

    const desired = new THREE.Vector3(...sampled.camera.position);
    desired.x += state.pointer.x * influence;
    desired.y += state.pointer.y * influence * 0.65;
    camera.position.lerp(desired, alpha);
    target.current.lerp(new THREE.Vector3(...sampled.camera.target), alpha);
    camera.lookAt(target.current);

    if ("fov" in camera) {
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = THREE.MathUtils.lerp(perspective.fov, sampled.camera.fov, alpha);
      perspective.updateProjectionMatrix();
    }

    frame.current += 1;
    if (frame.current % 12 === 0) {
      useExperienceStore.getState().setCameraTelemetry({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.current.x, target.current.y, target.current.z],
        fov: "fov" in camera ? (camera as THREE.PerspectiveCamera).fov : sampled.camera.fov,
      });
    }
  });
  return null;
}
