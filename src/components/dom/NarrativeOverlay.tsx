"use client";

import Link from "next/link";
import { experience } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";

function panelVisibility(progress: number, range: [number, number]) {
  const local = remap01(progress, range[0], range[1]);
  const fadeIn = Math.min(1, local / 0.16);
  const fadeOut = Math.min(1, (1 - local) / 0.18);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

export function NarrativeOverlay() {
  const progress = useExperienceStore((state) => state.progress);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);

  return (
    <div className="narrative-overlay">
      {experience.scenes.map((scene, index) => {
        const local = remap01(progress, scene.range[0], scene.range[1]);
        const opacity = reducedMotion ? (progress >= scene.range[0] && progress <= scene.range[1] ? 1 : 0) : panelVisibility(progress, scene.range);
        const translate = reducedMotion ? 0 : (0.5 - local) * 56;
        return (
          <section
            key={scene.id}
            className={`narrative-panel narrative-panel--${scene.copy.align ?? "left"}`}
            style={{ opacity, transform: `translate3d(0, ${translate}px, 0)`, pointerEvents: opacity > 0.55 ? "auto" : "none" }}
            aria-hidden={opacity < 0.05}
          >
            <div className="narrative-panel__index">{String(index + 1).padStart(2, "0")}</div>
            {scene.copy.eyebrow && <p className="eyebrow">{scene.copy.eyebrow}</p>}
            <h1>{scene.copy.headline}</h1>
            <p className="narrative-body">{scene.copy.body}</p>
            {scene.copy.cta && <Link className="forge-button" href={scene.copy.cta.href}>{scene.copy.cta.label}</Link>}
          </section>
        );
      })}
    </div>
  );
}
