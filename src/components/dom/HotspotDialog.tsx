"use client";
import { useEffect, useRef } from "react";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
export function HotspotDialog() {
  const selected = useExperienceStore((s) => s.selectedHotspot);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape")
        useExperienceStore.getState().setSelectedHotspot(null);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [selected]);
  const h = experience.hotspots.find((x) => x.id === selected);
  if (!h) return null;
  return (
    <div
      ref={panel}
      tabIndex={-1}
      className="hotspot-dialog"
      role="dialog"
      aria-modal="false"
      aria-labelledby="hotspot-title"
    >
      <button
        className="hotspot-dialog__close"
        onClick={() => useExperienceStore.getState().setSelectedHotspot(null)}
        aria-label="Close hotspot"
      >
        ×
      </button>
      <h2 id="hotspot-title">{h.label}</h2>
      <p>{h.description}</p>
    </div>
  );
}
