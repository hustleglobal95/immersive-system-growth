import { createHash } from "node:crypto";
import { z } from "zod";
import { loopRunReportSchema, type LoopRunReport } from "@/src/platform/loops/loopSchema";
import type { CreativeMemoryGraph } from "@/src/platform/director-intelligence/types";
import { addLesson } from "@/src/platform/director-intelligence/memory";

const fingerprint=z.string().regex(/^[a-f0-9]{16,128}$/);
const optionalFingerprint=fingerprint.optional();

const approvedBySchema=z.object({
  id:z.string().min(1).max(100),
  name:z.string().min(1).max(100),
  role:z.string().min(1).max(60),
}).strict();

const winnerSchema=z.object({
  cycle:z.number().int().min(1).max(8),
  candidateId:z.string().min(1).max(120),
  strategyId:z.string().min(1).max(80),
  fingerprint:fingerprint,
  repairSignature:optionalFingerprint,
  repairSummary:z.array(z.string().max(400)).max(8),
  preferenceAgreement:z.number().min(0).max(1).nullable(),
  functionalPassed:z.boolean().nullable(),
  motionScore:z.number().nullable(),
  performanceScoreBefore:z.number().min(0).max(100).nullable(),
  performanceScoreAfter:z.number().min(0).max(100).nullable(),
  rafP95Before:z.number().nonnegative().nullable(),
  rafP95After:z.number().nonnegative().nullable(),
  accessibilityPassed:z.boolean().nullable(),
  assetScoreBefore:z.number().min(0).max(100).nullable(),
  assetScoreAfter:z.number().min(0).max(100).nullable(),
  referencedAssetBytesBefore:z.number().int().nonnegative().nullable(),
  referencedAssetBytesAfter:z.number().int().nonnegative().nullable(),
}).strict();

export const projectLearningRecordSchema=z.object({
  version:z.literal(1),
  id:z.string().regex(/^learn-[a-z0-9-]+$/),
  status:z.literal("human-approved"),
  projectId:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  runId:z.string().min(1).max(160),
  loopId:z.string().min(1).max(100),
  sourceVersionId:z.string().max(160).optional(),
  acceptedVersionId:z.string().regex(/^v-[a-zA-Z0-9-]+$/),
  approvedAt:z.iso.datetime(),
  approvedBy:approvedBySchema,
  baselineFingerprint:fingerprint,
  acceptedFingerprint:fingerprint,
  creativeStateFingerprint:optionalFingerprint,
  buildPacketFingerprint:optionalFingerprint,
  controlPlane:z.object({
    proposalId:z.string().min(1).max(160),
    selectionKey:z.string().min(1).max(320),
    baselineFingerprint:fingerprint,
    intent:z.string().min(1).max(1200),
  }).strict().optional(),
  acceptedImprovements:z.number().int().min(1),
  winners:z.array(winnerSchema).min(1).max(8),
  evidenceSummary:z.object({
    candidateWins:z.number().int().min(1),
    averagePreferenceAgreement:z.number().min(0).max(1).nullable(),
    allFunctionalPassed:z.boolean(),
    averageMotionScore:z.number().nullable(),
    averagePerformanceDelta:z.number().nullable(),
    averageRafP95Delta:z.number().nullable(),
    averageAssetScoreDelta:z.number().nullable(),
    referencedAssetByteDelta:z.number().int().nullable(),
    accessibilityPassRate:z.number().min(0).max(1).nullable(),
    hardGateFailures:z.literal(0),
  }).strict(),
  lesson:z.string().min(1).max(2000),
  provenance:z.object({
    source:z.literal("forge-loop-human-promotion"),
    reportFingerprint:fingerprint,
    reportStartedAt:z.iso.datetime(),
    reportEndedAt:z.iso.datetime(),
  }).strict(),
}).strict();

export type ProjectLearningRecord=z.infer<typeof projectLearningRecordSchema>;

export interface ProjectLearningPattern {
  key:string;
  loopId:string;
  strategyId:string;
  samples:number;
  projects:number;
  averagePreferenceAgreement:number|null;
  averageMotionScore:number|null;
  averagePerformanceDelta:number|null;
  averageAssetScoreDelta:number|null;
  status:"hypothesis"|"review-ready";
  rule:string;
}

export interface ProjectLearningEvaluation {
  version:1;
  records:number;
  projects:number;
  loops:Record<string,number>;
  patterns:ProjectLearningPattern[];
  promotionPolicy:string;
}

export function createProjectLearningRecord(input:{
  report:LoopRunReport;
  projectId:string;
  acceptedVersionId:string;
  approvedBy:{id:string;name:string;role:string};
  approvedAt?:string;
  creativeStateFingerprint?:string;
  buildPacketFingerprint?:string;
}):ProjectLearningRecord {
  const report=loopRunReportSchema.parse(input.report);
  if(!["completed","stopped"].includes(report.status)) throw new Error("Project learning requires a completed/stopped Loop report.");
  if(report.acceptedImprovements<1) throw new Error("Project learning requires at least one proven Loop improvement.");
  if(report.projectId && report.projectId!==input.projectId) throw new Error("Project learning project does not match the Loop report.");
  if(!report.endedAt) throw new Error("Project learning requires a finished Loop report.");

  const winners=report.cycles.flatMap((cycle)=>{
    if(!cycle.acceptedCandidateId) return [];
    const candidate=cycle.candidates.find((item)=>item.id===cycle.acceptedCandidateId);
    if(!candidate?.fingerprint) return [];
    if(candidate.hardGateFailures.length) throw new Error("Accepted Loop winner contains hard-gate failures.");
    if(!candidate.comparisonAccepted || candidate.comparisonWinner!=="candidate") {
      throw new Error("Accepted Loop winner lacks comparative candidate-win evidence.");
    }
    return [{
      cycle:cycle.cycle,
      candidateId:candidate.id,
      strategyId:candidate.strategyId,
      fingerprint:candidate.fingerprint,
      repairSignature:candidate.repairSignature,
      repairSummary:candidate.repairSummary,
      preferenceAgreement:candidate.preferenceAgreement,
      functionalPassed:candidate.functionalPassed,
      motionScore:candidate.motionScore,
      performanceScoreBefore:candidate.performanceScoreBefore ?? null,
      performanceScoreAfter:candidate.performanceScoreAfter ?? null,
      rafP95Before:candidate.rafP95Before ?? null,
      rafP95After:candidate.rafP95After ?? null,
      accessibilityPassed:candidate.accessibilityPassed ?? null,
      assetScoreBefore:candidate.assetScoreBefore ?? null,
      assetScoreAfter:candidate.assetScoreAfter ?? null,
      referencedAssetBytesBefore:candidate.referencedAssetBytesBefore ?? null,
      referencedAssetBytesAfter:candidate.referencedAssetBytesAfter ?? null,
    }];
  });
  if(!winners.length) throw new Error("Project learning could not locate the accepted Loop winners.");

  const agreements=numbers(winners.map((winner)=>winner.preferenceAgreement));
  const motions=numbers(winners.map((winner)=>winner.motionScore));
  const performanceDeltas=numbers(winners.map((winner)=>delta(winner.performanceScoreBefore,winner.performanceScoreAfter)));
  const rafDeltas=numbers(winners.map((winner)=>delta(winner.rafP95Before,winner.rafP95After)));
  const assetDeltas=numbers(winners.map((winner)=>delta(winner.assetScoreBefore,winner.assetScoreAfter)));
  const accessibility=winners.map((winner)=>winner.accessibilityPassed).filter((value):value is boolean=>typeof value==="boolean");
  const bytes=winners
    .map((winner)=>delta(winner.referencedAssetBytesBefore,winner.referencedAssetBytesAfter))
    .filter((value):value is number=>value!==null);
  const strategies=[...new Set(winners.map((winner)=>winner.strategyId))];
  const reportFingerprint=sha(JSON.stringify(report));
  const approvedAt=input.approvedAt ?? new Date().toISOString();
  const learningId="learn-"+sha([
    input.projectId,
    report.runId,
    input.acceptedVersionId,
    report.currentFingerprint,
  ].join("|")).slice(0,24);

  return projectLearningRecordSchema.parse({
    version:1,
    id:learningId,
    status:"human-approved",
    projectId:input.projectId,
    runId:report.runId,
    loopId:report.loopId,
    sourceVersionId:report.sourceVersionId,
    acceptedVersionId:input.acceptedVersionId,
    approvedAt,
    approvedBy:input.approvedBy,
    baselineFingerprint:report.baselineFingerprint,
    acceptedFingerprint:report.currentFingerprint,
    creativeStateFingerprint:input.creativeStateFingerprint,
    buildPacketFingerprint:input.buildPacketFingerprint,
    controlPlane:report.controlPlane,
    acceptedImprovements:report.acceptedImprovements,
    winners,
    evidenceSummary:{
      candidateWins:winners.length,
      averagePreferenceAgreement:average(agreements),
      allFunctionalPassed:winners.every((winner)=>winner.functionalPassed===true),
      averageMotionScore:average(motions),
      averagePerformanceDelta:average(performanceDeltas),
      averageRafP95Delta:average(rafDeltas),
      averageAssetScoreDelta:average(assetDeltas),
      referencedAssetByteDelta:bytes.length ? Math.round(bytes.reduce((sum,value)=>sum+value,0)) : null,
      accessibilityPassRate:accessibility.length ? accessibility.filter(Boolean).length/accessibility.length : null,
      hardGateFailures:0,
    },
    lesson:[
      "Human-approved Forge Loop evidence.",
      "Loop "+report.loopId+".",
      "Winning strategies: "+strategies.join(", ")+".",
      report.learningCandidate ?? "Keep this project-scoped until independently supported by other projects.",
    ].join(" "),
    provenance:{
      source:"forge-loop-human-promotion",
      reportFingerprint,
      reportStartedAt:report.startedAt,
      reportEndedAt:report.endedAt,
    },
  });
}

export function evaluateProjectLearning(recordsInput:ProjectLearningRecord[]):ProjectLearningEvaluation {
  const records=recordsInput.map((record)=>projectLearningRecordSchema.parse(record));
  const groups=new Map<string,Array<{record:ProjectLearningRecord;winner:ProjectLearningRecord["winners"][number]}>>();
  const loops:Record<string,number>={};
  for(const record of records) {
    loops[record.loopId]=(loops[record.loopId] ?? 0)+1;
    for(const winner of record.winners) {
      const key=record.loopId+":"+winner.strategyId;
      groups.set(key,[...(groups.get(key) ?? []),{record,winner}]);
    }
  }
  const patterns=[...groups.entries()].map(([key,rows]):ProjectLearningPattern=>{
    const projectCount=new Set(rows.map((row)=>row.record.projectId)).size;
    const agreement=average(numbers(rows.map((row)=>row.winner.preferenceAgreement)));
    const motion=average(numbers(rows.map((row)=>row.winner.motionScore)));
    const performance=average(numbers(rows.map((row)=>delta(row.winner.performanceScoreBefore,row.winner.performanceScoreAfter))));
    const asset=average(numbers(rows.map((row)=>delta(row.winner.assetScoreBefore,row.winner.assetScoreAfter))));
    const reviewReady=projectCount>=3 && rows.length>=3 && (agreement ?? 0)>=0.75;
    return {
      key,
      loopId:rows[0].record.loopId,
      strategyId:rows[0].winner.strategyId,
      samples:rows.length,
      projects:projectCount,
      averagePreferenceAgreement:agreement,
      averageMotionScore:motion,
      averagePerformanceDelta:performance,
      averageAssetScoreDelta:asset,
      status:reviewReady ? "review-ready" : "hypothesis",
      rule:reviewReady
        ? "Independent project support is strong enough for human review as a possible Forge-wide lesson. Do not auto-promote it."
        : "Keep project-scoped. More independent projects are required before proposing a Forge-wide rule.",
    };
  }).sort((a,b)=>b.projects-a.projects || b.samples-a.samples || a.key.localeCompare(b.key));

  return {
    version:1,
    records:records.length,
    projects:new Set(records.map((record)=>record.projectId)).size,
    loops,
    patterns,
    promotionPolicy:"No project-learning pattern becomes global Forge doctrine automatically. Review-ready requires support from at least three independent projects and >=0.75 average preference agreement, then explicit human promotion.",
  };
}

export function promoteProjectLearningPattern(input:{
  graph:CreativeMemoryGraph;
  pattern:ProjectLearningPattern;
  approvedBy:string;
}):CreativeMemoryGraph {
  if(input.pattern.status!=="review-ready") {
    throw new Error("Only review-ready cross-project learning may be promoted into Forge Creative Memory.");
  }
  const approver=input.approvedBy.trim();
  if(!approver) throw new Error("Learning promotion requires an identified human approver.");
  const projectId="forge-learning";
  const graph:CreativeMemoryGraph={
    version:1,
    nodes:input.graph.nodes.some((node)=>node.id===projectId+":project")
      ? [...input.graph.nodes]
      : [...input.graph.nodes,{
          id:projectId+":project",
          type:"Project",
          label:"Forge cross-project learning",
          text:"Human-promoted lessons backed by independent Project Learning evidence.",
          tags:["learning","cross-project","human-approved"],
          projectId,
          confidence:1,
        }],
    edges:[...input.graph.edges],
  };
  const agreement=input.pattern.averagePreferenceAgreement;
  const confidence=Math.max(.7,Math.min(.95,.7+Math.min(5,input.pattern.projects)*.03+(agreement ?? 0)*.08));
  const evidence=[
    input.pattern.projects+" independent projects",
    input.pattern.samples+" accepted winner samples",
    agreement===null ? "preference agreement unavailable" : Math.round(agreement*100)+"% average preference agreement",
  ].join(", ");
  const lesson=[
    "Cross-project evidence pattern "+input.pattern.key+".",
    evidence+".",
    "Approved by "+approver+".",
    "Use as contextual evidence, not a mandatory design prescription.",
  ].join(" ");
  return addLesson(graph,projectId,lesson,confidence);
}

function delta(before:number|null,after:number|null) {
  return before===null || after===null ? null : after-before;
}
function numbers(values:Array<number|null|undefined>):number[] {
  return values.filter((value):value is number=>typeof value==="number" && Number.isFinite(value));
}
function average(values:number[]) {
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
}
function sha(value:string){ return createHash("sha256").update(value).digest("hex"); }
