import { stateFingerprint } from "@/src/core/journal/stateFingerprint";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject, type StudioProject } from "@/src/platform/studioSchema";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";

export const STUDIO_DRAFT_STORAGE_KEY = "forge-studio-v3";
export const STUDIO_DRAFT_BACKUP_KEY = "forge-studio-v3-backup";
export const LEGACY_STUDIO_DRAFT_STORAGE_KEY = "forge-studio-v2";
export const STUDIO_DRAFT_VERSION = 3 as const;

export interface StudioDraftPayload {
  experience: ExperienceConfig;
  project: StudioProject;
  assetManifest: AssetManifest;
  interactionGraph: InteractionGraph;
}

export interface StudioDraftEnvelope {
  version: typeof STUDIO_DRAFT_VERSION;
  sessionId: string;
  autosaveSequence: number;
  experienceRevision: number;
  savedAt: string;
  fingerprint: string;
  payload: StudioDraftPayload;
}

export type StudioDraftRecoverySource = "fresh" | "primary" | "backup" | "legacy";
export type StudioDraftStorageSlot = "primary" | "backup" | "legacy";

export interface StudioDraftRecoveryMeta {
  source: StudioDraftRecoverySource;
  sessionId: string;
  autosaveSequence: number;
  experienceRevision: number;
  savedAt?: string;
  fingerprint: string;
}

export interface StudioDraftFallbacks {
  assetManifest: AssetManifest;
  interactionGraph: InteractionGraph;
}

export interface StudioDraftStoredRecords {
  primary?: string | null;
  backup?: string | null;
  legacy?: string | null;
}

export interface StudioDraftRecoverySelection {
  envelope: StudioDraftEnvelope | null;
  source: StudioDraftRecoverySource;
  invalidSlots: StudioDraftStorageSlot[];
}

export class StudioDraftIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudioDraftIntegrityError";
  }
}

export function createStudioDraftEnvelope(
  payload: StudioDraftPayload,
  options: {
    sessionId: string;
    autosaveSequence: number;
    experienceRevision: number;
    savedAt?: string;
  },
): StudioDraftEnvelope {
  const clean = clonePayload(payload);
  return {
    version: STUDIO_DRAFT_VERSION,
    sessionId: options.sessionId,
    autosaveSequence: requireNonNegativeInteger(options.autosaveSequence, "autosaveSequence"),
    experienceRevision: requireNonNegativeInteger(options.experienceRevision, "experienceRevision"),
    savedAt: options.savedAt ?? new Date().toISOString(),
    fingerprint: fingerprintPayload(clean),
    payload: clean,
  };
}

export function parseStudioDraftEnvelope(input: unknown): StudioDraftEnvelope {
  if (!isRecord(input) || input.version !== STUDIO_DRAFT_VERSION) {
    throw new StudioDraftIntegrityError(`Unsupported Studio draft version: ${String(isRecord(input) ? input.version : "invalid")}.`);
  }
  if (typeof input.sessionId !== "string" || !input.sessionId.trim()) throw new StudioDraftIntegrityError("Studio draft is missing a session ID.");
  if (typeof input.savedAt !== "string" || Number.isNaN(Date.parse(input.savedAt))) throw new StudioDraftIntegrityError("Studio draft has an invalid save timestamp.");
  if (typeof input.fingerprint !== "string" || !input.fingerprint.startsWith("forge1:")) throw new StudioDraftIntegrityError("Studio draft is missing a valid fingerprint.");

  const payloadRecord = isRecord(input.payload) ? input.payload : null;
  if (!payloadRecord) throw new StudioDraftIntegrityError("Studio draft payload is missing.");
  const payload = parsePayload(payloadRecord, undefined);
  const expected = fingerprintPayload(payload);
  if (expected !== input.fingerprint) {
    throw new StudioDraftIntegrityError(`Studio draft fingerprint mismatch: expected ${input.fingerprint}, computed ${expected}.`);
  }

  return {
    version: STUDIO_DRAFT_VERSION,
    sessionId: input.sessionId,
    autosaveSequence: requireNonNegativeInteger(input.autosaveSequence, "autosaveSequence"),
    experienceRevision: requireNonNegativeInteger(input.experienceRevision, "experienceRevision"),
    savedAt: input.savedAt,
    fingerprint: input.fingerprint,
    payload,
  };
}

export function migrateLegacyStudioDraft(
  input: unknown,
  fallbacks: StudioDraftFallbacks,
  options: { sessionId: string; savedAt?: string } = { sessionId: "legacy-session" },
): StudioDraftEnvelope {
  if (!isRecord(input)) throw new StudioDraftIntegrityError("Legacy Studio draft must be an object.");
  const payload = parsePayload(input, fallbacks);
  return createStudioDraftEnvelope(payload, {
    sessionId: options.sessionId,
    autosaveSequence: 0,
    experienceRevision: 0,
    savedAt: options.savedAt,
  });
}

export function recoverStudioDraftRecords(
  records: StudioDraftStoredRecords,
  fallbacks: StudioDraftFallbacks,
  options: { legacySessionId: string; migratedAt?: string },
): StudioDraftRecoverySelection {
  const invalidSlots: StudioDraftStorageSlot[] = [];
  const primary = parseStoredEnvelope(records.primary, "primary", invalidSlots);
  if (primary) return { envelope: primary, source: "primary", invalidSlots };

  const backup = parseStoredEnvelope(records.backup, "backup", invalidSlots);
  if (backup) return { envelope: backup, source: "backup", invalidSlots };

  if (records.legacy) {
    try {
      const parsed = JSON.parse(records.legacy);
      const envelope = migrateLegacyStudioDraft(parsed, fallbacks, {
        sessionId: options.legacySessionId,
        savedAt: options.migratedAt,
      });
      return { envelope, source: "legacy", invalidSlots };
    } catch {
      invalidSlots.push("legacy");
    }
  }

  return { envelope: null, source: "fresh", invalidSlots };
}

export function studioDraftRecoveryMeta(envelope: StudioDraftEnvelope, source: StudioDraftRecoverySource): StudioDraftRecoveryMeta {
  return {
    source,
    sessionId: envelope.sessionId,
    autosaveSequence: envelope.autosaveSequence,
    experienceRevision: envelope.experienceRevision,
    savedAt: envelope.savedAt,
    fingerprint: envelope.fingerprint,
  };
}

export function freshStudioDraftRecoveryMeta(payload: StudioDraftPayload, sessionId: string): StudioDraftRecoveryMeta {
  return {
    source: "fresh",
    sessionId,
    autosaveSequence: 0,
    experienceRevision: 0,
    fingerprint: fingerprintPayload(payload),
  };
}

export function fingerprintPayload(payload: StudioDraftPayload) {
  return stateFingerprint({
    experience: payload.experience,
    project: payload.project,
    assetManifest: payload.assetManifest,
    interactionGraph: payload.interactionGraph,
  });
}

export function isAssetManifest(value: unknown): value is AssetManifest {
  if (!isRecord(value)) return false;
  return ["models", "textures", "hdr", "video"].every((key) => Array.isArray(value[key])) && isRecord(value.budgets);
}

function parseStoredEnvelope(raw: string | null | undefined, slot: "primary" | "backup", invalid: StudioDraftStorageSlot[]) {
  if (!raw) return null;
  try {
    return parseStudioDraftEnvelope(JSON.parse(raw));
  } catch {
    invalid.push(slot);
    return null;
  }
}

function parsePayload(record: Record<string, unknown>, fallbacks?: StudioDraftFallbacks): StudioDraftPayload {
  const experience = parseExperience(record.experience);
  const project = parseStudioProject(record.project);
  const assetManifest = isAssetManifest(record.assetManifest)
    ? structuredClone(record.assetManifest)
    : fallbacks?.assetManifest;
  const interactionGraph = record.interactionGraph
    ? parseInteractionGraph(record.interactionGraph)
    : fallbacks?.interactionGraph;

  if (!assetManifest) throw new StudioDraftIntegrityError("Studio draft asset manifest is invalid or missing.");
  if (!interactionGraph) throw new StudioDraftIntegrityError("Studio draft interaction graph is invalid or missing.");
  return { experience, project, assetManifest, interactionGraph };
}

function clonePayload(payload: StudioDraftPayload): StudioDraftPayload {
  return structuredClone(payload);
}

function requireNonNegativeInteger(value: unknown, name: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new StudioDraftIntegrityError(`Studio draft ${name} must be a non-negative integer.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
