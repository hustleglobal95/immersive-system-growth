"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
export function CameraRig() {
  const frame = useCinematicFrame();
  const target = useRef(new THREE.Vector3());
  const tick = useRef(0);
  useFrame(({ camera, size }) => {
    const s = useExperienceStore.getState();
    if (s.freeCamera) return;
    const c = frame.current.camera;
    const influence =
      s.reducedMotion || size.width < 760 || s.cameraPreview
        ? 0
        : experience.runtime.pointerInfluence;
    camera.position.set(
      c.position[0] + s.pointer.x * influence,
      c.position[1] + s.pointer.y * influence * 0.65,
      c.position[2],
    );
    target.current.set(...c.target);
    camera.lookAt(target.current);
    if (
      camera instanceof THREE.PerspectiveCamera &&
      Math.abs(camera.fov - c.fov) > 0.0001
    ) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }
    if (s.debug && ++tick.current % 12 === 0)
      s.setCameraTelemetry({
        position: camera.position.toArray() as [number, number, number],
        target: [...c.target],
        fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : c.fov,
      });
  });
  return null;
}
