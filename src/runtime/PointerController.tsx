"use client";

import { useEffect } from "react";
import { useExperienceStore } from "@/src/store/experienceStore";

export function PointerController() {
  const setPointer = useExperienceStore((state) => state.setPointer);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      setPointer({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -((event.clientY / window.innerHeight) * 2 - 1),
      });
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointer);
  }, [setPointer]);

  return null;
}
