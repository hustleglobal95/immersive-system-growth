"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { experience, getSceneIndex } from "@/src/lib/experience";
import { clamp01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";
export function ScrollController() {
  const reducedMotion = useExperienceStore((s) => s.reducedMotion);
  const freeCamera = useExperienceStore((s) => s.freeCamera);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let last = window.scrollY,
      raf = 0;
    let geometry: {start:number;end:number}[]=[];
    const measure=()=>{const sections=Array.from(document.querySelectorAll<HTMLElement>(".story-section"));geometry=sections.map((s,i)=>({start:s.offsetTop,end:sections[i+1]?.offsetTop??document.documentElement.scrollHeight-window.innerHeight}));};
    measure();
    const sync = () => {
      let p = 0;
      for (let i = 0; i < geometry.length; i++) {
        const {start,end}=geometry[i];
        if (window.scrollY >= start) {
          const range = experience.scenes[i].range;
          p =
            range[0] +
            clamp01((window.scrollY - start) / Math.max(1, end - start)) *
              (range[1] - range[0]);
        }
      }
      const delta = window.scrollY - last;
      last = window.scrollY;
      useExperienceStore
        .getState()
        .setScrollState(
          p,
          Math.max(-100, Math.min(100, delta)),
          Math.sign(delta),
          getSceneIndex(p),
        );
    };
    // Native position is authoritative for restoration, resize, keyboard, anchors and Lenis alike.
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    const onResize = () => {
      measure();
      sync();
      ScrollTrigger.refresh();
    };
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pageshow", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);
    const lenis =
      reducedMotion || freeCamera
        ? null
        : new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    const update = () => {
      sync();
      ScrollTrigger.update();
    };
    lenis?.on("scroll", update);
    const tick = (time: number) => lenis?.raf(time * 1000);
    if (lenis) gsap.ticker.add(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onResize);
      gsap.ticker.remove(tick);
      lenis?.off("scroll", update);
      lenis?.destroy();
    };
  }, [reducedMotion, freeCamera]);
  return null;
}
