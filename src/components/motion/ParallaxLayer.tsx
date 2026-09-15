"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export interface ParallaxLayerProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  axis?: "x" | "y";
  distance?: number;
}

/** Reversible ScrollTrigger parallax primitive for DOM depth composition. */
export function ParallaxLayer({
  children,
  className,
  speed = 0.3,
  axis = "y",
  distance = 120,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const travel = Math.max(-1, Math.min(1, speed)) * Math.max(0, distance);
    const from = axis === "y" ? { y: -travel } : { x: -travel };
    const to = axis === "y" ? { y: travel } : { x: travel };
    const tween = gsap.fromTo(element, from, {
      ...to,
      ease: "none",
      scrollTrigger: {
        trigger: element,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [axis, distance, speed]);

  return <div ref={ref} className={className}>{children}</div>;
}
