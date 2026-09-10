"use client";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
export function ProgressRail() {
  const active = useExperienceStore((s) => s.activeScene);
  return (
    <nav className="progress-rail" aria-label="Experience scenes">
      <ol className="progress-rail__items">
        {experience.scenes.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={i === active ? "step" : undefined}
              aria-label={s.label}
            >
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <em>{s.label}</em>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
