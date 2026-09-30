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
    const points: Array<{key:string;progress:number;role:RenderReviewCapture["role"]}> = [];
    if(index===0) {
      // The poster frame is an explicit quality gate. Midpoint-only review let weak first impressions survive.
      points.push({key:"poster",progress:clamp(start+span*0.08),role:"opening"});
      points.push({key:"mid",progress:clamp(start+span*0.55),role:"midpoint"});
    } else if(index===scenes.length-1) {
      points.push({key:"setup",progress:clamp(start+span*0.18),role:"setup"});
      points.push({key:"final",progress:clamp(start+span*0.94),role:"resolution"});
    } else {
      points.push({key:"mid",progress:clamp(start+span*0.5),role:"midpoint"});
      points.push({key:"handoff",progress:clamp(start+span*0.9),role:"handoff"});
    }
    return points.map((point) => ({ scene, point }));
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
    comparisonRule:"A repair candidate must be production-ready in isolation and may replace the incumbent only after blinded pairwise visual comparison plus hard-gate verification. Merely being less bad than the incumbent is not acceptance.",
  };
}

function selectSceneIndexes(count:number,max:number) {
  if (count <= max) return [...Array(count).keys()];
  const indexes = new Set<number>([0,count-1]);
  for (let i=1;i<max-1;i++) indexes.add(Math.round((i/(max-1))*(count-1)));
  return [...indexes].sort((a,b) => a-b).slice(0,max);
}
function clamp(value:number) { return Math.max(0,Math.min(1,Number(value.toFixed(6)))); }
