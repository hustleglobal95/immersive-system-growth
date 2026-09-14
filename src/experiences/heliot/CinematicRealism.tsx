'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  Points,
  PointsMaterial,
} from 'three';
import { useCinematicFrame } from '@/src/components/three/CinematicFrame';
import { useExperienceStore } from '@/src/store/experienceStore';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Sparse suspended particulate gives the camera something physical to travel through.
 * The field is deterministic, cheap, and intentionally strongest around the threshold
 * and interior chapters where depth cues matter most.
 */
function SuspendedParticulate() {
  const frame = useCinematicFrame();
  const points = useRef<Points>(null);
  const material = useRef<PointsMaterial>(null);
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);

  const geometry = useMemo(() => {
    const count = quality === 'low' ? 90 : 220;
    const positions = new Float32Array(count * 3);
    let seed = 271828;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i += 1) {
      // A long, narrow volume follows the actual approach -> passage -> gallery route.
      const t = random();
      const spread = 1.2 + t * 5.4;
      positions[i * 3] = (random() - 0.5) * spread;
      positions[i * 3 + 1] = -0.9 + random() * 6.2;
      positions[i * 3 + 2] = 8 - t * 29;
    }

    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return result;
  }, [quality]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const p = frame.progress;
    const enter = clamp01((p - 0.08) / 0.12);
    const leave = 1 - clamp01((p - 0.76) / 0.13);
    const strength = enter * leave;

    if (points.current) {
      points.current.visible = strength > 0.01;
      if (!reducedMotion) {
        points.current.position.y = Math.sin(state.clock.elapsedTime * 0.17) * 0.045;
        points.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.06) * 0.008;
      }
    }
    if (material.current) material.current.opacity = 0.12 * strength;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        color="#dfc79f"
        size={0.026}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/** Warm practical pools make the descent and gallery feel lit by architecture rather
 * than by a generic studio. Intensities follow story progress so exterior shots stay clean. */
function ArchitecturalPracticals() {
  const frame = useCinematicFrame();
  const threshold = useRef<Group>(null);
  const gallery = useRef<Group>(null);

  useFrame(() => {
    const p = frame.progress;
    const thresholdStrength = clamp01((p - 0.12) / 0.08) * (1 - clamp01((p - 0.36) / 0.1));
    const galleryStrength = clamp01((p - 0.23) / 0.12) * (1 - clamp01((p - 0.78) / 0.1));

    if (threshold.current) {
      threshold.current.visible = thresholdStrength > 0.01;
      threshold.current.traverse((object) => {
        if ('intensity' in object) (object as unknown as { intensity: number }).intensity = 7 * thresholdStrength;
      });
    }
    if (gallery.current) {
      gallery.current.visible = galleryStrength > 0.01;
      gallery.current.traverse((object) => {
        if ('intensity' in object) (object as unknown as { intensity: number }).intensity = 5 * galleryStrength;
      });
    }
  });

  return (
    <>
      <group ref={threshold}>
        <pointLight position={[-0.8, 0.4, -3.6]} color="#e5ad6c" distance={7} decay={2.1} />
        <pointLight position={[0.8, 0.1, -5.4]} color="#c88b52" distance={6} decay={2.2} />
      </group>
      <group ref={gallery}>
        <pointLight position={[-5.4, 1.4, -13]} color="#d9b175" distance={8} decay={2.2} />
        <pointLight position={[5.4, 1.0, -17]} color="#bc8450" distance={8} decay={2.2} />
      </group>
    </>
  );
}

/**
 * Soft geometric shafts are intentionally subtle: they provide participating-media
 * cues without a full-screen volumetric post pass or another heavy render target.
 */
function LightShafts() {
  const frame = useCinematicFrame();
  const root = useRef<Group>(null);
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);

  useFrame(() => {
    const p = frame.progress;
    const strength = clamp01((p - 0.2) / 0.1) * (1 - clamp01((p - 0.68) / 0.12));
    if (root.current) root.current.visible = strength > 0.01;
    for (const mesh of [a.current, b.current]) {
      const material = mesh?.material;
      if (material && !Array.isArray(material) && 'opacity' in material) {
        material.opacity = 0.035 * strength;
      }
    }
  });

  return (
    <group ref={root}>
      <mesh ref={a} position={[-2.8, 2.5, -12]} rotation={[Math.PI / 2, 0.18, 0.08]}>
        <coneGeometry args={[2.6, 10, 32, 1, true]} />
        <meshBasicMaterial color="#f3c989" transparent opacity={0} depthWrite={false} side={2} blending={AdditiveBlending} />
      </mesh>
      <mesh ref={b} position={[3.4, 2.1, -17]} rotation={[Math.PI / 2, -0.14, -0.08]}>
        <coneGeometry args={[2.2, 9, 32, 1, true]} />
        <meshBasicMaterial color="#d6a66c" transparent opacity={0} depthWrite={false} side={2} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}

/** One lightweight pass of physical scale/depth cues layered onto the authored world. */
export function CinematicRealism() {
  return (
    <>
      <SuspendedParticulate />
      <ArchitecturalPracticals />
      <LightShafts />
    </>
  );
}
