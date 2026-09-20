import type { DirectorBrief, DirectorTreatment, DirectorTerritory } from "@/src/platform/directorSchema";
import type { HierarchyReport } from "@/src/platform/director-intelligence/hierarchy";

export type EvidenceClass = "client-brief" | "client-asset" | "brand-system" | "reference" | "public-research" | "forge-history" | "director-inference" | "creative-hypothesis";
export interface DirectorEvidence { id: string; claim: string; evidenceClass: EvidenceClass; sourceIds: string[]; confidence: number; verified: boolean; affects: string[]; }
export interface EvidenceReport { evidence: DirectorEvidence[]; unknowns: string[]; assumptions: DirectorEvidence[]; unsupportedClaims: string[]; coverage: number; }

export type MemoryNodeType = "Project" | "Brief" | "Audience" | "BrandTruth" | "BusinessObjective" | "Constraint" | "Asset" | "Reference" | "Precedent" | "DesignIssue" | "Concept" | "Territory" | "CreativePrinciple" | "FormDecision" | "ArtDirection" | "VisualLanguage" | "CreativeMutation" | "SignatureMoment" | "CameraGrammar" | "MotionGrammar" | "TypographyGrammar" | "ColorGrammar" | "LightingGrammar" | "MaterialGrammar" | "ImageGrammar" | "SoundGrammar" | "InteractionGrammar" | "StructurePattern" | "DistinctiveAsset" | "ClientFeedback" | "ProductionDecision" | "Outcome" | "FailurePattern" | "Lesson";
export interface MemoryNode { id: string; type: MemoryNodeType; label: string; text: string; tags: string[]; projectId?: string; confidence?: number; }
export interface MemoryEdge { from: string; to: string; relation: string; weight: number; reason?: string; }
export interface CreativeMemoryGraph { version: 1; nodes: MemoryNode[]; edges: MemoryEdge[]; }

export interface CreativePrecedent { id: string; title: string; creator?: string; industries: string[]; mediums: string[]; audience?: string; objective?: string; designIssues: string[]; concept: string; principles: string[]; formalDevices: string[]; emotionalArc?: string[]; interactionModel?: string; cameraGrammar?: string[]; motionGrammar?: string[]; typographyBehavior?: string[]; signatureMoment?: string; distinctiveAssets?: string[]; strongestDecision: string; weakestDecision?: string; outcomes?: string[]; transferableLessons: string[]; doNotCopy: string[]; evidence: DirectorEvidence[]; }
export type PrecedentRetrievalMode = "problem" | "emotion" | "structure" | "medium-transfer" | "anti-reference" | "constraint";
export interface RetrievedPrecedent { precedent: CreativePrecedent; score: number; reasons: string[]; }

export interface CreativeFingerprint { projectId: string; thesisTerms: string[]; narrativePattern: string[]; emotionalCurve: number[]; structureRoles: string[]; cameraDevices: string[]; motionDevices: string[]; interactionDevices: string[]; transitionDevices: string[]; typographyBehavior: string[]; compositionPatterns: string[]; distinctiveAssets: string[]; signatureMechanism: string; colorMaterialDescriptors: string[]; soundDescriptors: string[]; }
export interface SimilarityDimensions { concept: number; narrative: number; emotionalCurve: number; structure: number; spatialLogic: number; camera: number; motion: number; interaction: number; transition: number; typography: number; composition: number; signature: number; overall: number; }
export interface PortfolioCollision { projectId: string; dimensions: SimilarityDimensions; highOverlap: Array<{ dimension: keyof SimilarityDimensions; score: number }>; verdict: "clear" | "watch" | "rewrite" | "reject"; reason: string; }

export interface TastePreference { id: string; winnerId: string; loserId: string; reasons: string[]; dimensions: Partial<Record<TasteDimension, number>>; createdAt: string; }
export type TasteDimension = "restraintVsSpectacle" | "literalVsAbstract" | "cinematicVsEditorial" | "continuousVsChaptered" | "typographyVsImage" | "darkVsLight" | "denseVsSparse" | "directedVsExploratory" | "realismVsStylization" | "emotionalVsRational" | "familiarVsNovel";
export interface TasteProfile { version: 1; dimensions: Record<TasteDimension, number>; preferences: TastePreference[]; confidence: number; antiCollapsePenalty: number; }

export type EvaluationDimension = "novelty" | "value" | "brandAdherence" | "emotionalResonance" | "aestheticCoherence" | "conceptualClarity" | "memorability" | "distinctiveness" | "audienceRelevance" | "structuralExpression" | "motionCameraJustification" | "interactionPurpose" | "productionFeasibility" | "mobileIntegrity" | "commercialAlignment" | "portfolioNovelty" | "assetRealism";
export type EvaluationScores = Record<EvaluationDimension, number>;
export type CouncilRole = "executive-creative" | "brand" | "art" | "film" | "experience" | "interaction" | "conversion" | "production" | "mobile-accessibility" | "cultural-context" | "client-advocate" | "skeptic";
export type PlanningDisposition = "ADVANCE" | "REVISE" | "RESEARCH REQUIRED" | "ASSET BLOCKED" | "REJECT";
export type DirectorJudgmentVerdict = "LOCK" | "REVISE" | "REJECT";
export type DirectorVerdict = "UNVERIFIED" | DirectorJudgmentVerdict;
export interface CouncilCritique {
  role: CouncilRole;
  territoryId: string;
  scores: Partial<EvaluationScores>;
  strengths: string[];
  concerns: string[];
  blockers: string[];
  recommendation: "advance" | "revise" | "research" | "asset-blocked" | "reject";
  basis: "deterministic-lens";
  evidenceCoverage: number;
}
export interface EvaluationReport {
  territoryId: string;
  scores: EvaluationScores;
  critiques: CouncilCritique[];
  blockers: string[];
  disagreements: string[];
  passedHardGates: boolean;
  recommendation: PlanningDisposition;
  scoreSemantics: "deterministic-planning-proxy";
}
export interface DirectorJudgmentEvidence {
  source: "rendered-external-judge" | "human-review";
  judgeId: string;
  model?: string;
  calibrationId?: string;
  calibrated: boolean;
  captureIds: string[];
  evidenceHash: string;
}
export interface DirectorJudgmentReport {
  status: "unverified" | "verified";
  verdict: DirectorVerdict;
  confidence: number | null;
  confidenceSemantics: "none" | "calibrated-preference";
  reasons: string[];
  blockers: string[];
  dimensions: Partial<Record<"composition"|"hierarchy"|"typography"|"motion"|"camera"|"coherence"|"brandSpecificity"|"emotionalEffect"|"usability",number>>;
  evidence: DirectorJudgmentEvidence | null;
}

export interface OriginalityFingerprint { conceptual: number; narrative: number; spatial: number; interaction: number; motion: number; camera: number; composition: number; typographyBehavior: number; signatureMechanism: number; portfolio: number; category: number; sources: string[]; }
export interface ClicheScan { category: DirectorBrief["projectType"]; detected: string[]; density: number; retainedWithReason: Array<{ pattern: string; reason: string }>; verdict: "clear" | "watch" | "rebuild"; }
export interface WhyLadder { decision: string; creativeReason: string; brandReason: string; audienceReason: string; emotionalReason: string; mediumReason: string; productionReason: string; valid: boolean; breaksAt?: string; }

export type StressStatus = "PASS" | "PASS WITH DEGRADATION" | "REQUIRES REVISION" | "FATAL";
export interface StressResult { id: string; label: string; status: StressStatus; reason: string; mitigation?: string; }
export interface StressLabReport { territoryId: string; results: StressResult[]; blockers: string[]; resilienceScore: number; }

export interface CreativeCeiling { current: number; projected: number; constraints: string[]; highestLeverageUpgrades: string[]; evidenceCoverage: number; }
export type AssetClass = "hero-critical" | "signature-critical" | "proof-critical" | "supporting" | "utility" | "optional";
export type AssetDecision = "use" | "upgrade" | "re-edit" | "replace" | "create" | "omit";
export interface AssetGapItem { label: string; assetClass: AssetClass; decision: AssetDecision; exists: boolean; reason: string; creativeConsequence: string; }
export interface AssetGapReport { items: AssetGapItem[]; blockers: string[]; completeness: number; }
export interface ProductionLeverageItem { id: string; label: string; leverage: number; estimatedCost: number; reason: string; recommendation: "invest" | "maintain" | "defer" | "cut"; }

export type CreativeDecisionStatus = "proposed" | "locked" | "revised" | "rejected" | "superseded";
export interface CreativeDecision { id: string; status: CreativeDecisionStatus; decision: string; whyLadder: string[]; evidenceIds: string[]; affectedSystems: string[]; rejectedAlternatives: Array<{ decision: string; reason: string }>; author: string; approvedBy?: string; createdAt: string; supersedes?: string; }
export interface DecisionLedger { version: 1; decisions: CreativeDecision[]; }

export type FeedbackClass = "factual-correction" | "business-constraint" | "brand-constraint" | "content-request" | "preference" | "stakeholder-politics" | "usability-concern" | "creative-disagreement" | "scope-change";
export interface ClientFeedbackRecord { id: string; text: string; classification: FeedbackClass; evidenceWeight: number; affects: string[]; createdAt: string; }
export interface DefensePacket { territoryId: string; likelyQuestions: Array<{ question: string; answer: string; evidence: string[]; tradeoff: string; fallback: string }>; }

export type ReviewStage = 25 | 50 | 75 | 90 | 100;
export interface ContinuousReview { stage: ReviewStage; driftScore: number; decisionViolations: string[]; cuts: string[]; blockers: string[]; recommendation: "continue" | "revise" | "stop" | "final-cut"; }

export interface LearningObservation { id: string; observation: string; sampleSize: number; confidence: "low" | "medium" | "high"; evidenceIds: string[]; action: string; createdAt: string; }
export interface CalibrationCase { id: string; label: string; expectedDisposition: EvaluationReport["recommendation"]; benchmarkScores: Partial<EvaluationScores>; notes: string[]; }

export interface DirectorIntelligenceInput {
  brief: DirectorBrief;
  precedents?: CreativePrecedent[];
  portfolio?: CreativeFingerprint[];
  memory?: CreativeMemoryGraph;
  taste?: TasteProfile;
  decisions?: DecisionLedger;
  judgment?: DirectorJudgmentReport;
}
export interface DirectorIntelligenceReport {
  brief: DirectorBrief;
  treatment: DirectorTreatment;
  evidence: EvidenceReport;
  precedents: RetrievedPrecedent[];
  fingerprint: CreativeFingerprint;
  collisions: PortfolioCollision[];
  evaluations: EvaluationReport[];
  selectedEvaluation: EvaluationReport;
  originality: OriginalityFingerprint;
  cliches: ClicheScan;
  stress: StressLabReport;
  ceiling: CreativeCeiling;
  assetGap: AssetGapReport;
  leverage: ProductionLeverageItem[];
  hierarchy: HierarchyReport;
  whyLadders: WhyLadder[];
  decisions: DecisionLedger;
  defense: DefensePacket;
  planningDisposition: PlanningDisposition;
  judgment: DirectorJudgmentReport;
  verdict: DirectorVerdict;
  blockers: string[];
  generatedAt: string;
}

export type { DirectorBrief, DirectorTreatment, DirectorTerritory };
