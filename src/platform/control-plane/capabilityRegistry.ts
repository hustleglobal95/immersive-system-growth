import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";

export type CapabilityExecutionClass="fast"|"deep"|"editor"|"navigation";
export type CapabilityRiskClass="instant-reversible"|"preview-required"|"approval-required";
export type CapabilitySystem=
  | "director"
  | "camera"
  | "motion"
  | "interaction"
  | "assets"
  | "environment"
  | "loops"
  | "sequencer"
  | "studio";
export type CapabilityVerifier="schema"|"functional"|"visual"|"motion"|"mobile"|"performance"|"accessibility"|"assets";

export type CapabilityDispatch =
  | { type:"select"; target:"camera" }
  | { type:"fast-action"; action:"compose-motion"|"build-node" }
  | { type:"workspace"; workspace:"Motion"|"Interact"|"Assets"|"Telemetry" }
  | { type:"route"; href:"/director"|"/studio/assets/create" }
  | { type:"loop"; loop:"visual-polish"|"mobile-translation"|"motion-polish"|"performance"|"asset-quality"|"construction" };

export interface ForgeCapability {
  id:string;
  label:string;
  description:string;
  selectionKinds:SelectionContext["kind"][];
  intents:string[];
  executionClass:CapabilityExecutionClass;
  riskClass:CapabilityRiskClass;
  systems:CapabilitySystem[];
  verifiers:CapabilityVerifier[];
  dispatch:CapabilityDispatch;
  priority:number;
  advancedSurface?:string;
  eligible?:(context:SelectionContext)=>boolean;
}

export interface ResolvedCapability extends ForgeCapability {
  eligible:true;
}

const registry:ForgeCapability[]=[
  {
    id:"scene.direct-camera",label:"Direct camera",description:"Move into shot direction for this scene before adding secondary detail.",
    selectionKinds:["scene"],intents:["camera","shot","frame","cinematic"],executionClass:"fast",riskClass:"instant-reversible",
    systems:["camera","studio"],verifiers:["schema"],dispatch:{type:"select",target:"camera"},priority:100,
  },
  {
    id:"scene.compose-motion",label:"Compose motion",description:"Apply one coordinated motion idea across the current scene.",
    selectionKinds:["scene"],intents:["motion","animate","reveal","build"],executionClass:"fast",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema","motion"],dispatch:{type:"fast-action",action:"compose-motion"},priority:92,
  },
  {
    id:"scene.add-behavior",label:"Add behavior",description:"Open behavior authoring for a deliberate interaction after the scene establishes itself.",
    selectionKinds:["scene"],intents:["interaction","behavior","inspect","click","drag"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["interaction"],verifiers:["schema","functional"],dispatch:{type:"workspace",workspace:"Interact"},priority:78,advancedSurface:"Interaction Graph",
  },
  {
    id:"scene.polish",label:"Polish scene",description:"Generate and compare a bounded visual-polish candidate instead of editing the current scene blindly.",
    selectionKinds:["scene"],intents:["polish","premium","improve","stronger","cinematic"],executionClass:"deep",riskClass:"preview-required",
    systems:["director","loops"],verifiers:["schema","functional","motion","mobile","visual"],dispatch:{type:"loop",loop:"visual-polish"},priority:66,
    eligible:(context)=>context.state.motionTrackCount>0,
  },
  {
    id:"scene.fix-mobile",label:"Fix mobile",description:"Re-compose the scene for narrow viewports while preserving its defining idea.",
    selectionKinds:["scene"],intents:["mobile","responsive","phone"],executionClass:"deep",riskClass:"preview-required",
    systems:["loops","camera","motion"],verifiers:["schema","functional","motion","mobile","visual"],dispatch:{type:"loop",loop:"mobile-translation"},priority:62,
  },
  {
    id:"camera.coordinate-motion",label:"Coordinate motion",description:"Coordinate scene motion around the selected shot.",
    selectionKinds:["camera"],intents:["coordinate","motion","camera","timing"],executionClass:"fast",riskClass:"instant-reversible",
    systems:["camera","motion"],verifiers:["schema","motion"],dispatch:{type:"fast-action",action:"compose-motion"},priority:100,
  },
  {
    id:"camera.fine-tune",label:"Fine tune shot",description:"Open the sequencer for exact camera, timing and curve control.",
    selectionKinds:["camera"],intents:["fine tune","camera","curve","keyframe"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["camera","sequencer"],verifiers:["schema"],dispatch:{type:"workspace",workspace:"Motion"},priority:86,advancedSurface:"Sequencer",
  },
  {
    id:"camera.ask-director",label:"Ask Director",description:"Open Director with the current shot as the creative problem.",
    selectionKinds:["camera"],intents:["director","critique","improve shot"],executionClass:"navigation",riskClass:"instant-reversible",
    systems:["director"],verifiers:[],dispatch:{type:"route",href:"/director"},priority:70,
  },
  {
    id:"node.build-reveal",label:"Build + reveal",description:"Create a reversible positional build and opacity reveal for the selected rig node.",
    selectionKinds:["node"],intents:["build","reveal","assemble","enter"],executionClass:"fast",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema","motion"],dispatch:{type:"fast-action",action:"build-node"},priority:100,
  },
  {
    id:"node.fine-tune",label:"Fine tune tracks",description:"Open exact node motion tracks and keyframes.",
    selectionKinds:["node"],intents:["fine tune","tracks","keyframes"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema"],dispatch:{type:"workspace",workspace:"Motion"},priority:82,advancedSurface:"Sequencer",
  },
  {
    id:"node.add-behavior",label:"Make inspectable",description:"Author interaction behavior for the selected product part.",
    selectionKinds:["node"],intents:["inspect","interaction","orbit","click"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["interaction"],verifiers:["schema","functional"],dispatch:{type:"workspace",workspace:"Interact"},priority:72,advancedSurface:"Interaction Graph",
  },
  {
    id:"node.inspect-model",label:"Inspect model",description:"Open model and asset diagnostics for the selected rig source.",
    selectionKinds:["node"],intents:["inspect model","asset","geometry"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["assets"],verifiers:["assets"],dispatch:{type:"workspace",workspace:"Assets"},priority:64,advancedSurface:"Asset workspace",
  },
  {
    id:"asset.inspect-optimize",label:"Inspect + optimize",description:"Open Asset Intelligence and source diagnostics for this production asset.",
    selectionKinds:["asset"],intents:["optimize","inspect","asset","performance"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["assets"],verifiers:["assets"],dispatch:{type:"workspace",workspace:"Assets"},priority:100,
  },
  {
    id:"asset.create-variant",label:"Create variant",description:"Create a new image, video or 3D variant through the existing Asset Creator.",
    selectionKinds:["asset"],intents:["variant","create","generate"],executionClass:"navigation",riskClass:"preview-required",
    systems:["assets"],verifiers:["assets","visual"],dispatch:{type:"route",href:"/studio/assets/create"},priority:80,
  },
  {
    id:"asset.improve",label:"Improve asset",description:"Run evidence-gated Asset Quality against the current project state.",
    selectionKinds:["asset"],intents:["improve","repair","optimize"],executionClass:"deep",riskClass:"preview-required",
    systems:["assets","loops"],verifiers:["schema","assets","performance","visual"],dispatch:{type:"loop",loop:"asset-quality"},priority:72,
  },
  {
    id:"environment.sequence",label:"Sequence atmosphere",description:"Coordinate lighting, atmosphere and post changes over the scene timeline.",
    selectionKinds:["environment"],intents:["atmosphere","lighting","sequence","environment"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["environment","motion","sequencer"],verifiers:["schema","motion"],dispatch:{type:"workspace",workspace:"Motion"},priority:100,advancedSurface:"Sequencer",
  },
  {
    id:"environment.polish",label:"Polish environment",description:"Compare a bounded visual-polish candidate for hierarchy, atmosphere and scene presentation.",
    selectionKinds:["environment"],intents:["polish","lighting","premium","hierarchy"],executionClass:"deep",riskClass:"preview-required",
    systems:["environment","director","loops"],verifiers:["schema","functional","motion","mobile","visual"],dispatch:{type:"loop",loop:"visual-polish"},priority:78,
  },
  {
    id:"environment.optimize",label:"Optimize runtime",description:"Measure renderer pressure and compare a bounded performance candidate.",
    selectionKinds:["environment"],intents:["performance","optimize","faster"],executionClass:"deep",riskClass:"preview-required",
    systems:["environment","loops"],verifiers:["schema","functional","performance","mobile","visual"],dispatch:{type:"loop",loop:"performance"},priority:70,
    eligible:(context)=>context.state.postPressure==="elevated",
  },
];

export const forgeCapabilityRegistry=registry;

export function capabilitiesForContext(context:SelectionContext):ResolvedCapability[] {
  return registry
    .filter((capability)=>capability.selectionKinds.includes(context.kind))
    .filter((capability)=>capability.eligible?.(context) ?? true)
    .sort((a,b)=>b.priority-a.priority || a.id.localeCompare(b.id))
    .map((capability)=>({...capability,eligible:true as const}));
}

export function capabilityById(id:string) {
  return registry.find((capability)=>capability.id===id) ?? null;
}

export function matchCapabilityIntent(context:SelectionContext,input:string) {
  const normalized=input.trim().toLowerCase();
  if(!normalized) return null;
  return capabilitiesForContext(context)
    .map((capability)=>({
      capability,
      score:capability.intents.reduce((score,intent)=>score+(normalized.includes(intent) ? Math.max(2,intent.split(/\s+/).length*2) : 0),0)
        +(normalized.includes(capability.label.toLowerCase()) ? 3 : 0),
    }))
    .filter((row)=>row.score>0)
    .sort((a,b)=>b.score-a.score || b.capability.priority-a.capability.priority)[0]?.capability ?? null;
}


export interface CapabilityRegistryIssue {
  capabilityId:string;
  message:string;
}

export function validateCapabilityRegistry(registryInput:ForgeCapability[]=registry):CapabilityRegistryIssue[] {
  const issues:CapabilityRegistryIssue[]=[];
  const ids=new Set<string>();
  for(const capability of registryInput) {
    if(ids.has(capability.id)) issues.push({capabilityId:capability.id,message:"Capability ID must be unique."});
    ids.add(capability.id);
    if(!capability.selectionKinds.length) issues.push({capabilityId:capability.id,message:"Capability must support at least one selection kind."});
    if(!capability.intents.length) issues.push({capabilityId:capability.id,message:"Capability must declare at least one operator intent."});
    if(!capability.systems.length) issues.push({capabilityId:capability.id,message:"Capability must name the Forge systems it orchestrates."});
    if(capability.executionClass==="deep" && capability.riskClass==="instant-reversible") {
      issues.push({capabilityId:capability.id,message:"Deep capabilities must require preview or approval."});
    }
    if(capability.dispatch.type==="loop") {
      if(!capability.systems.includes("loops")) issues.push({capabilityId:capability.id,message:"Loop dispatch must declare the Loop Engine system."});
      if(capability.riskClass!=="preview-required" && capability.riskClass!=="approval-required") {
        issues.push({capabilityId:capability.id,message:"Loop dispatch must require preview or approval."});
      }
      if(!capability.verifiers.length) issues.push({capabilityId:capability.id,message:"Loop dispatch must carry verification requirements."});
    }
    if(capability.dispatch.type==="fast-action" && capability.riskClass!=="instant-reversible") {
      issues.push({capabilityId:capability.id,message:"Fast actions must remain instant and reversible."});
    }
  }
  return issues;
}
