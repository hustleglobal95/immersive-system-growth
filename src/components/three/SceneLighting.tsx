"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight, PointLight } from "three";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
export function SceneLighting() {
  const frame = useCinematicFrame(),
    ambient = useRef<AmbientLight>(null),
    key = useRef<DirectionalLight>(null),
    rim = useRef<PointLight>(null);
  useFrame(() => {
    const w = frame.current.world;
    if (ambient.current) ambient.current.intensity = w.ambient;
    if (key.current) key.current.intensity = w.key;
    if (rim.current) rim.current.intensity = w.rim;
  });
  return (
    <>
      <ambientLight ref={ambient} />
      <directionalLight
        ref={key}
        position={[4, 6, 5]}
        color="#fff2df"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight ref={rim} position={[-4, 1.5, -2]} color="#ff7a1a" />
    </>
  );
}
