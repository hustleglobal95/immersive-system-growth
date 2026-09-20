"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject, type StudioProject } from "@/src/platform/studioSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";
import { cinematicSystems as productionCinematicSystems } from "@/src/lib/cinematic/config";
import { parseCinematicSystems, type CinematicSystemsManifest } from "@/src/lib/cinematic/schema";

const STORAGE_KEY = "forge-studio-v2";

interface StoredDraft {
  experience: unknown;
  project: unknown;
  assetManifest?: unknown;
  interactionGraph?: unknown;
  cinematicSystems?: unknown;
}

export interface StudioProjectBundle {
  experience: ExperienceConfig;
  assetManifest: AssetManifest;
  interactionGraph: InteractionGraph;
  cinematicSystems?: CinematicSystemsManifest;
}

export function useStudioDraft(
  initialExperience: ExperienceConfig,
  initialProject: StudioProject,
  initialAssetManifest: AssetManifest,
  initialInteractionGraph: InteractionGraph,
  initialCinematicSystems: CinematicSystemsManifest = productionCinematicSystems,
) {
  const [experience, setExperienceState] = useState(initialExperience);
  const experienceRef = useRef(initialExperience);
  const undoStack = useRef<ExperienceConfig[]>([]);
  const redoStack = useRef<ExperienceConfig[]>([]);
  const groupBase = useRef<ExperienceConfig | null>(null);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [project, setProject] = useState(initialProject);
  const [assetManifest, setAssetManifestState] = useState(initialAssetManifest);
  const [interactionGraph, setInteractionGraphState] = useState(initialInteractionGraph);
  const [cinematicSystems, setCinematicSystemsState] = useState(initialCinematicSystems);
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
        const nextCinematicSystems = draft.cinematicSystems
          ? parseCinematicSystems(draft.cinematicSystems)
          : initialCinematicSystems;
        queueMicrotask(() => {
          experienceRef.current = nextExperience;
          setExperienceState(nextExperience);
          setProject(nextProject);
          setAssetManifestState(nextManifest);
          setInteractionGraphState(nextInteractionGraph);
          setCinematicSystemsState(nextCinematicSystems);
        });
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      queueMicrotask(() => setHydrated(true));
    }
  }, [initialAssetManifest, initialCinematicSystems, initialInteractionGraph]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ experience, project, assetManifest, interactionGraph, cinematicSystems }));
  }, [assetManifest, cinematicSystems, experience, hydrated, interactionGraph, project]);

  const clearProjectBundleHistory = useCallback(() => {
    bundleUndoStack.current=[];
    bundleRedoStack.current=[];
    setBundleHistory({undo:0,redo:0});
  },[]);

  const setExperience = useCallback<Dispatch<SetStateAction<ExperienceConfig>>>((update) => {
    const current = experienceRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (next === current) return;
    clearProjectBundleHistory();
    if (!groupBase.current) {
      undoStack.current = [...undoStack.current.slice(-79), current];
      redoStack.current = [];
    }
    experienceRef.current = next;
    setExperienceState(next);
    setHistory({ undo: undoStack.current.length, redo: 0 });
  }, [clearProjectBundleHistory]);

  const setAssetManifest = useCallback<Dispatch<SetStateAction<AssetManifest>>>((update) => {
    clearProjectBundleHistory();
    setAssetManifestState(update);
  },[clearProjectBundleHistory]);

  const setInteractionGraph = useCallback<Dispatch<SetStateAction<InteractionGraph>>>((update) => {
    clearProjectBundleHistory();
    setInteractionGraphState(update);
  },[clearProjectBundleHistory]);

  const setCinematicSystems = useCallback<Dispatch<SetStateAction<CinematicSystemsManifest>>>((update) => {
    clearProjectBundleHistory();
    setCinematicSystemsState((current) => {
      const next = typeof update === "function" ? update(current) : update;
      return parseCinematicSystems(next);
    });
  },[clearProjectBundleHistory]);

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
    const nextCinematic=parseCinematicSystems(input.cinematicSystems ?? cinematicSystems);
    bundleUndoStack.current=[
      ...bundleUndoStack.current.slice(-19),
      {experience:experienceRef.current,assetManifest,interactionGraph,cinematicSystems},
    ];
    bundleRedoStack.current=[];
    experienceRef.current=nextExperience;
    setExperienceState(nextExperience);
    setAssetManifestState(nextManifest);
    setInteractionGraphState(nextGraph);
    setCinematicSystemsState(nextCinematic);
    undoStack.current=[];
    redoStack.current=[];
    groupBase.current=null;
    setHistory({undo:0,redo:0});
    setBundleHistory({undo:bundleUndoStack.current.length,redo:0});
  },[assetManifest,cinematicSystems,interactionGraph]);

  const undoProjectBundle = useCallback(() => {
    const prior=bundleUndoStack.current.pop();
    if(!prior) return false;
    bundleRedoStack.current=[
      ...bundleRedoStack.current.slice(-19),
      {experience:experienceRef.current,assetManifest,interactionGraph,cinematicSystems},
    ];
    experienceRef.current=prior.experience;
    setExperienceState(prior.experience);
    setAssetManifestState(prior.assetManifest);
    setInteractionGraphState(prior.interactionGraph);
    setCinematicSystemsState(prior.cinematicSystems ?? cinematicSystems);
    undoStack.current=[];
    redoStack.current=[];
    groupBase.current=null;
    setHistory({undo:0,redo:0});
    setBundleHistory({undo:bundleUndoStack.current.length,redo:bundleRedoStack.current.length});
    return true;
  },[assetManifest,cinematicSystems,interactionGraph]);

  const redoProjectBundle = useCallback(() => {
    const next=bundleRedoStack.current.pop();
    if(!next) return false;
    bundleUndoStack.current=[
      ...bundleUndoStack.current.slice(-19),
      {experience:experienceRef.current,assetManifest,interactionGraph,cinematicSystems},
    ];
    experienceRef.current=next.experience;
    setExperienceState(next.experience);
    setAssetManifestState(next.assetManifest);
    setInteractionGraphState(next.interactionGraph);
    setCinematicSystemsState(next.cinematicSystems ?? cinematicSystems);
    undoStack.current=[];
    redoStack.current=[];
    groupBase.current=null;
    setHistory({undo:0,redo:0});
    setBundleHistory({undo:bundleUndoStack.current.length,redo:bundleRedoStack.current.length});
    return true;
  },[assetManifest,cinematicSystems,interactionGraph]);

  const validation = useMemo(() => {
    const issues: string[] = [];
    const experienceIssue = parseSafe(() => parseExperience(experience));
    const projectIssue = parseSafe(() => parseStudioProject(project));
    const graphIssue = parseSafe(() => parseInteractionGraph(interactionGraph));
    const cinematicIssue = parseSafe(() => parseCinematicSystems(cinematicSystems));
    if (experienceIssue) issues.push(experienceIssue);
    if (projectIssue) issues.push(projectIssue);
    if (graphIssue) issues.push(graphIssue);
    if (cinematicIssue) issues.push(cinematicIssue);
    return issues;
  }, [cinematicSystems, experience, interactionGraph, project]);

  const loadDraft = useCallback((input: StoredDraft) => {
    const nextExperience = parseExperience(input.experience);
    const nextProject = parseStudioProject(input.project);
    const nextManifest = parseAssetManifest(input.assetManifest);
    const nextInteractionGraph = parseInteractionGraph(input.interactionGraph);
    const nextCinematicSystems = input.cinematicSystems ? parseCinematicSystems(input.cinematicSystems) : initialCinematicSystems;
    experienceRef.current = nextExperience;
    setExperienceState(nextExperience);
    setProject(nextProject);
    setAssetManifestState(nextManifest);
    setInteractionGraphState(nextInteractionGraph);
    setCinematicSystemsState(nextCinematicSystems);
    undoStack.current = [];
    redoStack.current = [];
    groupBase.current = null;
    bundleUndoStack.current = [];
    bundleRedoStack.current = [];
    setBundleHistory({ undo: 0, redo: 0 });
    setHistory({ undo: 0, redo: 0 });
  }, [initialCinematicSystems]);

  const reset = useCallback(() => {
    experienceRef.current = initialExperience;
    setExperienceState(initialExperience);
    setProject(initialProject);
    setAssetManifestState(initialAssetManifest);
    setInteractionGraphState(initialInteractionGraph);
    setCinematicSystemsState(initialCinematicSystems);
    undoStack.current = [];
    redoStack.current = [];
    groupBase.current = null;
    bundleUndoStack.current = [];
    bundleRedoStack.current = [];
    setBundleHistory({ undo: 0, redo: 0 });
    setHistory({ undo: 0, redo: 0 });
    localStorage.removeItem(STORAGE_KEY);
  }, [initialAssetManifest, initialCinematicSystems, initialExperience, initialInteractionGraph, initialProject]);

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
    cinematicSystems,
    setCinematicSystems,
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
