"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject, type StudioProject } from "@/src/platform/studioSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";
import {
  LEGACY_STUDIO_DRAFT_STORAGE_KEY,
  STUDIO_DRAFT_BACKUP_KEY,
  STUDIO_DRAFT_STORAGE_KEY,
  createStudioDraftEnvelope,
  freshStudioDraftRecoveryMeta,
  parseStudioDraftEnvelope,
  recoverStudioDraftRecords,
  studioDraftRecoveryMeta,
  type StudioDraftRecoveryMeta,
} from "@/src/studio/studioDraftStorage";

export function useStudioDraft(
  initialExperience: ExperienceConfig,
  initialProject: StudioProject,
  initialAssetManifest: AssetManifest,
  initialInteractionGraph: InteractionGraph,
) {
  const initialPayload = useMemo(() => ({
    experience: initialExperience,
    project: initialProject,
    assetManifest: initialAssetManifest,
    interactionGraph: initialInteractionGraph,
  }), [initialAssetManifest, initialExperience, initialInteractionGraph, initialProject]);

  const [experience, setExperienceState] = useState(initialExperience);
  const experienceRef = useRef(initialExperience);
  const experienceRevisionRef = useRef(0);
  const autosaveSequenceRef = useRef(0);
  const sessionIdRef = useRef(makeSessionId());
  const undoStack = useRef<ExperienceConfig[]>([]);
  const redoStack = useRef<ExperienceConfig[]>([]);
  const groupBase = useRef<ExperienceConfig | null>(null);
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [project, setProject] = useState(initialProject);
  const [assetManifest, setAssetManifest] = useState(initialAssetManifest);
  const [interactionGraph, setInteractionGraph] = useState(initialInteractionGraph);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState("");
  const [recovery, setRecovery] = useState<StudioDraftRecoveryMeta>(() => freshStudioDraftRecoveryMeta(initialPayload, sessionIdRef.current));

  useEffect(() => {
    try {
      const selection = recoverStudioDraftRecords({
        primary: localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY),
        backup: localStorage.getItem(STUDIO_DRAFT_BACKUP_KEY),
        legacy: localStorage.getItem(LEGACY_STUDIO_DRAFT_STORAGE_KEY),
      }, {
        assetManifest: initialAssetManifest,
        interactionGraph: initialInteractionGraph,
      }, {
        legacySessionId: sessionIdRef.current,
      });

      for (const slot of selection.invalidSlots) {
        if (slot === "primary") localStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
        else if (slot === "backup") localStorage.removeItem(STUDIO_DRAFT_BACKUP_KEY);
        else localStorage.removeItem(LEGACY_STUDIO_DRAFT_STORAGE_KEY);
      }

      if (selection.envelope) {
        const { envelope, source } = selection;
        sessionIdRef.current = envelope.sessionId;
        autosaveSequenceRef.current = envelope.autosaveSequence;
        experienceRevisionRef.current = envelope.experienceRevision;
        queueMicrotask(() => {
          experienceRef.current = envelope.payload.experience;
          setExperienceState(envelope.payload.experience);
          setProject(envelope.payload.project);
          setAssetManifest(envelope.payload.assetManifest);
          setInteractionGraph(envelope.payload.interactionGraph);
          setRecovery(studioDraftRecoveryMeta(envelope, source));
        });
      }
    } catch (error) {
      queueMicrotask(() => setPersistenceError(error instanceof Error ? error.message : "Studio draft recovery failed."));
    } finally {
      queueMicrotask(() => setHydrated(true));
    }
  }, [initialAssetManifest, initialInteractionGraph]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const envelope = createStudioDraftEnvelope({ experience, project, assetManifest, interactionGraph }, {
        sessionId: sessionIdRef.current,
        autosaveSequence: ++autosaveSequenceRef.current,
        experienceRevision: experienceRevisionRef.current,
      });
      const prior = localStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
      if (prior) {
        try {
          parseStudioDraftEnvelope(JSON.parse(prior));
          localStorage.setItem(STUDIO_DRAFT_BACKUP_KEY, prior);
        } catch {
          // Never replace a known-good backup with a corrupt primary record.
        }
      }
      localStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
      localStorage.removeItem(LEGACY_STUDIO_DRAFT_STORAGE_KEY);
      setPersistenceError("");
      setRecovery((current) => ({ ...studioDraftRecoveryMeta(envelope, current.source), source: current.source }));
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : "Studio autosave failed.");
    }
  }, [assetManifest, experience, hydrated, interactionGraph, project]);

  const setExperience = useCallback<Dispatch<SetStateAction<ExperienceConfig>>>((update) => {
    const current = experienceRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (next === current) return;
    if (!groupBase.current) {
      undoStack.current = [...undoStack.current.slice(-79), current];
      redoStack.current = [];
    }
    experienceRevisionRef.current++;
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
    experienceRevisionRef.current++;
    experienceRef.current = prior;
    setExperienceState(prior);
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });
  }, [endExperienceGroup]);

  const redoExperience = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(experienceRef.current);
    experienceRevisionRef.current++;
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
    sessionIdRef.current = makeSessionId();
    experienceRevisionRef.current = 0;
    autosaveSequenceRef.current = 0;
    experienceRef.current = initialExperience;
    setExperienceState(initialExperience);
    setProject(initialProject);
    setAssetManifest(initialAssetManifest);
    setInteractionGraph(initialInteractionGraph);
    undoStack.current = [];
    redoStack.current = [];
    groupBase.current = null;
    setHistory({ undo: 0, redo: 0 });
    setPersistenceError("");
    setRecovery(freshStudioDraftRecoveryMeta(initialPayload, sessionIdRef.current));
    localStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
    localStorage.removeItem(STUDIO_DRAFT_BACKUP_KEY);
    localStorage.removeItem(LEGACY_STUDIO_DRAFT_STORAGE_KEY);
  }, [initialAssetManifest, initialExperience, initialInteractionGraph, initialPayload, initialProject]);

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
    validation,
    hydrated,
    recovery,
    persistenceError,
    reset,
  };
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

function makeSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
