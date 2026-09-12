"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "@/src/store/experienceStore";
import {
  qualityInstanceCount,
  sampleInstancedField,
  visualSystemMode,
} from "@/src/platform/visualSystems";

const instance = new THREE.Object3D();

export function InstancedField({
  systemId = "ambient-field",
}: {
  systemId?: string;
}) {
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const visualSystems = useExperienceStore((state) => state.visualSystems);
  const system = visualSystems.systems.find(
    (candidate) => candidate.id === systemId && candidate.kind === "instanced-field",
  );
  const count = system ? qualityInstanceCount(system, quality) : 0;
  const mode = system ? visualSystemMode(system, quality, reducedMotion) : "hidden";
  const samples = useMemo(
    () => (system ? sampleInstancedField(system, count) : []),
    [system, count],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(
    () => (system ? new THREE.IcosahedronGeometry(system.size, 0) : null),
    [system],
  );
  const material = useMemo(
    () =>
      system
        ? new THREE.MeshStandardMaterial({
            color: system.color,
            emissive: system.accent,
            emissiveIntensity: 0.35,
            roughness: 0.42,
            metalness: 0.2,
            transparent: true,
            opacity: 0.82,
          })
        : null,
    [system],
  );

  useFrame(({ clock }) => {
    const target = mesh.current;
    if (!target || !system || !geometry || !material || mode === "hidden") return;
    const time = mode === "dynamic" ? clock.elapsedTime * system.motion : 0;
    samples.forEach((sample, index) => {
      const drift = mode === "dynamic" ? Math.sin(time * 0.6 + sample.phase) * 0.14 : 0;
      instance.position.set(
        sample.position[0] + drift,
        sample.position[1] + Math.cos(time * 0.45 + sample.phase) * 0.08,
        sample.position[2],
      );
      instance.rotation.set(
        sample.rotation[0] + time * 0.12,
        sample.rotation[1] + time * 0.16,
        sample.rotation[2],
      );
      const pulse = mode === "dynamic" ? 1 + Math.sin(time + sample.phase) * 0.12 : 1;
      instance.scale.setScalar(sample.scale * pulse);
      instance.updateMatrix();
      target.setMatrixAt(index, instance.matrix);
    });
    target.instanceMatrix.needsUpdate = true;
  });

  if (!system || !geometry || !material || mode === "hidden" || count === 0) return null;
  return (
    <instancedMesh
      key={systemId + "-" + quality + "-" + count}
      ref={mesh}
      args={[geometry, material, count]}
      position={[0, 0.4, -3.8]}
      frustumCulled={false}
    />
  );
}
