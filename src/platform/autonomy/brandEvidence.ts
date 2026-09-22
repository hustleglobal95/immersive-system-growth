import { z } from "zod";
import { parseDirectorBrief, type DirectorBrief } from "@/src/platform/directorSchema";

const line=z.string().min(1).max(600);
const url=z.string().url().max(1200);

export const BrandEvidenceSchema=z.object({
  version:z.literal(1),
  clientName:z.string().min(1).max(180),
  officialSources:z.array(z.object({
    label:z.string().min(1).max(180),
    url,
    observations:z.array(line).min(1).max(20),
  }).strict()).min(1).max(20),
  verifiedBrandTruth:line,
  verifiedAudience:line.optional(),
  verifiedPrimaryAction:z.string().min(1).max(180).optional(),
  differentiators:z.array(line).min(2).max(20),
  commercialJobs:z.array(line).min(1).max(20),
  visualSignals:z.array(line).min(2).max(30),
  antiSignals:z.array(line).min(2).max(30),
  contentSignals:z.array(line).min(1).max(30),
  unknowns:z.array(line).max(30).default([]),
}).strict();

export type BrandEvidence=z.infer<typeof BrandEvidenceSchema>;

export function parseBrandEvidence(value:unknown):BrandEvidence {
  return BrandEvidenceSchema.parse(value);
}

export function applyBrandEvidenceToBrief(brief:DirectorBrief,evidence:BrandEvidence):DirectorBrief {
  const sourceReferences=evidence.officialSources.map((source)=>({
    label:source.label,
    lesson:[
      "Verified official source: "+source.url,
      ...source.observations,
    ].join(" ").slice(0,600),
  }));
  const constraints=[
    ...brief.constraints,
    ...evidence.antiSignals.map((item)=>"Do not drift into this unsupported/generic visual territory: "+item),
    ...evidence.visualSignals.map((item)=>"Brand-derived visual signal to preserve: "+item),
    ...evidence.contentSignals.map((item)=>"Content evidence to make legible: "+item),
  ];
  return parseDirectorBrief({
    ...brief,
    client:evidence.clientName,
    audience:evidence.verifiedAudience ?? brief.audience,
    primaryAction:evidence.verifiedPrimaryAction ?? brief.primaryAction,
    brandTruth:evidence.verifiedBrandTruth,
    differentiators:[...new Set([...evidence.differentiators,...brief.differentiators])].map((item)=>item.slice(0,300)).slice(0,48),
    constraints:[...new Set(constraints)].map((item)=>item.slice(0,300)).slice(0,48),
    references:[...sourceReferences,...brief.references].slice(0,20),
  });
}
