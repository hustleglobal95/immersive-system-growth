"use client";

import { useEffect } from "react";
import { experience, progressForScene } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function KeyboardController() {
  const activeScene = useExperienceStore((state) => state.activeScene);
  const debug = useExperienceStore((state) => state.debug);
  const setDebug = useExperienceStore((state) => state.setDebug);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "d") setDebug(!debug);
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = Math.max(0, Math.min(experience.scenes.length - 1, activeScene + delta));
      const progress = progressForScene(next);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: maxScroll * progress, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeScene, debug, setDebug]);

  return null;
}
