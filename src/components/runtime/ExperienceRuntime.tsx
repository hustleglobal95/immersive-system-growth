"use client";

import { SceneCanvas } from "@/src/components/three/SceneCanvas";
import { NarrativeOverlay } from "@/src/components/dom/NarrativeOverlay";
import { ProgressRail } from "@/src/components/dom/ProgressRail";
import { HotspotDialog } from "@/src/components/dom/HotspotDialog";
import { DebugHUD } from "@/src/components/dom/DebugHUD";
import { SiteChrome } from "@/src/components/dom/SiteChrome";
import { LoadingOverlay } from "@/src/components/dom/LoadingOverlay";
import { LabControls } from "@/src/components/dom/LabControls";
import { WebGLBoundary } from "@/src/components/runtime/WebGLBoundary";
import { AssetPreloader } from "@/src/components/runtime/AssetPreloader";
import { ScrollController } from "@/src/runtime/ScrollController";
import { PointerController } from "@/src/runtime/PointerController";
import { SystemProfile } from "@/src/runtime/SystemProfile";
import { KeyboardController } from "@/src/runtime/KeyboardController";
import { experience } from "@/src/lib/experience";

export function ExperienceRuntime({ forceDebug = false, lab = false }: { forceDebug?: boolean; lab?: boolean }) {
  return (
    <div className="experience-root">
      <ScrollController />
      <PointerController />
      <SystemProfile forceDebug={forceDebug} />
      <KeyboardController />
      <AssetPreloader />
      <SiteChrome />
      <WebGLBoundary><SceneCanvas /></WebGLBoundary>
      <LoadingOverlay />
      <NarrativeOverlay />
      <ProgressRail />
      <HotspotDialog />
      <DebugHUD />
      {lab && <LabControls />}
      <main className="scroll-space" aria-label={experience.meta.name}>
        {experience.scenes.map((scene) => (
          <section key={scene.id} className="scroll-marker" style={{ height: `${experience.runtime.sceneHeightVh}svh` }} aria-label={scene.label} />
        ))}
      </main>
    </div>
  );
}
