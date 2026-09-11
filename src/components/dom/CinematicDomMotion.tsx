"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createCinematicDom, type CinematicCue } from "@/src/lib/cinematicDom";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { useExperienceStore } from "@/src/store/experienceStore";

export function CinematicDomMotion({ children, cues }: { children: ReactNode; cues: readonly CinematicCue[] }) {
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
    rebuild();
    const unsubscribeFrame = cinematicProgress.subscribe((progress) => {
      lastProgress = progress;
      motion?.seek(progress);
    });
    const unsubscribeStore = useExperienceStore.subscribe((state) => {
      if (state.webglStatus !== "ready") {
        lastProgress = state.progress;
        motion?.seek(lastProgress);
      }
    });
    viewport.addEventListener("change", rebuild);
    return () => {
      unsubscribeFrame();
      unsubscribeStore();
      viewport.removeEventListener("change", rebuild);
      motion?.revert();
    };
  }, [cues, reduced]);
  return <div ref={root} className="cinematic-dom">{children}</div>;
}
