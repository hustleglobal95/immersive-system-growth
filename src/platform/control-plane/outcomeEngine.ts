import type { MissionContract } from "@/src/platform/control-plane/mission";
import type { MissionPlanGraph, MissionPlanStep } from "@/src/platform/control-plane/planGraph";
import type { ProjectHealthReport } from "@/src/platform/control-plane/projectHealth";

export interface ProjectOutcome {
  id:string;
  label:string;
  reason:string;
  score:number;
  urgency:"now"|"recommended"|"later";
  step:MissionPlanStep;
}

export function recommendProjectOutcomes(input:{
  mission:MissionContract;
  plan:MissionPlanGraph;
  health:ProjectHealthReport;
  limit?:number;
}):ProjectOutcome[] {
  const blockers=input.health.issues.filter((issue)=>issue.severity==="blocker").length;
  const warnings=input.health.issues.filter((issue)=>issue.severity==="warning").length;
  const outcomes=input.plan.steps
    .filter((step)=>step.status==="ready")
    .map((step)=>{
      let score=step.leverage;
      const reasonParts=[step.reason];
      if(step.id==="validation-gate" && blockers) {
        score+=80;
        reasonParts.unshift("Production is blocked.");
      }
      if(step.id==="asset-quality" && input.health.metrics.manifestHealth<75) {
        score+=38;
        reasonParts.unshift("Asset quality is constraining the project.");
      }
      if(step.stage==="direction") {
        score+=input.mission.tier==="flagship" ? 32 : 18;
        reasonParts.unshift("Creative direction should lead downstream production.");
      }
      if(step.stage==="translation" && warnings) score+=12;
      if(step.stage==="approval") score-=8;
      const urgency=score>=125 ? "now" : score>=88 ? "recommended" : "later";
      return {
        id:`outcome-${step.id}`,
        label:step.label,
        reason:reasonParts.join(" "),
        score:Number(score.toFixed(1)),
        urgency,
        step,
      } satisfies ProjectOutcome;
    })
    .sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
  return outcomes.slice(0,Math.max(1,input.limit ?? 3));
}
