import { capabilitiesForContext, type ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";

export interface NextAction {
  capability:ResolvedCapability;
  score:number;
  urgency:"now"|"recommended"|"optional";
  reason:string;
}

export function recommendNextActions(context:SelectionContext,limit=3):NextAction[] {
  return capabilitiesForContext(context)
    .map((capability)=>score(capability,context))
    .sort((a,b)=>b.score-a.score || b.capability.priority-a.capability.priority || a.capability.id.localeCompare(b.capability.id))
    .slice(0,Math.max(1,limit));
}

function score(capability:ResolvedCapability,context:SelectionContext):NextAction {
  let value=capability.priority/5;
  const reasons:string[]=[];

  const blocker=context.issues.find((issue)=>issue.severity==="blocker");
  const warning=context.issues.find((issue)=>issue.severity==="warning");

  if(context.kind==="scene" && context.state.motionTrackCount===0 && capability.id==="scene.compose-motion") {
    value+=40;reasons.push("scene has no authored motion");
  }
  if(context.kind==="scene" && context.state.motionTrackCount>0 && capability.id==="scene.polish") {
    value+=16;reasons.push("scene is authored enough for evidence-gated polish");
  }
  if(context.kind==="scene" && !context.state.hasMobileCamera && capability.id==="scene.fix-mobile") {
    value+=45;reasons.push("scene has no authored mobile camera");
  }
  if(context.kind==="scene" && context.state.interactionReferenceCount===0 && capability.id==="scene.add-behavior") {
    value+=10;reasons.push("scene has no related interaction behavior");
  }
  if(context.kind==="node" && context.state.selectedNodeTrackCount===0 && capability.id==="node.build-reveal") {
    value+=40;reasons.push("selected rig node has no authored behavior");
  }
  if(context.kind==="copy" && context.state.copyMotionTrackCount===0 && capability.id==="copy.reveal") {
    value+=38;reasons.push("copy has no authored reveal motion");
  }
  if(context.kind==="copy" && context.state.copyMotionTrackCount>0 && capability.id==="copy.polish") {
    value+=16;reasons.push("copy motion exists and hierarchy can be evaluated");
  }
  if(context.kind==="media" && context.state.mediaMotionTrackCount===0 && capability.id==="media.reveal") {
    value+=38;reasons.push("media has no authored reveal motion");
  }
  if(context.kind==="media" && context.state.mediaMotionTrackCount>0 && capability.id==="media.polish") {
    value+=16;reasons.push("media motion exists and composition can be evaluated");
  }
  if(context.kind==="asset" && context.state.manifestHealth<75 && capability.id==="asset.improve") {
    value+=45;reasons.push("manifest health needs attention");
  }
  if(context.kind==="asset" && capability.id==="asset.inspect-optimize") {
    value+=context.state.manifestHealth<85 ? 18 : 5;reasons.push("asset diagnostics are the safest first step");
  }
  if(context.kind==="environment" && context.state.postPressure==="elevated" && capability.id==="environment.optimize") {
    value+=35;reasons.push("post-processing pressure is elevated");
  }
  if(context.kind==="camera" && capability.id==="camera.coordinate-motion") {
    value+=10;reasons.push("camera direction should lead secondary motion");
  }

  if(blocker) {
    if(capability.systems.includes("assets") && blocker.code==="asset-blocker") {
      value+=30;reasons.push("resolves a blocking asset issue");
    } else if(capability.executionClass==="deep") {
      value-=18;reasons.push("project blocker should be resolved before broad optimization");
    }
  } else if(warning && capability.executionClass==="editor") {
    value+=4;reasons.push("safe editor path can resolve current warning");
  }

  const urgency=value>=55 ? "now" : value>=28 ? "recommended" : "optional";
  return {
    capability,
    score:Number(value.toFixed(1)),
    urgency,
    reason:reasons[0] ?? capability.description,
  };
}
