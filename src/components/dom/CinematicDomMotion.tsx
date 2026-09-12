"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createCinematicDom, type CinematicCue } from "@/src/lib/cinematicDom";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { useExperienceStore } from "@/src/store/experienceStore";
import { getSceneIndex } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { sampleSceneMotion } from "@/src/lib/motionSequencer";
import type { ExperienceConfig } from "@/src/types/experience";

export function CinematicDomMotion({ children, cues, experience }: { children: ReactNode; cues: readonly CinematicCue[]; experience: ExperienceConfig }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useExperienceStore((s) => s.reducedMotion);
  useEffect(() => {
    if (reduced || !root.current) return;
    const element = root.current;
    const viewport = matchMedia("(max-width: 760px)");
    let motion: ReturnType<typeof createCinematicDom> | undefined;
    let lastProgress = useExperienceStore.getState().progress;
    const rebuild = () => {
      motion?.revert();
      motion = createCinematicDom(element, cues, viewport.matches);
      motion.seek(lastProgress);
    };
    const renderSequencer = (progress: number) => {
      const index = getSceneIndex(progress, experience);
      const scene = experience.scenes[index];
      const state = sampleSceneMotion(scene, remap01(progress, scene.range[0], scene.range[1]), viewport.matches).copy;
      const panel = element.querySelector<HTMLElement>(`[data-motion-scene="${index}"] .story-panel`);
      if (panel) {
        panel.style.opacity = String(state.opacity);
        panel.style.translate = `0 ${state.y}px`;
        panel.style.filter = `blur(${state.blur}px)`;
      }
    };
    rebuild();
    renderSequencer(lastProgress);
    const unsubscribeFrame = cinematicProgress.subscribe((progress) => {
      lastProgress = progress;
      motion?.seek(progress);
      renderSequencer(progress);
    });
    const unsubscribeStore = useExperienceStore.subscribe((state) => {
      if (state.webglStatus !== "ready") {
        lastProgress = state.progress;
        motion?.seek(lastProgress);
        renderSequencer(lastProgress);
      }
    });
    viewport.addEventListener("change", rebuild);
    return () => {
      unsubscribeFrame();
      unsubscribeStore();
      viewport.removeEventListener("change", rebuild);
      motion?.revert();
    };
  }, [cues, experience, reduced]);
  return <div ref={root} className="cinematic-dom">{children}</div>;
}
