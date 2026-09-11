"use client";
import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { NarrativeOverlay } from "@/src/components/dom/NarrativeOverlay";
import { CinematicMedia } from "@/src/components/dom/CinematicMedia";
import { ProgressRail } from "@/src/components/dom/ProgressRail";
import { HotspotDialog } from "@/src/components/dom/HotspotDialog";
import { SiteChrome } from "@/src/components/dom/SiteChrome";
import { WebGLBoundary } from "@/src/components/runtime/WebGLBoundary";
import { ScrollController } from "@/src/runtime/ScrollController";
import { PointerController } from "@/src/runtime/PointerController";
import { SystemProfile } from "@/src/runtime/SystemProfile";
import { KeyboardController } from "@/src/runtime/KeyboardController";
import { useExperienceStore } from "@/src/store/experienceStore";
const SceneCanvas = dynamic(
  () => import("@/src/components/three/SceneCanvas").then((m) => m.SceneCanvas),
  { ssr: false },
);
const LabControls = dynamic(() =>
  import("@/src/components/dom/LabControls").then((m) => m.LabControls),
);
const DebugHUD = dynamic(() =>
  import("@/src/components/dom/DebugHUD").then((m) => m.DebugHUD),
);
function RuntimeStatus() {
  const status = useExperienceStore((s) => s.webglStatus);
  const errors = useExperienceStore((s) => s.assetErrors);
  if (status === "ready" && !Object.keys(errors).length) return null;
  return (
    <aside className="runtime-notice" role="status" aria-live="polite">
      {status === "loading"
        ? "The 3D view is loading. All content is available below."
        : status === "lost"
          ? "The 3D view was interrupted. Your content remains available."
          : status === "failed"
            ? "The 3D view is unavailable. You can continue reading."
            : "Some visual assets are unavailable. You can continue reading."}
      {status !== "loading" && (
        <button
          onClick={async () => {
            const { useGLTF, useTexture } = await import("@react-three/drei");
            const { experience } = await import("@/src/lib/experience");
            for (const url of [
              experience.heroModel,
              experience.heroLowModel,
              ...experience.assets.flatMap((a) => [
                a.url,
                a.kind === "model" ? a.lowUrl : undefined,
              ]),
            ].filter((x): x is string => !!x)) {
              useGLTF.clear(url);
              useTexture.clear(url);
            }
            useExperienceStore.getState().retry();
          }}
        >
          Retry 3D
        </button>
      )}
    </aside>
  );
}
export function ExperienceRuntime({ children }: { children?: ReactNode }) {
  const pathname = usePathname(),
    lab = pathname === "/lab";
  const ready = useExperienceStore((s) => s.profileReady),
    motion = useExperienceStore((s) => s.reducedMotion),
    debug = useExperienceStore((s) => s.debug),
    generation = useExperienceStore((s) => s.retryGeneration);
  useEffect(() => {
    const s = useExperienceStore.getState();
    s.resetLab();
    s.setDebug(lab || process.env.NEXT_PUBLIC_DEBUG_3D === "true");
  }, [lab]);
  // The normal-flow authoring specimen has no cinematic runtime. The canvas
  // remains persistent when navigating between the experience and scene lab.
  if (pathname === "/design") return <>{children}</>;
  return (
    <div className="experience-root" data-reduced-motion={motion} data-media-motion={!motion} data-lab={lab}>
      <SystemProfile />
      <ScrollController />
      <PointerController />
      <KeyboardController />
      <SiteChrome />
      {ready && (
        <WebGLBoundary key={generation}>
          <SceneCanvas />
        </WebGLBoundary>
      )}
      <NarrativeOverlay />
      <CinematicMedia />
      <ProgressRail />
      <HotspotDialog />
      <RuntimeStatus />
      {debug && <DebugHUD />}
      {lab && <LabControls />}
      {children}
    </div>
  );
}
