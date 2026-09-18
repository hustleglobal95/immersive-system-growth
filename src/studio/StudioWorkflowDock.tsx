"use client";

import { useCallback, useEffect, useState } from "react";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { StudioWorkflowGuide } from "@/src/studio/StudioWorkflowGuide";
import type { AssetManifest } from "@/src/types/assets";

const STORAGE_KEY = "forge-studio-v2";

const initialSnapshot = {
  experience: parseExperience(rawExperience),
  project: parseStudioProject(rawProject),
  manifest: rawAssetManifest as AssetManifest,
  graph: parseInteractionGraph(rawInteractionGraph),
  validationCount: 0,
};

type Snapshot = typeof initialSnapshot;

export function StudioWorkflowDock() {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);

  const refresh = useCallback(() => setSnapshot(readSnapshot()), []);

  useEffect(() => {
    if (!open) return;
    refresh();
    const timer = window.setInterval(refresh, 700);
    return () => window.clearInterval(timer);
  }, [open, refresh]);

  const openWorkspace = (workspace: "Create" | "Motion" | "Assets" | "Ship", advanced: boolean) => {
    setOpen(false);
    window.setTimeout(() => {
      const nav = document.querySelector(".production-topbar nav");
      const button = [...(nav?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((item) => item.textContent?.trim() === workspace);
      button?.click();
      if (!advanced) return;
      window.setTimeout(() => {
        const advancedButton = [...document.querySelectorAll<HTMLButtonElement>(".production-stage-actions button")].find((item) => item.textContent?.trim() === "Advanced");
        advancedButton?.click();
      }, 40);
    }, 20);
  };

  const newProject = () => {
    setOpen(false);
    window.setTimeout(() => {
      const projectMenu = document.querySelector<HTMLDetailsElement>(".production-top-actions details");
      if (!projectMenu) return;
      projectMenu.open = true;
      const button = [...projectMenu.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === "New project");
      button?.click();
    }, 20);
  };

  return <>
    <button type="button" className="studio-workflow-launcher" onClick={() => { refresh(); setOpen(true); }}>
      <span>GUIDED BUILD</span>
      <strong>Start here</strong>
    </button>
    {open && <StudioWorkflowGuide
      project={snapshot.project}
      experience={snapshot.experience}
      manifest={snapshot.manifest}
      validationCount={snapshot.validationCount}
      onClose={() => setOpen(false)}
      onNewProject={newProject}
      onOpenCreate={() => openWorkspace("Create", false)}
      onOpenAssets={() => openWorkspace("Assets", true)}
      onOpenMotion={() => openWorkspace("Motion", true)}
      onOpenShip={() => openWorkspace("Ship", true)}
    />}
  </>;
}

function readSnapshot(): Snapshot {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialSnapshot;
    const raw = JSON.parse(stored) as { experience?: unknown; project?: unknown; assetManifest?: unknown; interactionGraph?: unknown };
    const experience = parseExperience(raw.experience ?? rawExperience);
    const project = parseStudioProject(raw.project ?? rawProject);
    const graph = parseInteractionGraph(raw.interactionGraph ?? rawInteractionGraph);
    const manifest = isAssetManifest(raw.assetManifest) ? raw.assetManifest : (rawAssetManifest as AssetManifest);
    return { experience, project, manifest, graph, validationCount: 0 };
  } catch {
    return { ...initialSnapshot, validationCount: 1 };
  }
}

function isAssetManifest(value: unknown): value is AssetManifest {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["models", "textures", "hdr", "video"].every((key) => Array.isArray(record[key])) && Boolean(record.budgets);
}
