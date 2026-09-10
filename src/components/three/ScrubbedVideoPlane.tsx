"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { experience } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { Vec3 } from "@/src/types/experience";

export function ScrubbedVideoPlane({ src, sceneId, position = [0,0,0], rotation = [0,0,0], scale = [1.6,0.9,1] }: { src: string; sceneId: string; position?: Vec3; rotation?: Vec3; scale?: Vec3 }) {
  const scene = experience.scenes.find((item) => item.id === sceneId);
  const [ready, setReady] = useState(false);
  const desiredTime = useRef(0);
  const video = useMemo(() => {
    if (typeof document === "undefined") return null;
    const element = document.createElement("video");
    element.src = src;
    element.crossOrigin = "anonymous";
    element.muted = true;
    element.playsInline = true;
    element.preload = "auto";
    return element;
  }, [src]);
  const texture = useMemo(() => video ? new THREE.VideoTexture(video) : null, [video]);

  useEffect(() => {
    if (!video) return;
    const onReady = () => setReady(true);
    video.addEventListener("loadedmetadata", onReady);
    video.load();
    return () => { video.removeEventListener("loadedmetadata", onReady); video.pause(); texture?.dispose(); };
  }, [texture, video]);

  useFrame((_, delta) => {
    if (!ready || !video || !scene || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const progress = useExperienceStore.getState().progress;
    desiredTime.current = remap01(progress, scene.range[0], scene.range[1]) * Math.max(0, video.duration - 0.02);
    const difference = desiredTime.current - video.currentTime;
    if (Math.abs(difference) > 0.24) video.currentTime = desiredTime.current;
    else video.currentTime += difference * Math.min(1, delta * 12);
  });

  if (!texture) return null;
  return <mesh position={position} rotation={rotation} scale={scale}><planeGeometry args={[1,1]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}
