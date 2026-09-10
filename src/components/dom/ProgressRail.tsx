"use client";

import { experience, progressForScene } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function ProgressRail() {
  const activeScene = useExperienceStore((state) => state.activeScene);
  const progress = useExperienceStore((state) => state.progress);

  const jumpTo = (index: number) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: maxScroll * progressForScene(index), behavior: "smooth" });
  };

  return (
    <nav className="progress-rail" aria-label="Experience scenes">
      <div className="progress-rail__track"><span style={{ transform: `scaleY(${progress})` }} /></div>
      <div className="progress-rail__items">
        {experience.scenes.map((scene, index) => (
          <button key={scene.id} onClick={() => jumpTo(index)} className={index === activeScene ? "is-active" : ""} aria-current={index === activeScene ? "step" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span><em>{scene.label}</em>
          </button>
        ))}
      </div>
    </nav>
  );
}
