import type { DirectorBrief } from "@/src/platform/directorSchema";
import type { PortfolioCollision } from "@/src/platform/director-intelligence/types";
import type { CreativeMemoryReview } from "@/src/platform/director-intelligence/creativeMemory";

export interface ProductionOriginalityGate {
  required:boolean;
  passed:boolean;
  blockers:string[];
  collisions:PortfolioCollision[];
  memoryVerdict:CreativeMemoryReview["verdict"];
}

export function evaluateProductionOriginalityGate(input:{
  tier:DirectorBrief["tier"];
  collisions:PortfolioCollision[];
  memoryVerdict:CreativeMemoryReview["verdict"];
}):ProductionOriginalityGate {
  const required=input.tier==="signature" || input.tier==="flagship";
  if(!required) return {
    required:false,
    passed:true,
    blockers:[],
    collisions:input.collisions,
    memoryVerdict:input.memoryVerdict,
  };

  const blockers:string[]=[];
  if(input.memoryVerdict!=="clear") {
    blockers.push(
      `Signature/Flagship anti-repeat gate blocked: Creative Memory is ${input.memoryVerdict.toUpperCase()}; rewrite repeated house-style signals before implementation.`,
    );
  }

  for(const collision of input.collisions.filter((item)=>item.verdict!=="clear")) {
    const overlap=collision.highOverlap.slice(0,4).map((item)=>`${String(item.dimension)} ${item.score}%`).join(", ");
    blockers.push(
      `Signature/Flagship anti-repeat gate blocked: portfolio collision with ${collision.projectId} is ${collision.verdict.toUpperCase()} at ${collision.dimensions.overall}% overall${overlap ? ` (${overlap})` : ""}.`,
    );
  }

  return {
    required:true,
    passed:blockers.length===0,
    blockers,
    collisions:input.collisions,
    memoryVerdict:input.memoryVerdict,
  };
}

export function assertProductionOriginalityGate(gate:ProductionOriginalityGate) {
  if(gate.required && !gate.passed) {
    throw new Error(gate.blockers.join(" "));
  }
}
