"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

export interface MagneticSurfaceProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

/** Fine-pointer-only magnetic interaction for premium CTA and control surfaces. */
export function MagneticSurface({ children, className, strength = 0.22 }: MagneticSurfaceProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    const amount = Math.max(0, Math.min(0.5, strength));
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      gsap.to(element, { x: x * amount, y: y * amount, duration: 0.32, ease: "power3.out", overwrite: true });
    };
    const leave = () => gsap.to(element, { x: 0, y: 0, duration: 0.55, ease: "expo.out", overwrite: true });
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(element);
    };
  }, [strength]);

  return <div ref={ref} className={className}>{children}</div>;
}
