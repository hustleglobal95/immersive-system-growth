"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getSceneIndex } from "@/src/lib/experience";
import { clamp01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";

export function ScrollController() {
  const setScrollState = useExperienceStore((state) => state.setScrollState);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1 });

    const onScroll = (event: { progress?: number; velocity?: number; direction?: number }) => {
      const progress = clamp01(event.progress ?? 0);
      setScrollState(progress, event.velocity ?? 0, event.direction ?? 0, getSceneIndex(progress));
      ScrollTrigger.update();
    };

    lenis.on("scroll", onScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [setScrollState]);
  return null;
}
