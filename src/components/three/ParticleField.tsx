"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { qualityInstanceCount, sampleInstancedField, visualSystemMode } from "@/src/platform/visualSystems";
import { useExperienceStore } from "@/src/store/experienceStore";
import { governedParticleCount } from "@/src/lib/renderGovernor";

const particleSamples = (system: Parameters<typeof sampleInstancedField>[0] | undefined, count: number) =>
  system ? sampleInstancedField(system, count) : [];

export function ParticleField({
  systemId = "product-particles",
}: {
  systemId?: string;
}) {
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const governorTier = useExperienceStore((state) => state.renderGovernor.tier);
  const visualSystems = useExperienceStore((state) => state.visualSystems);
  const system = visualSystems.systems.find(
    (candidate) => candidate.id === systemId && candidate.kind === "particle-field",
  );
  const authoredCount = system ? qualityInstanceCount(system, quality) : 0;
  const count = governedParticleCount(authoredCount,quality,governorTier);
  const mode = system ? visualSystemMode(system, quality, reducedMotion) : "hidden";
  const samples = useMemo(() => particleSamples(system, count), [system, count]);
  const positions = useMemo(
    () => new Float32Array(samples.flatMap((sample) => sample.position)),
    [samples],
  );
  const geometry = useMemo(() => {
    if (!system) return null;
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return next;
  }, [positions, system]);
  const material = useMemo(
    () =>
      system
        ? new THREE.PointsMaterial({
            color: system.color,
            size: system.size,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
          })
        : null,
    [system],
  );
  const points = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    const target = points.current;
    if (!target || !system || mode === "hidden") return;
    const position = target.geometry.getAttribute("position") as THREE.BufferAttribute;
    const time = mode === "dynamic" ? clock.elapsedTime * system.motion : 0;
    samples.forEach((sample, index) => {
      const drift = mode === "dynamic" ? Math.sin(time * 0.35 + sample.phase) * 0.16 : 0;
      position.setXYZ(
        index,
        sample.position[0] + drift,
        sample.position[1] + Math.cos(time * 0.25 + sample.phase) * 0.08,
        sample.position[2],
      );
    });
    position.needsUpdate = true;
  });

  if (!system || !geometry || !material || mode === "hidden" || count === 0) return null;
  return (
    <points
      key={systemId + "-" + quality + "-" + governorTier + "-" + count}
      ref={points}
      geometry={geometry}
      material={material}
      position={[0, 0.4, -3.5]}
    />
  );
}
