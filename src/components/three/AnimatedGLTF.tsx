"use client";

import { useEffect, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import type { Vec3 } from "@/src/types/experience";

export function AnimatedGLTF({ url, clip, autoplay = true, timeScale = 1, position = [0,0,0], rotation = [0,0,0], scale = 1 }: { url: string; clip?: string; autoplay?: boolean; timeScale?: number; position?: Vec3; rotation?: Vec3; scale?: number }) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(url);
  const { actions, names } = useAnimations(gltf.animations, group);
  const actionName = clip ?? names[0];

  useEffect(() => {
    const action = actionName ? actions[actionName] : undefined;
    if (!action || !autoplay) return;
    action.reset();
    action.timeScale = timeScale;
    action.play();
    return () => { action.stop(); };
  }, [actionName, actions, autoplay, timeScale]);

  return <group ref={group} position={position} rotation={rotation} scale={scale}><primitive object={gltf.scene} /></group>;
}
