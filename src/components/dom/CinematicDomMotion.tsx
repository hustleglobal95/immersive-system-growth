"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createCinematicDom, type CinematicCue } from "@/src/lib/cinematicDom";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { useExperienceStore } from "@/src/store/experienceStore";
import { getSceneIndex } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { sampleSceneMotion } from "@/src/lib/motionSequencer";
import { createCssMaskStyle, createMaskReveal } from "@/src/lib/maskReveal";
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
    // Each chapter arrives behind its own soft mask, built from the same first-party reveal
    // system the media plates use, so the copy opens with the shape of its own ground instead
    // of a hard clip line. The window starts in the previous chapter, because that is when the
    // section is rising into frame.
    const arrivals = experience.scenes.map((scene, index) => {
      if (!index) return null;
      const prior = experience.scenes[index - 1];
      const priorSpan = prior.range[1] - prior.range[0];
      const span = scene.range[1] - scene.range[0];
      const authored = scene.media?.mask;
      return {
        index,
        from: prior.range[0] + priorSpan * 0.78,
        to: scene.range[0] + span * 0.08,
        mask: createMaskReveal(authored?.preset ?? "linear-soft", {
          ...authored,
          direction: "down",
          softness: Math.max(26, authored?.softness ?? 30),
        }),
        last: -1,
      };
    });

    const renderArrivals = (progress: number) => {
      for (const arrival of arrivals) {
        if (!arrival) continue;
        const panel = element.querySelector<HTMLElement>(
          `[data-motion-scene="${arrival.index}"] .story-panel`,
        );
        if (!panel) continue;
        const p = Math.round(remap01(progress, arrival.from, arrival.to) * 200) / 200;
        if (p === arrival.last) continue;
        arrival.last = p;
        const style = createCssMaskStyle(p, arrival.mask);
        const image = String(style.maskImage ?? "none");
        panel.style.maskImage = image;
        panel.style.webkitMaskImage = image;
        panel.style.maskSize = String(style.maskSize ?? "100% 100%");
        panel.style.webkitMaskSize = String(style.maskSize ?? "100% 100%");
        panel.style.maskRepeat = String(style.maskRepeat ?? "no-repeat");
        panel.style.webkitMaskRepeat = String(style.maskRepeat ?? "no-repeat");
        panel.style.maskPosition = String(style.maskPosition ?? "center");
        panel.style.webkitMaskPosition = String(style.maskPosition ?? "center");
      }
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
    renderArrivals(lastProgress);
    const unsubscribeFrame = cinematicProgress.subscribe((progress) => {
      lastProgress = progress;
      motion?.seek(progress);
      renderSequencer(progress);
      renderArrivals(progress);
    });
    const unsubscribeStore = useExperienceStore.subscribe((state) => {
      if (state.webglStatus !== "ready") {
        lastProgress = state.progress;
        motion?.seek(lastProgress);
        renderSequencer(lastProgress);
        renderArrivals(lastProgress);
      }
    });
    viewport.addEventListener("change", rebuild);
    return () => {
      unsubscribeFrame();
      unsubscribeStore();
      viewport.removeEventListener("change", rebuild);
      motion?.revert();
      element.querySelectorAll<HTMLElement>(".story-panel").forEach((panel) => {
        panel.style.maskImage = "";
        panel.style.webkitMaskImage = "";
      });
    };
  }, [cues, experience, reduced]);
  return <div ref={root} className="cinematic-dom">{children}</div>;
}
