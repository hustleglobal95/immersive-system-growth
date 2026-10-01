import { parseInteractionGraph, type InteractionGraph } from "@/src/lib/interactionGraph";
import type { Interactive3DBlueprint } from "@/src/platform/interactive3dBlueprint";

export function interactionGraphForInteractive3D(blueprint: Interactive3DBlueprint): InteractionGraph {
  const signatureSceneId=blueprint.experience.signatureSceneId;
  const projectId=slug(blueprint.project.name).slice(0,48) || "forge-site";
  return parseInteractionGraph({
    version:1,
    id:projectId+"-interactions",
    initialState:"viewing",
    states:["viewing"],
    variables:{},
    nodes:[
      {
        id:"signature-enter",
        kind:"trigger",
        label:"Enter signature scene",
        position:{x:40,y:80},
        event:"scene-enter",
        sceneId:signatureSceneId,
        states:["viewing"],
      },
      {
        id:"enable-hero-orbit",
        kind:"action",
        label:"Enable hero inspection",
        position:{x:300,y:80},
        action:{type:"orbit",target:"hero",command:"enable",sensitivity:0.006},
      },
      {
        id:"signature-exit",
        kind:"trigger",
        label:"Leave signature scene",
        position:{x:40,y:230},
        event:"scene-exit",
        sceneId:signatureSceneId,
        states:["viewing"],
      },
      {
        id:"disable-hero-orbit",
        kind:"action",
        label:"Disable hero inspection",
        position:{x:300,y:230},
        action:{type:"orbit",target:"hero",command:"disable"},
      },
    ],
    edges:[
      {id:"signature-orbit-on",from:"signature-enter",to:"enable-hero-orbit",branch:"always",priority:0},
      {id:"signature-orbit-off",from:"signature-exit",to:"disable-hero-orbit",branch:"always",priority:0},
    ],
    mobileSubstitutions:[],
  });
}

function slug(value:string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
