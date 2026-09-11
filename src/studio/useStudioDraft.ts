"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseExperience } from "@/src/lib/configSchema";
import { parseStudioProject, type StudioProject } from "@/src/platform/studioSchema";
import type { ExperienceConfig } from "@/src/types/experience";

const STORAGE_KEY = "forge-studio-v2";

interface StoredDraft {
  experience: unknown;
  project: unknown;
}

export function useStudioDraft(initialExperience: ExperienceConfig, initialProject: StudioProject) {
  const [experience, setExperience] = useState(initialExperience);
  const [project, setProject] = useState(initialProject);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as StoredDraft;
        const nextExperience = parseExperience(draft.experience);
        const nextProject = parseStudioProject(draft.project);
        queueMicrotask(() => {
          setExperience(nextExperience);
          setProject(nextProject);
        });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      queueMicrotask(() => setHydrated(true));
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ experience, project }));
  }, [experience, hydrated, project]);

  const validation = useMemo(() => {
    const issues: string[] = [];
    const experienceIssue = parseSafe(() => parseExperience(experience));
    const projectIssue = parseSafe(() => parseStudioProject(project));
    if (experienceIssue) issues.push(experienceIssue);
    if (projectIssue) issues.push(projectIssue);
    return issues;
  }, [experience, project]);

  const reset = useCallback(() => {
    setExperience(initialExperience);
    setProject(initialProject);
    localStorage.removeItem(STORAGE_KEY);
  }, [initialExperience, initialProject]);

  return { experience, setExperience, project, setProject, validation, hydrated, reset };
}

function parseSafe(action: () => unknown) {
  try {
    action();
    return "";
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as { issues?: Array<{ path?: PropertyKey[]; message?: string }> }).issues ?? [];
      return issues.map((issue) => `${issue.path?.join(".") || "config"}: ${issue.message || "Invalid value"}`).join("; ");
    }
    return error instanceof Error ? error.message : "Unknown validation error";
  }
}

export function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
