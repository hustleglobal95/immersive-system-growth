"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject, type StudioProject } from "@/src/platform/studioSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";

const STORAGE_KEY = "forge-studio-v2";

interface StoredDraft {
  experience: unknown;
  project: unknown;
  assetManifest?: unknown;
  interactionGraph?: unknown;
}

export interface StudioProjectBundle {
  experience: ExperienceConfig;
  assetManifest: AssetManifest;
  interactionGraph: InteractionGraph;
}

export function useStudioDraft(
  initialExperience: ExperienceConfig,
  initialProject: StudioProject,
  initialAssetManifest: AssetManifest,
  initialInteractionGraph: InteractionGraph,
) {
  const [experience, setExperienceState] = useState(initialExperience);
  const experienceRef = useRef(initialExperience);
  const undoStack = useRef<ExperienceConfig[]>([]);
  const redoStack = useRef<ExperienceConfig[]>([]);
  const groupBase = useRef<ExperienceConfig | null>(null);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [project, setProject] = useState(initialProject);
  const [assetManifest, setAssetManifest] = useState(initialAssetManifest);
  const [interactionGraph, setInteractionGraph] = useState(initialInteractionGraph);
  const bundleUndoStack = useRef<StudioProjectBundle[]>([]);
  const bundleRedoStack = useRef<StudioProjectBundle[]>([]);
  const [bundleHistory, setBundleHistory] = useState({ undo: 0, redo: 0 });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as StoredDraft;
        const nextExperience = parseExperience(draft.experience);
        const nextProject = parseStudioProject(draft.project);
        const nextManifest = isAssetManifest(draft.assetManifest) ? draft.assetManifest : initialAssetManifest;
        const nextInteractionGraph = draft.interactionGraph
          ? parseInteractionGraph(draft.interactionGraph)
          : initialInteractionGraph;
        queueMicrotask(() => {
          experienceRef.current = nextExperience;
          setExperienceState(nextExperience);
          setProject(nextProject);
          setAssetManifest(nextManifest);
          setInteractionGraph(nextInteractionGraph);
        });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      queueMicrotask(() => setHydrated(true));
    }
  }, [initialAssetManifest, initialInteractionGraph]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ experience, project, assetManifest, interactionGraph }));
  }, [assetManifest, experience, hydrated, interactionGraph, project]);

  const setExperience = useCallback<Dispatch<SetStateAction<ExperienceConfig>>>((update) => {
    const current = experienceRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (next === current) return;
    if (!groupBase.current) {
      undoStack.current = [...undoStack.current.slice(-79), current];
      redoStack.current = [];
    }
    experienceRef.current = next;
    setExperienceState(next);
    setHistory({ undo: undoStack.current.length, redo: 0 });
  }, []);

  const beginExperienceGroup = useCallback(() => {
    groupBase.current ??= experienceRef.current;
  }, []);

  const endExperienceGroup = useCallback(() => {
    const base = groupBase.current;
    groupBase.current = null;
    if (!base || base === experienceRef.current) return;
    undoStack.current = [...undoStack.current.slice(-79), base];
    redoStack.current = [];
    setHistory({ undo: undoStack.current.length, redo: 0 });
  }, []);

  const undoExperience = useCallback(() => {
    if (groupBase.current) endExperienceGroup();
    const prior = undoStack.current.pop();
    if (!prior) return;
    redoStack.current.push(experienceRef.current);
    experienceRef.current = prior;
    setExperienceState(prior);
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }, [endExperienceGroup]);

  const redoExperience = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(experienceRef.current);
    experienceRef.current = next;
    setExperienceState(next);
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }, []);

  const applyProjectBundle = useCallback((input: StudioProjectBundle) => {
    const nextExperience=parseExperience(input.experience);
    const nextManifest=parseAssetManifest(input.assetManifest);
    const nextGraph=parseInteractionGraph(input.interactionGraph);
    bundleUndoStack.current=[
      ...bundleUndoStack.current.slice(-19),
      {experience:experienceRef.current,assetManifest,interactionGraph},
    ];
    bundleRedoStack.current=[];
    experienceRef.current=nextExperience;
    setExperienceState(nextExperience);
    setAssetManifest(nextManifest);
    setInteractionGraph(nextGraph);
    setBundleHistory({undo:bundleUndoStack.current.length,redo:0});
  },[assetManifest,interactionGraph]);

  const undoProjectBundle = useCallback(() => {
    const prior=bundleUndoStack.current.pop();
    if(!prior) return false;
    bundleRedoStack.current=[
      ...bundleRedoStack.current.slice(-19),
      {experience:experienceRef.current,assetManifest,interactionGraph},
    ];
    experienceRef.current=prior.experience;
    setExperienceState(prior.experience);
    setAssetManifest(prior.assetManifest);
    setInteractionGraph(prior.interactionGraph);
    setBundleHistory({undo:bundleUndoStack.current.length,redo:bundleRedoStack.current.length});
    return true;
  },[assetManifest,interactionGraph]);

  const redoProjectBundle = useCallback(() => {
    const next=bundleRedoStack.current.pop();
    if(!next) return false;
    bundleUndoStack.current=[
      ...bundleUndoStack.current.slice(-19),
      {experience:experienceRef.current,assetManifest,interactionGraph},
    ];
    experienceRef.current=next.experience;
    setExperienceState(next.experience);
    setAssetManifest(next.assetManifest);
    setInteractionGraph(next.interactionGraph);
    setBundleHistory({undo:bundleUndoStack.current.length,redo:bundleRedoStack.current.length});
    return true;
  },[assetManifest,interactionGraph]);

  const validation = useMemo(() => {
    const issues: string[] = [];
    const experienceIssue = parseSafe(() => parseExperience(experience));
    const projectIssue = parseSafe(() => parseStudioProject(project));
    const graphIssue = parseSafe(() => parseInteractionGraph(interactionGraph));
    if (experienceIssue) issues.push(experienceIssue);
    if (projectIssue) issues.push(projectIssue);
    if (graphIssue) issues.push(graphIssue);
    return issues;
  }, [experience, interactionGraph, project]);

  const loadDraft = useCallback((input: StoredDraft) => {
    const nextExperience = parseExperience(input.experience);
    const nextProject = parseStudioProject(input.project);
    const nextManifest = parseAssetManifest(input.assetManifest);
    const nextInteractionGraph = parseInteractionGraph(input.interactionGraph);
    experienceRef.current = nextExperience;
    setExperienceState(nextExperience);
    setProject(nextProject);
    setAssetManifest(nextManifest);
    setInteractionGraph(nextInteractionGraph);
    undoStack.current = [];
    redoStack.current = [];
    groupBase.current = null;
    bundleUndoStack.current = [];
    bundleRedoStack.current = [];
    setBundleHistory({ undo: 0, redo: 0 });
    setHistory({ undo: 0, redo: 0 });
  }, []);

  const reset = useCallback(() => {
    experienceRef.current = initialExperience;
    setExperienceState(initialExperience);
    setProject(initialProject);
    setAssetManifest(initialAssetManifest);
    setInteractionGraph(initialInteractionGraph);
    undoStack.current = [];
    redoStack.current = [];
    groupBase.current = null;
    bundleUndoStack.current = [];
    bundleRedoStack.current = [];
    setBundleHistory({ undo: 0, redo: 0 });
    setHistory({ undo: 0, redo: 0 });
    localStorage.removeItem(STORAGE_KEY);
  }, [initialAssetManifest, initialExperience, initialInteractionGraph, initialProject]);

  return {
    experience,
    setExperience,
    beginExperienceGroup,
    endExperienceGroup,
    undoExperience,
    redoExperience,
    canUndoExperience: history.undo > 0,
    canRedoExperience: history.redo > 0,
    project,
    setProject,
    assetManifest,
    setAssetManifest,
    interactionGraph,
    setInteractionGraph,
    applyProjectBundle,
    undoProjectBundle,
    redoProjectBundle,
    canUndoProjectBundle: bundleHistory.undo > 0,
    canRedoProjectBundle: bundleHistory.redo > 0,
    validation,
    hydrated,
    loadDraft,
    reset,
  };
}

function isAssetManifest(value: unknown): value is AssetManifest {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["models", "textures", "hdr", "video"].every((key) => Array.isArray(record[key])) && Boolean(record.budgets);
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
