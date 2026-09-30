import { creativeRebuildPlanSchema, type CreativeRebuildPlan } from "@/src/platform/autonomy/creativeRebuild";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig } from "@/src/types/experience";
import type { InteractionGraph } from "@/src/lib/interactionGraph";

type GatewayEnvironment=Record<string,string|undefined>;

export interface CreativeRebuildCapture {
  id:string;
  mimeType:"image/png"|"image/jpeg"|"image/webp";
  data:string;
}

export function creativeRebuildConfigured(environment:GatewayEnvironment=process.env) {
  return Boolean(environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN);
}

export async function requestCreativeRebuildPlan(input:{
  projectContext:string;
  strategy:string;
  experience:ExperienceConfig;
  interactionGraph:InteractionGraph;
  assetManifest:AssetManifest;
  captures:CreativeRebuildCapture[];
  environment?:GatewayEnvironment;
  fetchImpl?:typeof fetch;
}):Promise<CreativeRebuildPlan> {
  const environment=input.environment ?? process.env;
  const token=environment.AI_GATEWAY_API_KEY || environment.VERCEL_OIDC_TOKEN || "";
  if(!token) throw new Error("Concept Reset requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.");
  if(input.captures.length<2) throw new Error("Concept Reset requires at least two rendered captures of the current concept.");

  const model=environment.FORGE_AI_GATEWAY_REBUILD_MODEL?.trim()
    || environment.FORGE_AI_GATEWAY_DIRECTOR_MODEL?.trim()
    || environment.FORGE_AI_GATEWAY_VISUAL_MODEL?.trim()
    || "openai/gpt-5.4";
  const fetchImpl=input.fetchImpl ?? fetch;
  const sourceSceneIds=input.experience.scenes.map((scene)=>scene.id);
  const existingTargets=knownInteractionTargets(input.experience,input.interactionGraph);
  const assets=[
    ...input.assetManifest.models.map((asset)=>({type:"model",path:asset.path})),
    ...input.assetManifest.textures.map((asset)=>({type:"image/texture",path:asset.path})),
    ...input.assetManifest.video.map((asset)=>({type:"video",path:asset.path})),
    ...input.assetManifest.hdr.map((asset)=>({type:"hdri",path:asset.path})),
  ].slice(0,80);

  const content:Array<Record<string,unknown>>=[
    {type:"text",text:[
      "You are Forge's Concept Reset director. The current rendered concept has failed badly enough that bounded polish is insufficient.",
      "Design a materially different site structure using only Forge capabilities that can be compiled safely.",
      "You may reorder, duplicate or omit existing scenes by referencing sourceSceneId. You may change scene count between 3 and 8.",
      "Preserve verified client facts: do not invent claims, products, awards, locations, prices or capabilities. Scene copy/media will be inherited from the selected source scene.",
      "Do not solve a failed concept with more decorative effects. Change the narrative structure, shot order, camera language, motion archetype and interaction logic.",
      "Use one dominant signature mechanism. Supporting scenes should create contrast and stillness around it.",
      "If the requested experience genuinely requires a missing asset, declare it in assetGaps. Mark it critical only if using existing assets would make the concept dishonest or visibly wrong.",
      "Interaction recipes are optional. Only reference interaction targets from the supplied target list. The persistent WebGL hero target is 'hero'. Sequence recipes select a rebuilt scene slot; Forge resolves the real scene ID itself. Never invent sequence names.",
      "The final plan will be rendered and compared against the incumbent. A merely different candidate is useless; it must be more specific, coherent and production-worthy.",
      "",
      "Project context: "+input.projectContext,
      "Candidate strategy: "+input.strategy,
      "Current scene ids: "+sourceSceneIds.join(", "),
      "Current interaction targets: "+(existingTargets.join(", ")||"hero"),
      "Registered assets: "+JSON.stringify(assets),
      "Current scene structure: "+JSON.stringify(input.experience.scenes.map((scene)=>({
        id:scene.id,label:scene.label,copy:scene.copy,hasMedia:Boolean(scene.media),cameraPath:scene.camera.path,
      }))),
    ].join("\n")},
  ];
  for(const capture of input.captures.slice(0,10)) {
    content.push({type:"text",text:"Current concept capture: "+capture.id});
    content.push({type:"image_url",image_url:{url:"data:"+capture.mimeType+";base64,"+capture.data}});
  }

  const response=await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions",{
    method:"POST",
    headers:{authorization:"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify({
      model,
      messages:[{role:"user",content}],
      response_format:{
        type:"json_schema",
        json_schema:{
          name:"forge_concept_reset_plan",
          description:"A structural creative rebuild plan compiled from failed rendered evidence.",
          schema:gatewaySchema(sourceSceneIds,existingTargets),
        },
      },
    }),
    signal:AbortSignal.timeout(60_000),
  });
  if(!response.ok) throw new Error("Concept Reset planner failed ("+response.status+"): "+(await response.text()).slice(0,400));
  const payload=await response.json() as {choices?:Array<{message?:{content?:string|null}}>} ;
  const text=payload.choices?.[0]?.message?.content;
  if(!text) throw new Error("Concept Reset planner returned no structured content.");
  return creativeRebuildPlanSchema.parse(JSON.parse(text));
}

function knownInteractionTargets(experience:ExperienceConfig,graph:InteractionGraph) {
  const targets=new Set<string>(["hero"]);
  for(const node of graph.nodes) {
    if(node.kind==="trigger" && node.target) targets.add(node.target);
    if(node.kind==="action" && "target" in node.action && typeof node.action.target==="string") targets.add(node.action.target);
  }
  for(const scene of experience.scenes) if(scene.copy.cta) targets.add("cta-"+scene.id);
  for(const hotspot of experience.hotspots) targets.add("hotspot-"+hotspot.id);
  for(const node of experience.productRig?.nodes ?? []) targets.add("rig:"+node);
  for(const scene of experience.scenes) for(const asset of scene.assets ?? []) targets.add("asset:"+asset.id);
  return [...targets].slice(0,160);
}

function gatewaySchema(sourceSceneIds:string[],targets:string[]) {
  const targetEnum=targets.length ? targets : ["hero"];
  const recipe={
    oneOf:[
      {
        type:"object",
        properties:{
          kind:{const:"scene-sequence"},
          sceneSlot:{type:"integer",minimum:0,maximum:7},
        },
        required:["kind","sceneSlot"],
        additionalProperties:false,
      },
      {
        type:"object",
        properties:{
          kind:{const:"scene-shader"},
          sceneSlot:{type:"integer",minimum:0,maximum:7},
          target:{type:"string",enum:targetEnum},
          parameter:{type:"string",minLength:1,maxLength:160},
          value:{anyOf:[{type:"number"},{type:"boolean"},{type:"string",maxLength:120}]},
        },
        required:["kind","sceneSlot","target","parameter","value"],
        additionalProperties:false,
      },
      {
        type:"object",
        properties:{
          kind:{const:"pointer-orbit"},
          target:{type:"string",enum:targetEnum},
          sensitivity:{type:"number",minimum:.0005,maximum:.05},
        },
        required:["kind","target","sensitivity"],
        additionalProperties:false,
      },
      {
        type:"object",
        properties:{
          kind:{const:"click-sequence"},
          target:{type:"string",enum:targetEnum},
          sceneSlot:{type:"integer",minimum:0,maximum:7},
        },
        required:["kind","target","sceneSlot"],
        additionalProperties:false,
      },
      {
        type:"object",
        properties:{
          kind:{const:"hover-class"},
          target:{type:"string",enum:targetEnum},
          className:{type:"string",pattern:"^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$"},
        },
        required:["kind","target","className"],
        additionalProperties:false,
      },
    ],
  };
  return {
    type:"object",
    properties:{
      version:{const:1},
      thesis:{type:"string",minLength:12,maxLength:1600},
      failureDiagnosis:{type:"string",minLength:12,maxLength:1600},
      structuralReason:{type:"string",minLength:12,maxLength:1600},
      sceneBlueprints:{
        type:"array",minItems:3,maxItems:8,
        items:{
          type:"object",
          properties:{
            sourceSceneId:{type:"string",enum:sourceSceneIds},
            label:{type:"string",minLength:1,maxLength:80},
            role:{type:"string",enum:["establish","build","reveal","threshold","proof","resolve"]},
            archetype:{type:"string",enum:["editorial-reveal","parallax-story","threshold-passage","architectural-build","product-hero"]},
            cameraChoreography:{type:"string",enum:["director-precision-push","director-pullback-reveal","director-parallax-truck","director-crane-reveal","director-hero-orbit","director-s-curve","director-macro-approach","director-dolly-zoom"]},
            intensity:{type:"integer",minimum:1,maximum:10},
          },
          required:["sourceSceneId","label","role","archetype","cameraChoreography","intensity"],
          additionalProperties:false,
        },
      },
      interactionRecipes:{type:"array",items:recipe,maxItems:12},
      assetGaps:{
        type:"array",maxItems:16,
        items:{
          type:"object",
          properties:{
            name:{type:"string",minLength:1,maxLength:140},
            type:{type:"string",enum:["model","image","video","texture","hdri","audio","ui"]},
            reason:{type:"string",minLength:8,maxLength:800},
            critical:{type:"boolean"},
          },
          required:["name","type","reason","critical"],
          additionalProperties:false,
        },
      },
    },
    required:["version","thesis","failureDiagnosis","structuralReason","sceneBlueprints","interactionRecipes","assetGaps"],
    additionalProperties:false,
  };
}
