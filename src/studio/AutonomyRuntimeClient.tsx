"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ExperienceConfigProvider } from "@/src/components/runtime/ExperienceConfigContext";
import { CinematicMedia } from "@/src/components/dom/CinematicMedia";
import { CinematicTransitionLayers } from "@/src/components/dom/CinematicTransitionLayers";
import { ScrollController } from "@/src/runtime/ScrollController";
import { PointerController } from "@/src/runtime/PointerController";
import { KeyboardController } from "@/src/runtime/KeyboardController";
import { SystemProfile } from "@/src/runtime/SystemProfile";
import { InteractionGraphController } from "@/src/runtime/InteractionGraphController";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { ExperienceConfig } from "@/src/types/experience";

const SceneCanvas=dynamic(
  ()=>import("@/src/components/three/SceneCanvas").then((module)=>module.SceneCanvas),
  { ssr:false },
);

export function AutonomyRuntimeClient({
  experience,
  variant,
}:{
  experience:ExperienceConfig;
  variant:"incumbent"|"candidate";
}) {
  const runway=useMemo(()=>Math.max(
    experience.runtime.sceneHeightVh*experience.scenes.length,
    100/Math.min(...experience.scenes.map((scene)=>scene.range[1]-scene.range[0])),
  ),[experience]);

  return (
    <ExperienceConfigProvider value={experience}>
      <div
        className="experience-root autonomy-runtime"
        data-autonomy-runtime
        data-autonomy-variant={variant}
      >
        <SystemProfile />
        <ScrollController />
        <PointerController />
        <KeyboardController />
        <InteractionGraphController />
        <SceneCanvas />
        <CinematicMedia />
        <CinematicTransitionLayers />
        <main id="experience-content" className="narrative-document" aria-label={experience.meta.name}>
          {experience.scenes.map((scene,index)=>(
            <section
              key={scene.id}
              id={scene.id}
              className={"story-section story-section--"+(scene.copy.align ?? "left")}
              data-scene-id={scene.id}
              data-autonomy-scene-index={index}
              style={{
                minHeight:`${runway*(scene.range[1]-scene.range[0])+(index===experience.scenes.length-1?100:0)}svh`,
              }}
              aria-labelledby={scene.id+"-heading"}
            >
              <div className="story-panel">
                <div className="narrative-panel__index">{String(index+1).padStart(2,"0")}</div>
                {scene.copy.eyebrow && <p className="eyebrow">{scene.copy.eyebrow}</p>}
                {index===0
                  ? <h1 id={scene.id+"-heading"}>{scene.copy.headline}</h1>
                  : <h2 id={scene.id+"-heading"}>{scene.copy.headline}</h2>}
                <p className="narrative-body">{scene.copy.body}</p>
                {experience.hotspots.filter((hotspot)=>hotspot.sceneId===scene.id).map((hotspot)=>(
                  <details key={hotspot.id} data-autonomy-hotspot={hotspot.id}>
                    <summary data-forge-interaction={"hotspot-"+hotspot.id}>{hotspot.label}</summary>
                    <p>{hotspot.description}</p>
                  </details>
                ))}
                {scene.copy.cta && (
                  <a
                    className="forge-button"
                    href={scene.copy.cta.href}
                    data-forge-interaction={"cta-"+scene.id}
                    data-autonomy-primary-action
                  >
                    {scene.copy.cta.label}
                  </a>
                )}
              </div>
            </section>
          ))}
        </main>
        <AutonomyRuntimeProbe />
      </div>
    </ExperienceConfigProvider>
  );
}

function AutonomyRuntimeProbe() {
  const progress=useExperienceStore((state)=>state.progress);
  const activeScene=useExperienceStore((state)=>state.activeScene);
  const reducedMotion=useExperienceStore((state)=>state.reducedMotion);
  const webglStatus=useExperienceStore((state)=>state.webglStatus);
  const frameMs=useExperienceStore((state)=>state.rendererStats.frameMs);
  const quality=useExperienceStore((state)=>state.quality);
  const profileReady=useExperienceStore((state)=>state.profileReady);
  return (
    <output
      hidden
      data-autonomy-probe
      data-progress={progress.toFixed(6)}
      data-active-scene={activeScene}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-webgl-status={webglStatus}
      data-frame-ms={Number.isFinite(frameMs) ? frameMs.toFixed(3) : "0"}
      data-quality={quality}
      data-profile-ready={profileReady ? "true" : "false"}
    >
      autonomy runtime probe
    </output>
  );
}
