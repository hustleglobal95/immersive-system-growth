"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { AmbientLight, DirectionalLight, PointLight } from "three";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { useExperienceStore } from "@/src/store/experienceStore";
import { cinematicRenderProfile } from "@/src/lib/renderProfile";
export function SceneLighting() {
  const quality = useExperienceStore((state) => state.quality);
  const profile = cinematicRenderProfile(quality);
  const frame = useCinematicFrame(),
    ambient = useRef<AmbientLight>(null),
    key = useRef<DirectionalLight>(null),
    rim = useRef<PointLight>(null);
  useFrame(() => {
    const w = frame.current.world;
    if (ambient.current) ambient.current.intensity = w.ambient;
    if (key.current) { key.current.intensity = w.key; key.current.color.set(w.keyColor); }
    if (rim.current) { rim.current.intensity = w.rim; rim.current.color.set(w.rimColor); }
  });
  return (
    <>
      <ambientLight ref={ambient} />
      <directionalLight
        ref={key}
        position={[4, 6, 5]}
        color="#fff2df"
        castShadow
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-radius={profile.shadowRadius}
        shadow-bias={profile.shadowBias}
        shadow-normalBias={0.025}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight ref={rim} position={[-4, 1.5, -2]} color="#ff7a1a" />
    </>
  );
}
