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
  | { type:"fast-action"; action:"compose-motion"|"build-node"|"copy-reveal"|"media-reveal" }
  | { type:"workspace"; workspace:"Motion"|"Interact"|"Assets"|"Telemetry" }
  | { type:"route"; href:"/director"|"/director/intelligence"|"/studio/agent"|"/studio/assets/create" }
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
    id:"scene.art-direct",label:"Develop art direction",description:"Send this scene into Creative Intelligence 2 for a project-specific visual language, discipline direction and concept mutation.",
    selectionKinds:["scene"],intents:["art direction","creative direction","visual language","less generic","more original","rethink direction"],executionClass:"navigation",riskClass:"instant-reversible",
    systems:["director","studio"],verifiers:[],dispatch:{type:"route",href:"/studio/agent"},priority:84,
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
    id:"copy.reveal",label:"Reveal typography",description:"Prepare a bounded copy reveal without changing the words or scene structure.",
    selectionKinds:["copy"],intents:["reveal","animate text","text reveal","typography","headline"],executionClass:"fast",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema","motion"],dispatch:{type:"fast-action",action:"copy-reveal"},priority:100,
  },
  {
    id:"copy.art-direct",label:"Direct typography",description:"Develop a project-specific type voice, hierarchy, line-break grammar and relationship to the visual world.",
    selectionKinds:["copy"],intents:["art direction","typography direction","type system","visual language","less generic","more editorial"],executionClass:"navigation",riskClass:"instant-reversible",
    systems:["director","studio"],verifiers:[],dispatch:{type:"route",href:"/studio/agent"},priority:90,
  },
  {
    id:"copy.polish",label:"Strengthen hierarchy",description:"Compare a bounded visual-polish candidate focused on copy hierarchy and composition.",
    selectionKinds:["copy"],intents:["hierarchy","readability","premium","polish","stronger type"],executionClass:"deep",riskClass:"preview-required",
    systems:["director","loops"],verifiers:["schema","functional","motion","mobile","visual"],dispatch:{type:"loop",loop:"visual-polish"},priority:80,
  },
  {
    id:"copy.fine-tune",label:"Fine tune typography motion",description:"Open exact copy timing, opacity, blur and vertical motion tracks.",
    selectionKinds:["copy"],intents:["fine tune","timing","opacity","blur","keyframes"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema"],dispatch:{type:"workspace",workspace:"Motion"},priority:68,advancedSurface:"Sequencer",
  },
  {
    id:"media.reveal",label:"Direct media reveal",description:"Prepare a deterministic media reveal using the scene's existing media source.",
    selectionKinds:["media"],intents:["reveal","transition","show media","image reveal","video reveal"],executionClass:"fast",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema","motion"],dispatch:{type:"fast-action",action:"media-reveal"},priority:100,
    eligible:(context)=>Boolean(context.state.mediaKind),
  },
  {
    id:"media.art-direct",label:"Direct image language",description:"Develop a coherent lens, crop, subject-distance, texture and grading language for this media world.",
    selectionKinds:["media"],intents:["image direction","film direction","art direction","visual language","grade","photography direction"],executionClass:"navigation",riskClass:"instant-reversible",
    systems:["director","studio"],verifiers:[],dispatch:{type:"route",href:"/studio/agent"},priority:90,
    eligible:(context)=>Boolean(context.state.mediaKind),
  },
  {
    id:"media.polish",label:"Polish media composition",description:"Compare a bounded visual-polish candidate for crop, hierarchy and media-to-copy composition.",
    selectionKinds:["media"],intents:["polish","crop","composition","premium","grade"],executionClass:"deep",riskClass:"preview-required",
    systems:["director","loops"],verifiers:["schema","functional","motion","mobile","visual"],dispatch:{type:"loop",loop:"visual-polish"},priority:82,
    eligible:(context)=>Boolean(context.state.mediaKind),
  },
  {
    id:"media.fine-tune",label:"Fine tune media timing",description:"Open exact reveal, opacity and transition timing controls.",
    selectionKinds:["media"],intents:["fine tune","timing","transition","scrub"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["motion","sequencer"],verifiers:["schema"],dispatch:{type:"workspace",workspace:"Motion"},priority:72,advancedSurface:"Sequencer",
  },
  {
    id:"media.asset-tools",label:"Inspect source asset",description:"Open source, manifest, optimization and provenance diagnostics for this scene media.",
    selectionKinds:["media"],intents:["asset","source","optimize media","inspect file"],executionClass:"editor",riskClass:"instant-reversible",
    systems:["assets"],verifiers:["assets"],dispatch:{type:"workspace",workspace:"Assets"},priority:64,advancedSurface:"Asset tools",
  },
  {
    id:"media.optimize-video",label:"Optimize video runtime",description:"Measure runtime pressure and compare a bounded performance candidate for video-heavy presentation.",
    selectionKinds:["media"],intents:["performance","video performance","faster","optimize"],executionClass:"deep",riskClass:"preview-required",
    systems:["loops","assets"],verifiers:["schema","functional","performance","mobile","visual"],dispatch:{type:"loop",loop:"performance"},priority:70,
    eligible:(context)=>context.state.mediaKind==="video",
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
    id:"environment.art-direct",label:"Direct visual world",description:"Develop lighting, color, material, atmosphere and spatial rules as one coherent Art Director system.",
    selectionKinds:["environment"],intents:["art direction","visual world","visual language","lighting direction","material direction","color direction","more alien","less sci fi","less generic","more original"],executionClass:"navigation",riskClass:"instant-reversible",
    systems:["director","environment","studio"],verifiers:[],dispatch:{type:"route",href:"/studio/agent"},priority:104,
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
