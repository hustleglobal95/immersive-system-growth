"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject, type StudioProject } from "@/src/platform/studioSchema";
import { loadDraft, persistDraft, storageRecoveryMessage, storageUnavailableMessage } from "./draftStorage";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";

const STORAGE_KEY = "forge-studio-v2";
interface StoredDraft { experience: unknown; project: unknown; assetManifest?: unknown; interactionGraph?: unknown; }

export function useStudioDraft(initialExperience: ExperienceConfig, initialProject: StudioProject, initialAssetManifest: AssetManifest, initialInteractionGraph: InteractionGraph) {
  const [experience, setExperienceState] = useState(initialExperience);
  const experienceRef = useRef(initialExperience);
  const undoStack = useRef<ExperienceConfig[]>([]);
  const redoStack = useRef<ExperienceConfig[]>([]);
  const groupBase = useRef<ExperienceConfig | null>(null);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [project, setProject] = useState(initialProject);
  const [assetManifest, setAssetManifest] = useState(initialAssetManifest);
  const [interactionGraph, setInteractionGraph] = useState(initialInteractionGraph);
  const [hydrated, setHydrated] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [recoveryLocked, setRecoveryLocked] = useState(false);
  const recoveryRaw = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const result = loadDraft(() => localStorage, STORAGE_KEY, (raw) => {
      const draft = JSON.parse(raw) as StoredDraft;
      return {
        experience: parseExperience(draft.experience),
        project: parseStudioProject(draft.project),
        assetManifest: isAssetManifest(draft.assetManifest) ? draft.assetManifest : initialAssetManifest,
        interactionGraph: draft.interactionGraph ? parseInteractionGraph(draft.interactionGraph) : initialInteractionGraph,
      };
    });
    queueMicrotask(() => {
      if (!mounted) return;
      if (result.kind === "loaded") {
        experienceRef.current = result.value.experience;
        setExperienceState(result.value.experience);
        setProject(result.value.project);
        setAssetManifest(result.value.assetManifest);
        setInteractionGraph(result.value.interactionGraph);
      } else if (result.kind === "unreadable") {
        // Never delete or overwrite a draft that a newer/older schema cannot open.
        recoveryRaw.current = result.raw;
        setRecoveryLocked(true);
        setStorageNotice(storageRecoveryMessage);
      } else if (result.kind === "unavailable") {
        setStorageNotice(storageUnavailableMessage);
      }
      setHydrated(true);
    });
    return () => { mounted = false; };
  }, [initialAssetManifest, initialInteractionGraph]);

  useEffect(() => {
    if (!hydrated) return;
    let mounted = true;
    const notice = persistDraft(() => localStorage, STORAGE_KEY, { experience, project, assetManifest, interactionGraph }, recoveryLocked);
    queueMicrotask(() => { if (mounted) setStorageNotice(notice); });
    return () => { mounted = false; };
  }, [assetManifest, experience, hydrated, interactionGraph, project, recoveryLocked]);

  useEffect(() => {
    if (!storageNotice) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [storageNotice]);

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

  const beginExperienceGroup = useCallback(() => { groupBase.current ??= experienceRef.current; }, []);
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

  const reset = useCallback(() => {
    if (recoveryRaw.current !== null && !window.confirm('Reset replaces the preserved browser draft. Export its recovery copy first. Continue with reset?')) return;
    experienceRef.current = initialExperience;
    setExperienceState(initialExperience);
    setProject(initialProject);
    setAssetManifest(initialAssetManifest);
    setInteractionGraph(initialInteractionGraph);
    undoStack.current = []; redoStack.current = []; groupBase.current = null;
    setHistory({ undo: 0, redo: 0 });
    // Write the replacement first. If it fails, keep the recovery copy available.
    const notice = persistDraft(() => localStorage, STORAGE_KEY, { experience: initialExperience, project: initialProject, assetManifest: initialAssetManifest, interactionGraph: initialInteractionGraph });
    if (!notice) { recoveryRaw.current = null; setRecoveryLocked(false); }
    setStorageNotice(notice || '');
  }, [initialAssetManifest, initialExperience, initialInteractionGraph, initialProject]);

  const exportRecovery = useCallback(() => {
    if (recoveryRaw.current !== null) downloadText('forge-draft-recovery.json', recoveryRaw.current);
  }, []);

  return { experience, setExperience, beginExperienceGroup, endExperienceGroup, undoExperience, redoExperience,
    canUndoExperience: history.undo > 0, canRedoExperience: history.redo > 0,
    project, setProject, assetManifest, setAssetManifest, interactionGraph, setInteractionGraph,
    validation, hydrated, reset, storageNotice, recoveryLocked, exportRecovery };
}

function isAssetManifest(value: unknown): value is AssetManifest {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["models", "textures", "hdr", "video"].every((key) => Array.isArray(record[key])) && Boolean(record.budgets);
}
function parseSafe(action: () => unknown) {
  try { action(); return ""; }
  catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as { issues?: Array<{ path?: PropertyKey[]; message?: string }> }).issues ?? [];
      return issues.map((issue) => `${issue.path?.join(".") || "config"}: ${issue.message || "Invalid value"}`).join("; ");
    }
    return error instanceof Error ? error.message : "Unknown validation error";
  }
}
function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.hidden = true;
  document.body.append(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadJson(name: string, value: unknown) { downloadText(name, JSON.stringify(value, null, 2) + '\n'); }
