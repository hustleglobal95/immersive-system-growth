"use client";
import { lazy, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { CameraRig } from "./CameraRig";
import { PersistentHero, HeroFallback } from "./PersistentHero";
import { SceneLighting } from "./SceneLighting";
import { WorldAtmosphere } from "./WorldAtmosphere";
import { ParticleField } from "./ParticleField";
import { Hotspots } from "./Hotspots";
import { PostFX } from "./PostFX";
import { AdaptiveQuality } from "./AdaptiveQuality";
import { RenderStatsProbe } from "./RenderStatsProbe";
import { LabOrbitControls } from "./LabOrbitControls";
import { DemoStage } from "./DemoStage";
import { CinematicFrame } from "./CinematicFrame";
import { RendererLifecycle } from "./RendererLifecycle";
import { SceneAssets } from "./SceneAssets";
import { AssetBoundary } from "./AssetBoundary";
import { MaskedMediaLayer } from "./MaskedMediaLayer";
function CanvasFallback() {
  useEffect(() => useExperienceStore.getState().setWebglStatus("failed"), []);
  return null;
}
const LabGuides = lazy(() =>
  import("./LabGuides").then((m) => ({ default: m.LabGuides })),
);
export function SceneCanvas() {
  const guides = useExperienceStore((s) => s.guides);
  const quality = useExperienceStore((s) => s.quality);
  const camera = experience.scenes[0].camera.from;
  return (
    <div className="scene-canvas" aria-hidden="true">
      <Canvas
        camera={{
          position: camera.position,
          fov: camera.fov,
          near: 0.05,
          far: 100,
        }}
        dpr={1}
        gl={{ antialias: false, alpha: false, powerPreference: "default" }}
        shadows={quality === "high"}
        fallback={<CanvasFallback />}
      >
        <RendererLifecycle />
        <RenderStatsProbe />
        <AdaptiveQuality />
        <CinematicFrame>
          <WorldAtmosphere />
          <SceneLighting />
          <CameraRig />
          <LabOrbitControls />
          {guides && (
            <Suspense fallback={null}>
              <LabGuides />
            </Suspense>
          )}
          {experience.stage === "demo" ? (
            <DemoStage />
          ) : (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -1.25, 0]}
              receiveShadow
            >
              <planeGeometry args={[80, 80]} />
              <meshStandardMaterial color="#171717" roughness={0.9} />
            </mesh>
          )}
          <AssetBoundary
            id="hero"
            fallback={experience.heroVisible ? <HeroFallback /> : null}
          >
            <PersistentHero />
          </AssetBoundary>
          <SceneAssets />
          <Hotspots />
          <ParticleField />
          <MaskedMediaLayer />
          <PostFX />
        </CinematicFrame>
      </Canvas>
    </div>
  );
}
