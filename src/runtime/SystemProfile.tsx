"use client";

import { useEffect } from "react";
import type { QualityTier } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";

function inferQuality(): QualityTier {
  const forced = process.env.NEXT_PUBLIC_FORCE_QUALITY;
  if (forced === "low" || forced === "medium" || forced === "high") return forced;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const narrow = window.innerWidth < 760;
  if (memory <= 4 || cores <= 4) return "low";
  if (narrow || memory <= 8 || cores <= 8) return "medium";
  return "high";
}

export function SystemProfile({ forceDebug = false }: { forceDebug?: boolean }) {
  const setQuality = useExperienceStore((state) => state.setQuality);
  const setReducedMotion = useExperienceStore((state) => state.setReducedMotion);
  const setDebug = useExperienceStore((state) => state.setDebug);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    setQuality(inferQuality());
    setDebug(forceDebug || process.env.NEXT_PUBLIC_DEBUG_3D === "true");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [forceDebug, setDebug, setQuality, setReducedMotion]);
  return null;
}
