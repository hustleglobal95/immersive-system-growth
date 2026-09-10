"use client";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations } from "@react-three/drei";
import { LoopOnce, type Group } from "three";
import type { Vec3 } from "@/src/types/experience";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { experience } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";
export function ScrubbedGLTF({
  url,
  sceneId,
  clip,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  url: string;
  sceneId: string;
  clip?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
}) {
  const group = useRef<Group>(null),
    gltf = useModelInstance(url),
    frame = useCinematicFrame();
  const { actions, names, mixer } = useAnimations(gltf.animations, group);
  const scene = experience.scenes.find((s) => s.id === sceneId),
    name = clip ?? names[0];
  const action = actions[name];
  useEffect(() => {
    if (!action) return;
    action.reset().setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = true;
    action.paused = true;
    return () => {
      action.stop();
    };
  }, [action]);
  useFrame(() => {
    if (!scene || !action) return;
    action.time =
      (useExperienceStore.getState().reducedMotion
        ? 0
        : remap01(frame.progress, ...scene.range)) * action.getClip().duration;
    action.enabled = true;
    mixer.update(0);
  });
  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}
