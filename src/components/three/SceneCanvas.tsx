"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { CameraRig } from "@/src/components/three/CameraRig";
import { PersistentHero } from "@/src/components/three/PersistentHero";
import { SceneLighting } from "@/src/components/three/SceneLighting";
import { WorldAtmosphere } from "@/src/components/three/WorldAtmosphere";
import { ParticleField } from "@/src/components/three/ParticleField";
import { Hotspots } from "@/src/components/three/Hotspots";
import { PostFX } from "@/src/components/three/PostFX";
import { AdaptiveQuality } from "@/src/components/three/AdaptiveQuality";
import { RenderStatsProbe } from "@/src/components/three/RenderStatsProbe";
import { LabOrbitControls } from "@/src/components/three/LabOrbitControls";
import { DemoStage } from "@/src/components/three/DemoStage";

export function SceneCanvas() {
  const quality = useExperienceStore((state) => state.quality);
  const max = experience.runtime.maxDpr;
  const min = experience.runtime.minDpr;
  const dpr: [number, number] = quality === "high" ? [min, max] : quality === "medium" ? [min, Math.min(1.5, max)] : [min, min];

  return (
    <div className="scene-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.35, 8.2], fov: 42, near: 0.05, far: 100 }} dpr={dpr} gl={{ antialias: quality !== "low", alpha: false, powerPreference: "high-performance" }} shadows={quality === "high"}>
        <Suspense fallback={null}>
          <AdaptiveQuality />
          <RenderStatsProbe />
          <WorldAtmosphere />
          <SceneLighting />
          <CameraRig />
          <LabOrbitControls />
          <DemoStage />
          <PersistentHero />
          <Hotspots />
          <ParticleField />
          <PostFX />
        </Suspense>
      </Canvas>
    </div>
  );
}
