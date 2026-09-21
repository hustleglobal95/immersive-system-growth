import { z } from "zod";

export const directorJudgeCalibrationSchema=z.object({
  version:z.literal(1),
  id:z.string().min(1).max(160),
  judgeId:z.string().min(1).max(160),
  benchmarkSetId:z.string().min(1).max(160),
  reviewedAt:z.string().datetime(),
  sampleSize:z.number().int().min(20),
  pairwiseAgreement:z.number().min(0).max(1),
  lockPrecision:z.number().min(0).max(1),
  falseLockRate:z.number().min(0).max(1),
  reviewer:z.string().min(1).max(160),
}).strict().superRefine((value,ctx)=>{
  if(value.pairwiseAgreement<0.75) ctx.addIssue({code:"custom",path:["pairwiseAgreement"],message:"Calibration agreement must be at least 0.75."});
  if(value.lockPrecision<0.8) ctx.addIssue({code:"custom",path:["lockPrecision"],message:"LOCK precision must be at least 0.80."});
  if(value.falseLockRate>0.1) ctx.addIssue({code:"custom",path:["falseLockRate"],message:"False LOCK rate must be at most 0.10."});
});

export type DirectorJudgeCalibration=z.infer<typeof directorJudgeCalibrationSchema>;

export function parseDirectorJudgeCalibration(input:unknown) {
  return directorJudgeCalibrationSchema.parse(input);
}
