"use client";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
export function WorldAtmosphere() {
  const frame = useCinematicFrame();
  const background = useRef<THREE.Color>(null);
  const fog = useRef<THREE.FogExp2>(null);
  useFrame(() => {
    const w = frame.current.world;
    background.current?.set(w.background);
    if (fog.current) {
      fog.current.color.set(w.fog);
      fog.current.density = w.fogDensity;
    }
  });
  return (
    <>
      <color ref={background} attach="background" args={["#070707"]} />
      <fogExp2 ref={fog} attach="fog" args={["#070707", 0.03]} />
    </>
  );
}
