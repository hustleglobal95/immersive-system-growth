import type { ExperienceConfig } from "@/src/types/experience";

export type ReviewViewport = "desktop" | "mobile";
export type VisualCriticDimension =
  | "composition"
  | "typography"
  | "camera"
  | "motion"
  | "continuity"
  | "brand"
  | "art-direction"
  | "color"
  | "lighting"
  | "material"
  | "image-direction"
  | "sound"
  | "originality"
  | "craft"
  | "interaction"
  | "mobile"
  | "performance";

export interface RenderReviewCapture {
  id: string;
  viewport: ReviewViewport;
  progress: number;
  sceneId: string;
  sceneLabel: string;
  role: "opening" | "setup" | "midpoint" | "handoff" | "resolution";
}

export interface VisualCriticFinding {
  critic: VisualCriticDimension;
  captureId: string;
  severity: "blocker" | "major" | "minor" | "advisory";
  finding: string;
  evidence: string[];
  affectedSystems: string[];
  repair: string;
  confidence: number;
}

export interface RenderReviewPlan {
  version: 1;
  captures: RenderReviewCapture[];
  dimensions: VisualCriticDimension[];
  comparisonRule: string;
}

const dimensions: VisualCriticDimension[] = [
  "composition","typography","camera","motion","continuity","brand","art-direction","color","lighting","material","image-direction","sound","originality","craft","interaction","mobile","performance",
];

export function buildRenderReviewPlan(experience: ExperienceConfig, maxSceneSamples = 8): RenderReviewPlan {
  const scenes = experience.scenes;
  const chosen = selectSceneIndexes(scenes.length,maxSceneSamples);
  const base = chosen.flatMap((index) => {
    const scene = scenes[index];
    const start = scene.range[0];
    const end = scene.range[1];
    const span = Math.max(0.0001,end-start);
    const role: RenderReviewCapture["role"] = index === 0 ? "opening" : index === scenes.length-1 ? "resolution" : "midpoint";
    const midpoint = clamp(start + span*0.5);
    const handoff = clamp(start + span*0.9);
    return [
      { key:"mid", progress:midpoint, role },
      ...(index < scenes.length-1 ? [{ key:"handoff", progress:handoff, role:"handoff" as const }] : []),
    ].map((point) => ({ scene, point }));
  });
  const captures: RenderReviewCapture[] = [];
  for (const viewport of ["desktop","mobile"] as const) {
    for (const item of base) {
      captures.push({
        id: viewport + "-" + item.scene.id + "-" + item.point.key,
        viewport,
        progress:item.point.progress,
        sceneId:item.scene.id,
        sceneLabel:item.scene.label,
        role:item.point.role,
      });
    }
  }
  return {
    version:1,
    captures,
    dimensions,
    comparisonRule:"A repair candidate may replace the incumbent only after blinded pairwise visual comparison and hard-gate verification.",
  };
}

function selectSceneIndexes(count:number,max:number) {
  if (count <= max) return [...Array(count).keys()];
  const indexes = new Set<number>([0,count-1]);
  for (let i=1;i<max-1;i++) indexes.add(Math.round((i/(max-1))*(count-1)));
  return [...indexes].sort((a,b) => a-b).slice(0,max);
}
function clamp(value:number) { return Math.max(0,Math.min(1,Number(value.toFixed(6)))); }
