"use client";

import { createElement, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, SplitText);

type SplitMode = "lines" | "words" | "chars";

export interface CinematicTextRevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  mode?: SplitMode;
  start?: string;
  once?: boolean;
  stagger?: number;
  yPercent?: number;
}

/**
 * Forge-native masked typography reveal. It uses GSAP only (already a runtime
 * dependency), auto-reverts SplitText markup, and becomes static under reduced motion.
 */
export function CinematicTextReveal({
  children,
  as: Tag = "div",
  className,
  mode = "lines",
  start = "top 88%",
  once = true,
  stagger,
  yPercent = 108,
}: CinematicTextRevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const split = SplitText.create(element, {
      type: mode === "lines" ? "lines" : `lines,${mode}`,
      mask: "lines",
      autoSplit: true,
      linesClass: "forge-split-line",
    });
    const targets = mode === "chars" ? split.chars : mode === "words" ? split.words : split.lines;
    const tween = gsap.from(targets, {
      yPercent,
      opacity: 0,
      duration: 1.05,
      stagger: stagger ?? (mode === "chars" ? 0.018 : mode === "words" ? 0.045 : 0.085),
      ease: "expo.out",
      scrollTrigger: {
        trigger: element,
        start,
        once,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      split.revert();
    };
  }, [mode, once, stagger, start, yPercent]);

  return createElement(Tag, {
    ref: (node: HTMLElement | null) => {
      ref.current = node;
    },
    className,
  }, children);
}
