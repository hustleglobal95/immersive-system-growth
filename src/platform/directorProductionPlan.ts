import { directProject } from "@/src/platform/directorEngine";
import { compileDirectorTreatment } from "@/src/platform/directorCompiler";
import { auditStructure, createStructurePlan, type SiteArchetypeId, type StructurePlan } from "@/src/platform/siteStructure";
import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { CreativePlan } from "@/src/platform/creativePlanSchema";

const structureMap: Record<DirectorBrief["projectType"], SiteArchetypeId> = {
  brand: "brand-flagship",
  product: "product-launch",
  property: "property-development",
  hospitality: "hospitality-destination",
  portfolio: "portfolio-studio",
  saas: "saas-product",
  commerce: "editorial-commerce",
  campaign: "campaign-story",
  automotive: "product-launch",
  fashion: "editorial-commerce",
};

export interface DirectorStructureAlignment {
  sectionId: string;
  sectionLabel: string;
  emotionalBeatId: string;
  emotionalBeatLabel: string;
  intensity: number;
  rationale: string;
}

export interface DirectorProductionPlan {
  treatment: DirectorTreatment;
  structure: StructurePlan;
  creativePlan: CreativePlan;
  alignment: DirectorStructureAlignment[];
  readiness: {
    creativeScore: number;
    structureScore: number;
    blockers: string[];
    readyForProduction: boolean;
  };
}

export function createDirectorProductionPlan(input: unknown): DirectorProductionPlan {
  const treatment = directProject(input);
  const compilation = compileDirectorTreatment(treatment);
  const structure = createStructurePlan(structureMap[treatment.projectType], treatment.tier);
  const structureAudit = auditStructure(structure);
  const alignment = alignStructureToTreatment(structure, treatment);
  const blockers = [
    ...treatment.critique.blockers.map((item) => `Director: ${item}`),
    ...structureAudit.issues.filter((issue) => issue.level === "error").map((issue) => `Structure: ${issue.message}`),
  ];
  return {
    treatment,
    structure,
    creativePlan: compilation.creativePlan,
    alignment,
    readiness: {
      creativeScore: treatment.critique.overall,
      structureScore: structureAudit.score,
      blockers,
      readyForProduction: treatment.critique.overall >= 9 && structureAudit.score >= 90 && blockers.length === 0,
    },
  };
}

function alignStructureToTreatment(structure: StructurePlan, treatment: DirectorTreatment): DirectorStructureAlignment[] {
  const meaningfulSections = structure.sections.filter((section) => section.role !== "footer");
  return meaningfulSections.map((section, index) => {
    const normalized = meaningfulSections.length <= 1 ? 0 : index / (meaningfulSections.length - 1);
    const beatIndex = Math.min(treatment.emotionalArc.length - 1, Math.round(normalized * (treatment.emotionalArc.length - 1)));
    const beat = treatment.emotionalArc[beatIndex];
    return {
      sectionId: section.id,
      sectionLabel: section.label,
      emotionalBeatId: beat.id,
      emotionalBeatLabel: beat.label,
      intensity: beat.intensity,
      rationale: `${section.label} carries the ${beat.label.toLowerCase()} emotional job (${beat.intensity}/10) while answering: ${section.userQuestion}`,
    };
  });
}
