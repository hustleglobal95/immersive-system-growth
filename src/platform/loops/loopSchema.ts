import { z } from "zod";

export const loopWorkerSchema=z.enum(["visual-repair","performance-repair","asset-repair","construction"]);
export const loopVerifierSchema=z.enum(["schema","functional","visual","motion","mobile","performance","accessibility","assets"]);
export const loopStatusSchema=z.enum(["planned","running","completed","stopped","escalated","failed"]);

export const loopBudgetSchema=z.object({
  maxCycles:z.number().int().min(1).max(8),
  maxCandidatesPerCycle:z.number().int().min(1).max(5),
  maxCandidateAttempts:z.number().int().min(1).max(30),
  maxWallTimeMs:z.number().int().min(30_000).max(3_600_000),
  noProgressLimit:z.number().int().min(1).max(4),
  maxReportedCostUsd:z.number().positive().max(500).optional(),
}).strict();

export const loopAcceptanceSchema=z.object({
  requireHardGates:z.literal(true),
  requireCandidateWin:z.literal(true),
  minPreferenceAgreement:z.number().min(0.5).max(1),
  maxMotionRegression:z.number().min(0).max(20),
}).strict();

export const loopRepairCommandSchema=z.enum([
  "scene.adjustPresentation",
  "motion.applyArchetype",
  "camera.applyChoreography",
]);

export const loopStrategySchema=z.object({
  id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label:z.string().min(1).max(80),
  instruction:z.string().min(12).max(800),
}).strict();

export const loopDefinitionSchema=z.object({
  version:z.literal(1),
  id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label:z.string().min(1).max(80),
  description:z.string().min(8).max(500),
  objective:z.string().min(8).max(1200),
  worker:loopWorkerSchema,
  executable:z.boolean(),
  verifiers:z.array(loopVerifierSchema).min(1),
  strategies:z.array(loopStrategySchema).min(1).max(5),
  allowedRepairCommands:z.array(loopRepairCommandSchema).min(1).max(3),
  budgets:loopBudgetSchema,
  acceptance:loopAcceptanceSchema,
  humanGates:z.array(z.string().min(4).max(240)).max(12),
  memory:z.object({
    runEvidence:z.literal(true),
    projectJournal:z.enum(["off","summary"]),
    forgeLearning:z.literal("manual-promotion"),
  }).strict(),
}).strict();

export const loopCandidateEvidenceSchema=z.object({
  id:z.string().min(1).max(120),
  strategyId:z.string().min(1).max(80),
  fingerprint:z.string().min(1).max(128).optional(),
  repairSignature:z.string().min(1).max(128).optional(),
  repairSummary:z.array(z.string().max(400)).max(8).default([]),
  candidatePath:z.string().max(1000).optional(),
  candidateAssetManifestPath:z.string().max(1000).optional(),
  candidateInteractionGraphPath:z.string().max(1000).optional(),
  assetScoreBefore:z.number().min(0).max(100).nullable().optional(),
  assetScoreAfter:z.number().min(0).max(100).nullable().optional(),
  referencedAssetBytesBefore:z.number().int().nonnegative().nullable().optional(),
  referencedAssetBytesAfter:z.number().int().nonnegative().nullable().optional(),
  duplicateOf:z.string().max(120).optional(),
  functionalPassed:z.boolean().nullable().default(null),
  motionScore:z.number().nullable().default(null),
  hardGateFailures:z.array(z.string().max(600)).max(100).default([]),
  comparisonAccepted:z.boolean().default(false),
  comparisonWinner:z.enum(["incumbent","candidate","tie","invalid"]).nullable().default(null),
  preferenceAgreement:z.number().min(0).max(1).nullable().default(null),
  reason:z.string().max(2000).default(""),
}).strict();

export const loopCycleEvidenceSchema=z.object({
  cycle:z.number().int().min(1),
  startedAt:z.iso.datetime(),
  endedAt:z.iso.datetime().optional(),
  incumbentFingerprint:z.string().min(1).max(128),
  candidates:z.array(loopCandidateEvidenceSchema).max(5),
  acceptedCandidateId:z.string().max(120).optional(),
  acceptedFingerprint:z.string().max(128).optional(),
  noProgress:z.boolean().default(false),
  stopReason:z.string().max(800).optional(),
}).strict();

export const loopRunReportSchema=z.object({
  version:z.literal(1),
  runId:z.string().min(1).max(160),
  loopId:z.string().min(1).max(100),
  projectId:z.string().max(100).optional(),
  sourceVersionId:z.string().max(160).optional(),
  controlPlane:z.object({
    proposalId:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    selectionKey:z.string().min(1).max(320),
    intent:z.string().min(1).max(1200),
  }).strict().optional(),
  objective:z.string().min(1).max(1200),
  status:loopStatusSchema,
  startedAt:z.iso.datetime(),
  endedAt:z.iso.datetime().optional(),
  source:z.string().max(1200),
  definition:loopDefinitionSchema,
  baselineFingerprint:z.string().min(1).max(128),
  currentFingerprint:z.string().min(1).max(128),
  acceptedImprovements:z.number().int().nonnegative(),
  candidateAttempts:z.number().int().nonnegative(),
  noProgressStreak:z.number().int().nonnegative(),
  reportedCostUsd:z.number().nonnegative().nullable(),
  cycles:z.array(loopCycleEvidenceSchema).max(8),
  stopReason:z.string().max(1000).optional(),
  acceptedExperiencePath:z.string().max(1200).optional(),
  acceptedAssetManifestPath:z.string().max(1200).optional(),
  acceptedInteractionGraphPath:z.string().max(1200).optional(),
  humanApprovalRequired:z.literal(true),
  learningCandidate:z.string().max(2000).optional(),
}).strict();

export type LoopDefinition=z.infer<typeof loopDefinitionSchema>;
export type LoopCandidateEvidence=z.infer<typeof loopCandidateEvidenceSchema>;
export type LoopCycleEvidence=z.infer<typeof loopCycleEvidenceSchema>;
export type LoopRunReport=z.infer<typeof loopRunReportSchema>;
export type LoopStatus=z.infer<typeof loopStatusSchema>;
