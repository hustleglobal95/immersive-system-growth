import { parseExperience } from "@/src/lib/configSchema";
import { createMotionArchetype, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { createProposalDraft, type ForgeProposal } from "@/src/platform/control-plane/proposal";
import type { ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import type { SelectionContext } from "@/src/platform/control-plane/selectionContext";
import type { ExperienceConfig, MotionTrack, Vec3 } from "@/src/types/experience";

export interface PreparedFastProposal {
  proposal:ForgeProposal;
  candidateExperience:ExperienceConfig;
}

export function prepareFastProposal(input:{
  id:string;
  createdAt:string;
  capability:ResolvedCapability;
  context:SelectionContext;
  experience:ExperienceConfig;
  intent:string;
  source?:"semantic-action"|"command"|"next-action"|"system";
  archetype:MotionArchetypeName;
}):PreparedFastProposal {
  if(input.capability.dispatch.type!=="fast-action") {
    throw new Error("Fast proposal preparation requires a fast-action capability.");
  }

  const base=createProposalDraft({
    id:input.id,
    createdAt:input.createdAt,
    capability:input.capability,
    context:input.context,
    intent:input.intent,
    source:input.source,
  });

  const result=input.capability.dispatch.action==="compose-motion"
    ? composeMotion(input.experience,input.context.sceneIndex,input.archetype)
    : buildNodeReveal(input.experience,input.context);

  const proposal:ForgeProposal={
    ...base,
    state:"ready",
    changes:result.changes,
    verification:{
      ...base.verification,
      results:base.verification.results.map((row)=>row.verifier==="schema"
        ? {...row,status:"passed" as const,detail:"Candidate passed parseExperience validation."}
        : row),
    },
    explanation:result.explanation,
  };
  return {proposal,candidateExperience:result.experience};
}

function composeMotion(experience:ExperienceConfig,sceneIndex:number,archetype:MotionArchetypeName) {
  const scene=experience.scenes[sceneIndex];
  const created=createMotionArchetype(archetype,experience,sceneIndex);
  const authored=scene.motionTracks.filter((track)=>!track.id.startsWith("studio-auto-"));
  const occupied=new Set(authored.map((track)=>`${track.viewport}:${track.target}`));
  const additions=created
    .filter((track)=>!occupied.has(`${track.viewport}:${track.target}`))
    .map((track)=>namespaceTrack(track,`studio-auto-${archetype}`));
  const nextTracks=[...authored,...additions];
  const candidate=parseExperience({
    ...structuredClone(experience),
    scenes:experience.scenes.map((item,index)=>index===sceneIndex ? {...item,motionTracks:nextTracks} : item),
  });
  return {
    experience:candidate,
    changes:[{
      path:`scenes[${sceneIndex}].motionTracks`,
      before:`${scene.motionTracks.length} tracks`,
      after:`${nextTracks.length} tracks`,
      summary:`Compose ${archetype.replaceAll("-"," ")} while preserving ${authored.length} explicitly authored track${authored.length===1?"":"s"}.`,
    }],
    explanation:`Forge prepared coordinated ${archetype.replaceAll("-"," ")} motion for ${scene.label} without touching explicitly authored target/viewport pairs.`,
  };
}

function buildNodeReveal(experience:ExperienceConfig,context:SelectionContext) {
  if(context.selection.kind!=="node") throw new Error("Build-node proposal requires a rig-node selection.");
  const sceneIndex=context.sceneIndex;
  const node=context.selection.name;
  const scene=experience.scenes[sceneIndex];
  const id=slug(node);
  const tracks:MotionTrack[]=[
    {
      id:`studio-node-${id}-position`,label:`${node} build`,type:"vector",target:`rig:${node}:position`,blend:"offset",viewport:"all",muted:false,locked:false,
      keyframes:[
        {id:`${id}-p0`,at:0,value:[0,-0.7,0] as Vec3,easing:"linear"},
        {id:`${id}-p1`,at:0.2,value:[0,-0.7,0] as Vec3,easing:"linear"},
        {id:`${id}-p2`,at:0.72,value:[0,0,0] as Vec3,easing:"cubic",curve:[0.16,1,0.3,1]},
        {id:`${id}-p3`,at:1,value:[0,0,0] as Vec3,easing:"linear"},
      ],
    },
    {
      id:`studio-node-${id}-opacity`,label:`${node} reveal`,type:"number",target:`rig:${node}:opacity`,blend:"absolute",viewport:"all",muted:false,locked:false,
      keyframes:[
        {id:`${id}-o0`,at:0,value:0,easing:"linear"},
        {id:`${id}-o1`,at:0.2,value:0,easing:"linear"},
        {id:`${id}-o2`,at:0.56,value:1,easing:"cubic",curve:[0.16,1,0.3,1]},
        {id:`${id}-o3`,at:1,value:1,easing:"linear"},
      ],
    },
  ];
  const targets=new Set(tracks.map((track)=>track.target));
  const previous=scene.motionTracks.filter((track)=>targets.has(track.target));
  const nextTracks=[...scene.motionTracks.filter((track)=>!targets.has(track.target)),...tracks];
  const candidate=parseExperience({
    ...structuredClone(experience),
    scenes:experience.scenes.map((item,index)=>index===sceneIndex ? {...item,motionTracks:nextTracks} : item),
  });
  return {
    experience:candidate,
    changes:[{
      path:`scenes[${sceneIndex}].motionTracks[rig:${node}]`,
      before:`${previous.length} targeted tracks`,
      after:"2 targeted tracks",
      summary:"Add one reversible positional build and one opacity reveal to the selected rig node.",
    }],
    explanation:`Forge prepared a reversible build + reveal for ${node}; unrelated rig-node tracks and rest poses remain untouched.`,
  };
}

function namespaceTrack(track:MotionTrack,prefix:string):MotionTrack {
  return {...track,id:`${prefix}-${track.id}`,keyframes:track.keyframes.map((key)=>({...key,id:`${prefix}-${key.id}`}))} as MotionTrack;
}

function slug(value:string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64);
}
