"use client";
import { useEffect } from "react";
import { useExperienceStore } from "@/src/store/experienceStore";
import { inferDeviceCeiling } from "@/src/lib/quality";
export function SystemProfile() {
  useEffect(() => {
    const store = useExperienceStore.getState();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      useExperienceStore.getState().setSystemReducedMotion(media.matches);
    sync();
    const nav = navigator as Navigator & { deviceMemory?: number };
    const forced = process.env.NEXT_PUBLIC_FORCE_QUALITY;
    store.setProfile(
      inferDeviceCeiling(
        nav.deviceMemory ?? 4,
        navigator.hardwareConcurrency ?? 4,
        window.innerWidth < 760,
      ),
      forced === "low" || forced === "medium" || forced === "high"
        ? forced
        : "auto",
    );
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return null;
}
