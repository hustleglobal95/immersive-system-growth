"use client";
import { useEffect, useRef } from "react";
import { useAnimations } from "@react-three/drei";
import type { Group } from "three";
import type { Vec3 } from "@/src/types/experience";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { useExperienceStore } from "@/src/store/experienceStore";
export function AnimatedGLTF({
  url,
  clip,
  autoplay = true,
  timeScale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  url: string;
  clip?: string;
  autoplay?: boolean;
  timeScale?: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}) {
  const group = useRef<Group>(null),
    gltf = useModelInstance(url),
    motion = useExperienceStore((s) => s.reducedMotion);
  const { actions, names } = useAnimations(gltf.animations, group);
  const name = clip ?? names[0];
  useEffect(() => {
    const action = actions[name];
    if (!action || !autoplay || motion) return;
    action.reset();
    action.timeScale = timeScale;
    action.play();
    return () => {
      action.stop();
    };
  }, [actions, name, autoplay, timeScale, motion]);
  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}
