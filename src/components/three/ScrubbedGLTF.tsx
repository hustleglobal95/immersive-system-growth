"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { experience } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { Vec3 } from "@/src/types/experience";

export function ScrubbedGLTF({ url, sceneId, clip, position = [0,0,0], rotation = [0,0,0], scale = 1 }: { url: string; sceneId: string; clip?: string; position?: Vec3; rotation?: Vec3; scale?: number }) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(url);
  const { actions, names, mixer } = useAnimations(gltf.animations, group);
  const scene = experience.scenes.find((item) => item.id === sceneId);
  const actionName = clip ?? names[0];
  const action = actionName ? actions[actionName] : undefined;

  useEffect(() => {
    if (!action) return;
    action.reset().play();
    action.paused = true;
    return () => { action.stop(); };
  }, [action]);

  useFrame(() => {
    if (!scene || !action || !action.getClip()) return;
    const progress = useExperienceStore.getState().progress;
    const local = remap01(progress, scene.range[0], scene.range[1]);
    action.time = action.getClip().duration * local;
    mixer.update(0);
  });

  return <group ref={group} position={position} rotation={rotation} scale={scale}><primitive object={gltf.scene} /></group>;
}
