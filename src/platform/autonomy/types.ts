import type { DirectorBrief } from "@/src/platform/directorSchema";

export type AutonomyProjectType = DirectorBrief["projectType"];
export type AutonomyTier = DirectorBrief["tier"];

export type AutonomyEvidenceClass =
  | "prompt"
  | "project-state"
  | "asset-manifest"
  | "category-prior"
  | "inference";

export interface InferredField<T> {
  value: T;
  confidence: number;
  evidenceClass: AutonomyEvidenceClass;
  evidence: string[];
  requiresConfirmation: boolean;
}

export interface PromptIntelligencePacket {
  version: 1;
  sourcePrompt: string;
  brief: DirectorBrief;
  projectType: InferredField<AutonomyProjectType>;
  tier: InferredField<AutonomyTier>;
  audience: InferredField<string>;
  objective: InferredField<string>;
  primaryAction: InferredField<string>;
  brandTruth: InferredField<string>;
  differentiators: string[];
  constraints: string[];
  unknowns: string[];
  hypotheses: string[];
  researchNeeds: string[];
  categorySignals: string[];
  recommendedMedia: Array<"cinematic-dom" | "depth-image" | "real-3d" | "hybrid">;
  confidence: number;
}

export type AutonomyLevel = 1 | 2 | 3 | 4 | 5;

export interface AutonomyContract {
  level: AutonomyLevel;
  description: string;
  requires: {
    promptIntelligence: boolean;
    assetPlanning: boolean;
    assetGeneration: boolean;
    browserVerification: boolean;
    visualComparison: boolean;
    repairLoop: boolean;
    finalCut: boolean;
  };
  hardGates: string[];
}

export interface AutonomyBenchmarkCase {
  id: string;
  prompt: string;
  expectedProjectType: AutonomyProjectType;
  expectedTier?: AutonomyTier;
  mustIncludeAny?: string[];
  mustAvoid?: string[];
}

export interface AutonomyBenchmarkCaseResult {
  id: string;
  passed: boolean;
  inferredProjectType: AutonomyProjectType;
  inferredTier: AutonomyTier;
  failures: string[];
}

export interface AutonomyBenchmarkReport {
  version: 1;
  total: number;
  passed: number;
  score: number;
  results: AutonomyBenchmarkCaseResult[];
}
