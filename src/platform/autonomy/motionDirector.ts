import { z } from "zod";
import type { MotionQualityReport } from "@/src/platform/autonomy/motionQuality";

export const motionSequenceFindingSchema=z.object({
  dimension:z.enum(["easing","camera","subject","continuity","timing","visual-cadence"]),
  severity:z.enum(["blocker","major","minor","advisory"]),
  sceneId:z.string().min(1).max(160),
  finding:z.string().min(8).max(1200),
  evidence:z.array(z.string().min(1).max(600)).max(12).default([]),
  repair:z.string().min(8).max(1200),
  confidence:z.number().min(0).max(1),
}).strict();

export const motionSequenceResponseSchema=z.object({
  findings:z.array(motionSequenceFindingSchema).max(24),
  summary:z.string().max(2400).optional(),
}).strict();

export interface MotionSequenceCriticRequest {
  version:1;
  mode:"motion-sequence";
  sceneId:string;
  viewport:"desktop"|"mobile";
  projectContext:string;
  progresses:number[];
  deterministicMetrics:MotionQualityReport["metrics"];
  rules:string[];
}

export type MotionSequenceFinding=z.infer<typeof motionSequenceFindingSchema>;

export function buildMotionSequenceCriticRequest(input:{
  sceneId:string;
  viewport:"desktop"|"mobile";
  projectContext:string;
  progresses:number[];
  deterministicMetrics:MotionQualityReport["metrics"];
}):MotionSequenceCriticRequest {
  return {
    version:1,
    mode:"motion-sequence",
    sceneId:input.sceneId,
    viewport:input.viewport,
    projectContext:input.projectContext,
    progresses:input.progresses,
    deterministicMetrics:input.deterministicMetrics,
    rules:[
      "Judge the ordered frames as one motion phrase, not as independent still compositions.",
      "Look for mechanical smoothness, motivated camera travel, coherent subject motion and visual cadence.",
      "Flag a blocker only when the sequence is visibly broken, discontinuous, unreadable or clearly non-production-ready.",
      "Do not reward extra motion, speed or spectacle by itself.",
      "Prefer a concrete repair tied to timing, camera, subject motion or transition continuity.",
      "Headless frame-time metrics are supporting evidence, not a substitute for visual judgment.",
    ],
  };
}

export function parseMotionSequenceResponse(value:unknown) {
  return motionSequenceResponseSchema.parse(value);
}
