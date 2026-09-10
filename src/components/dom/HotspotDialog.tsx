"use client";

import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function HotspotDialog() {
  const selected = useExperienceStore((state) => state.selectedHotspot);
  const setSelected = useExperienceStore((state) => state.setSelectedHotspot);
  const hotspot = experience.hotspots.find((item) => item.id === selected);
  if (!hotspot) return null;

  return (
    <div className="hotspot-dialog" role="dialog" aria-modal="false" aria-label={hotspot.label}>
      <button className="hotspot-dialog__close" onClick={() => setSelected(null)} aria-label="Close hotspot">×</button>
      <p className="eyebrow">3D HOTSPOT</p>
      <h2>{hotspot.label}</h2>
      <p>{hotspot.description}</p>
    </div>
  );
}
