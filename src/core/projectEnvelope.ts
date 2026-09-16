import type { ProjectId } from "@/src/core/ids";

export const CURRENT_FORGE_SCHEMA_VERSION = 1;

export interface ForgeProjectEnvelope<TExperience = unknown, TStructure = unknown, TTypography = unknown, TInteractions = unknown, TAssets = unknown> {
  forgeVersion: string;
  schemaVersion: number;
  projectId: ProjectId;
  metadata: {
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  experience: TExperience;
  structure?: TStructure;
  typography?: TTypography;
  interactions?: TInteractions;
  assets?: TAssets;
  performance?: Record<string, unknown>;
  deployment?: Record<string, unknown>;
  telemetry?: Record<string, unknown>;
}

export function createProjectEnvelope<TExperience>(input: {
  forgeVersion: string;
  projectId: ProjectId;
  name: string;
  description?: string;
  experience: TExperience;
}): ForgeProjectEnvelope<TExperience> {
  return {
    forgeVersion: input.forgeVersion,
    schemaVersion: CURRENT_FORGE_SCHEMA_VERSION,
    projectId: input.projectId,
    metadata: { name: input.name, description: input.description },
    experience: structuredClone(input.experience),
  };
}

export function isForgeProjectEnvelope(value: unknown): value is ForgeProjectEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.forgeVersion === "string"
    && Number.isInteger(candidate.schemaVersion)
    && typeof candidate.projectId === "string"
    && !!candidate.metadata
    && typeof candidate.metadata === "object"
    && "experience" in candidate;
}
