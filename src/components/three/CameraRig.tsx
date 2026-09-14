"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { deriveCameraBank } from "@/src/lib/cameraMotion";
import { resolveRuntimeCameraSafety } from "@/src/lib/runtimeCameraSafety";
import { getSpatialBoundsSnapshot } from "@/src/runtime/spatialRegistry";
import type { LiveSpatialBoundInput } from "@/src/lib/spatialCamera";

export function CameraRig({ banking = false }: { banking?: boolean } = {}) {
  const experience = useExperienceConfig();
  const frame = useCinematicFrame();
  const target = useRef(new THREE.Vector3());
  const safetyOffset = useRef(new THREE.Vector3());
  const liveBounds = useRef<LiveSpatialBoundInput[]>([]);
  const tick = useRef(0);
  const previousPosition = useRef(new THREE.Vector3());
  const smoothedVelocity = useRef(new THREE.Vector3());
  const inertialOffset = useRef(new THREE.Vector3());

  useFrame(({ camera, size }, delta) => {
    const state = useExperienceStore.getState();
    if (state.freeCamera) return;
    const cinematic = frame.current.camera;
    const current = state.runtimeCamera ?? cinematic;
    const influence =
      state.reducedMotion || size.width < 760 || state.cameraPreview || state.runtimeCamera
        ? 0
        : experience.runtime.pointerInfluence;
    const authored: [number, number, number] = [
      current.position[0] + state.pointer.x * influence,
      current.position[1] + state.pointer.y * influence * 0.65,
      current.position[2],
    ];

    tick.current += 1;
    if (tick.current % 6 === 1) liveBounds.current = getSpatialBoundsSnapshot(1800);
    const safety = state.cameraPreview
      ? { correction: [0, 0, 0] as [number, number, number] }
      : resolveRuntimeCameraSafety(authored, liveBounds.current, 0.14);
    const desiredCorrection = new THREE.Vector3(...safety.correction);
    const safetyBlend = 1 - Math.exp(-Math.max(7, experience.runtime.cameraDamping) * Math.min(0.05, delta));
    safetyOffset.current.lerp(desiredCorrection, safetyBlend);

    const basePosition = new THREE.Vector3(
      authored[0] + safetyOffset.current.x,
      authored[1] + safetyOffset.current.y,
      authored[2] + safetyOffset.current.z,
    );

    if (!state.reducedMotion && !state.runtimeCamera && !state.cameraPreview) {
      if (previousPosition.current.lengthSq() === 0) previousPosition.current.copy(basePosition);
      const velocity = basePosition.clone().sub(previousPosition.current).divideScalar(Math.max(delta, 1 / 120));
      const velocityBlend = 1 - Math.exp(-5.5 * Math.min(delta, 0.05));
      smoothedVelocity.current.lerp(velocity, velocityBlend);

      // Small body-like inertia: the camera trails its authored path under acceleration,
      // then settles cleanly when scroll input stops. Magnitudes stay intentionally low.
      const desiredInertia = new THREE.Vector3(
        THREE.MathUtils.clamp(-smoothedVelocity.current.x * 0.007, -0.09, 0.09),
        THREE.MathUtils.clamp(-smoothedVelocity.current.y * 0.005, -0.06, 0.06),
        THREE.MathUtils.clamp(-smoothedVelocity.current.z * 0.003, -0.05, 0.05),
      );
      const inertiaBlend = 1 - Math.exp(-8 * Math.min(delta, 0.05));
      inertialOffset.current.lerp(desiredInertia, inertiaBlend);
    } else {
      inertialOffset.current.multiplyScalar(Math.exp(-12 * Math.min(delta, 0.05)));
    }

    camera.position.copy(basePosition).add(inertialOffset.current);
    previousPosition.current.copy(basePosition);

    target.current.set(...current.target);
    camera.lookAt(target.current);

    if (!state.runtimeCamera && !state.cameraPreview && !state.reducedMotion && (banking || hasDirectorMotion(frame.current.scene.motionTracks))) {
      const progress = frame.progress;
      const span = frame.current.scene.range[1] - frame.current.scene.range[0];
      const sampleDelta = Math.max(0.00005, span * 0.0075);
      const min = frame.current.scene.range[0] + 1e-7;
      const max = frame.current.scene.range[1] - 1e-7;
      const aspect = Math.max(0.2, size.width / Math.max(1, size.height));
      const previous = sampleExperience(Math.max(min, progress - sampleDelta), false, experience, aspect).camera.position;
      const next = sampleExperience(Math.min(max, progress + sampleDelta), false, experience, aspect).camera.position;
      const bank = deriveCameraBank(previous, current.position, next, 5);
      if (bank) {
        const speed = smoothedVelocity.current.length();
        const speedFactor = THREE.MathUtils.clamp(speed / 8, 0.35, 1);
        camera.rotateZ(THREE.MathUtils.degToRad(bank * speedFactor));
      }
    }

    if (
      camera instanceof THREE.PerspectiveCamera &&
      Math.abs(camera.fov - current.fov) > 0.0001
    ) {
      camera.fov = current.fov;
      camera.updateProjectionMatrix();
    }
    if (state.debug && tick.current % 12 === 0)
      state.setCameraTelemetry({
        position: camera.position.toArray() as [number, number, number],
        target: [...current.target],
        fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : current.fov,
      });
  });
  return null;
}

function hasDirectorMotion(tracks: readonly { id: string; muted: boolean }[]) {
  return tracks.some((track) => !track.muted && track.id.startsWith("director-"));
}
