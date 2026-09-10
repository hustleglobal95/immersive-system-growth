"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/src/types/experience";

export function VideoPlane({ src, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1.6, 0.9, 1], loop = true }: { src: string; position?: Vec3; rotation?: Vec3; scale?: Vec3; loop?: boolean }) {
  const video = useMemo(() => {
    if (typeof document === "undefined") return null;
    const element = document.createElement("video");
    element.src = src;
    element.crossOrigin = "anonymous";
    element.loop = loop;
    element.muted = true;
    element.playsInline = true;
    element.preload = "metadata";
    return element;
  }, [loop, src]);
  const texture = useMemo(() => video ? new THREE.VideoTexture(video) : null, [video]);

  useEffect(() => {
    if (!video) return;
    void video.play().catch(() => undefined);
    return () => { video.pause(); texture?.dispose(); };
  }, [texture, video]);

  if (!texture) return null;
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
