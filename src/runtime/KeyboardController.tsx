"use client";
import { useEffect } from "react";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
export function KeyboardController() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.shiftKey
      )
        return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          "input,textarea,select,button,a,[contenteditable=true],[role=dialog]",
        )
      )
        return;
      const s = useExperienceStore.getState();
      if (e.key.toLowerCase() === "d") {
        s.setDebug(!s.debug);
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = Math.max(
        0,
        Math.min(
          experience.scenes.length - 1,
          s.activeScene + (e.key === "ArrowRight" ? 1 : -1),
        ),
      );
      document
        .getElementById(experience.scenes[i].id)
        ?.scrollIntoView({ behavior: s.reducedMotion ? "instant" : "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
