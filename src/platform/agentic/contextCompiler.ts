import type { CreativeStateGraph } from "@/src/platform/agentic/creativeStateGraph";
import { capabilityById } from "@/src/platform/control-plane/capabilityRegistry";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";
import type { InteractionGraph } from "@/src/lib/interactionGraph";

export type AgentTaskDomain=
  | "camera"
  | "motion"
  | "composition"
  | "typography"
  | "interaction"
  | "asset"
  | "mobile"
  | "performance"
  | "engineering"
  | "director";

export interface AgentTask {
  id:string;
  domain:AgentTaskDomain;
  objective:string;
  sceneId?:string;
  finding?:string;
}

export interface AgentContextCapsule {
  version:1;
  task:AgentTask;
  creativeFingerprint:string;
  protectedTruth:{
    brandTruth:string;
    objective:string;
    primaryAction:string;
    constraints:string[];
  };
  direction:{
    thesis:string;
    northStar:string;
    memoryPromise:string;
    signatureMoment:CreativeStateGraph["direction"]["signatureMoment"];
  };
  scene:CreativeStateGraph["implementation"]["sceneContracts"][number]|null;
  runtime:{
    scene:ExperienceConfig["scenes"][number]|null;
    assets:AssetManifest|null;
    interactionGraph:InteractionGraph|null;
  };
  guidance:string[];
  allowedSystems:string[];
  allowedCapabilityIds:string[];
  deniedActions:string[];
  verification:string[];
  contextRule:string;
}

export function compileAgentContext(input:{
  graph:CreativeStateGraph;
  task:AgentTask;
  currentState?:{
    experience?:ExperienceConfig;
    assetManifest?:AssetManifest;
    interactionGraph?:InteractionGraph;
  };
}):AgentContextCapsule {
  const {graph,task}=input;
  const scene=task.sceneId
    ? graph.implementation.sceneContracts.find((item)=>item.id===task.sceneId) ?? null
    : null;
  const runtimeScene=task.sceneId
    ? input.currentState?.experience?.scenes.find((item)=>item.id===task.sceneId) ?? null
    : null;
  const policy=domainPolicy(task.domain);
  const capabilities=policy.capabilityIds.filter((id)=>Boolean(capabilityById(id)));
  return {
    version:1,
    task,
    creativeFingerprint:graph.fingerprint,
    protectedTruth:{
      brandTruth:graph.truth.brandTruth,
      objective:graph.truth.objective,
      primaryAction:graph.truth.primaryAction,
      constraints:[...graph.truth.constraints],
    },
    direction:{
      thesis:graph.direction.thesis,
      northStar:graph.direction.northStar,
      memoryPromise:graph.direction.memoryPromise,
      signatureMoment:graph.direction.signatureMoment,
    },
    scene,
    runtime:{
      scene:runtimeScene,
      assets:policy.includeAssets ? input.currentState?.assetManifest ?? null : null,
      interactionGraph:policy.includeInteractions ? input.currentState?.interactionGraph ?? null : null,
    },
    guidance:domainGuidance(graph,task.domain,scene),
    allowedSystems:policy.systems,
    allowedCapabilityIds:capabilities,
    deniedActions:[
      "Rewrite the controlling thesis, client truth, primary action or approved signature moment.",
      "Invent client facts, metrics, assets, awards or product claims.",
      "Modify systems outside this capsule's allowedSystems simply because they are available elsewhere in Forge.",
      "Promote a candidate without the required verification and comparative evidence.",
      ...(task.domain==="director" ? [] : ["Change Director-locked strategic fields. Escalate instead."]),
    ],
    verification:policy.verification,
    contextRule:"Use this capsule as the task context. Request additional context only when a named dependency is genuinely missing; do not reload the entire project by default.",
  };
}

function domainPolicy(domain:AgentTaskDomain) {
  const common=["schema"];
  const policies:Record<AgentTaskDomain,{
    systems:string[];
    capabilityIds:string[];
    verification:string[];
    includeAssets:boolean;
    includeInteractions:boolean;
  }> = {
    camera:{
      systems:["camera","motion"],
      capabilityIds:["scene.direct-camera","camera.coordinate-motion"],
      verification:[...common,"rendered framing","forward/reverse motion","mobile framing"],
      includeAssets:false,includeInteractions:false,
    },
    motion:{
      systems:["motion","sequencer"],
      capabilityIds:["scene.compose-motion"],
      verification:[...common,"motion continuity","reverse traversal","first-use smoothness"],
      includeAssets:false,includeInteractions:false,
    },
    composition:{
      systems:["studio","camera","motion"],
      capabilityIds:["scene.polish"],
      verification:[...common,"rendered hierarchy","pairwise visual comparison","mobile composition"],
      includeAssets:false,includeInteractions:false,
    },
    typography:{
      systems:["studio","motion"],
      capabilityIds:["scene.polish"],
      verification:[...common,"readability","copy/subject separation","mobile hierarchy"],
      includeAssets:false,includeInteractions:false,
    },
    interaction:{
      systems:["interaction"],
      capabilityIds:["scene.add-behavior"],
      verification:[...common,"functional verification","keyboard/touch behavior","reversible state"],
      includeAssets:false,includeInteractions:true,
    },
    asset:{
      systems:["assets"],
      capabilityIds:["asset.inspect-optimize","asset.improve"],
      verification:[...common,"asset provenance","runtime weight","visual fitness"],
      includeAssets:true,includeInteractions:false,
    },
    mobile:{
      systems:["camera","motion","interaction","studio"],
      capabilityIds:["scene.fix-mobile"],
      verification:[...common,"mobile rendered evidence","touch targets","signature idea preservation"],
      includeAssets:false,includeInteractions:true,
    },
    performance:{
      systems:["assets","environment","motion"],
      capabilityIds:["environment.optimize","media.optimize-video"],
      verification:[...common,"performance profile","visual regression","mobile performance"],
      includeAssets:true,includeInteractions:false,
    },
    engineering:{
      systems:["studio"],
      capabilityIds:[],
      verification:[...common,"tests","typecheck","build","browser verification"],
      includeAssets:true,includeInteractions:true,
    },
    director:{
      systems:["director"],
      capabilityIds:["scene.art-direct","environment.art-direct"],
      verification:["evidence provenance","territory/hierarchy consistency","human or calibrated rendered judgment"],
      includeAssets:true,includeInteractions:true,
    },
  };
  return policies[domain];
}

function domainGuidance(
  graph:CreativeStateGraph,
  domain:AgentTaskDomain,
  scene:CreativeStateGraph["implementation"]["sceneContracts"][number]|null,
) {
  const dna=graph.direction.creativeDNA;
  const global=graph.implementation.globalRules.slice(0,8);
  const perDomain:Record<AgentTaskDomain,string[]> = {
    camera:[dna.threeD.cameraRelationship,dna.image.lens,scene?.continuityAnchor ?? "",scene?.depthStrategy ?? ""],
    motion:[dna.motion.energy,dna.motion.inertia,dna.motion.stillness,dna.motion.signatureBehavior,scene?.motionStrategy ?? ""],
    composition:[dna.composition.dominance,dna.composition.negativeSpace,dna.composition.scaleContrast,dna.composition.rhythm],
    typography:[dna.typography.personality,dna.typography.scaleContrast,dna.typography.hierarchy,dna.typography.motionRelationship],
    interaction:[dna.interaction.model,dna.interaction.feedback,dna.interaction.restraint,scene?.interactionStrategy ?? ""],
    asset:[dna.image.crop,dna.image.texture,dna.threeD.materialFamily,dna.threeD.realismRule],
    mobile:[dna.mobile.preserve,dna.mobile.simplify,dna.mobile.neverLose,...(scene?.mobileTranslation ?? [])],
    performance:["Protect the signature idea before removing effects.",`Maximum simultaneous heavy systems: ${graph.implementation.maxSimultaneousHeavySystems}.`,...global],
    engineering:["Reuse Forge-native architecture before adding a new primitive.","Keep changes bounded to the requested behavior.","If a new primitive is required, document why existing systems cannot express it."],
    director:[graph.direction.thesis,graph.direction.northStar,graph.direction.memoryPromise,...global],
  };
  return perDomain[domain].filter(Boolean).slice(0,12);
}
