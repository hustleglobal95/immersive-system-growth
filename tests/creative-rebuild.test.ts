import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseExperience } from "../src/lib/configSchema";
import { parseInteractionGraph } from "../src/lib/interactionGraph";
import { parseAssetManifest } from "../src/platform/assetManifestSchema";
import { requestCreativeRebuildPlan } from "../src/platform/autonomy/aiGatewayCreativeRebuild";

const experience=parseExperience(JSON.parse(fs.readFileSync("config/experience.json","utf8")));
const graph=parseInteractionGraph(JSON.parse(fs.readFileSync("config/interaction-graph.json","utf8")));
const manifest=parseAssetManifest(JSON.parse(fs.readFileSync("config/asset-manifest.json","utf8")));

test("Concept Reset planner is multimodal, structured and bounded to registered scene identity",async()=>{
  const sourceIds=experience.scenes.slice(0,3).map((scene)=>scene.id);
  let captured:RequestInit|undefined;
  const plan=await requestCreativeRebuildPlan({
    projectContext:"Rebuild this immersive architecture experience around one decisive threshold interaction and preserve all verified client facts.",
    strategy:"signature-mechanism",
    experience,
    interactionGraph:graph,
    assetManifest:manifest,
    captures:[
      {id:"desktop-poster",mimeType:"image/png",data:"Zmlyc3QtaW1hZ2U="},
      {id:"desktop-final",mimeType:"image/png",data:"c2Vjb25kLWltYWdl"},
    ],
    environment:{AI_GATEWAY_API_KEY:"test-key",FORGE_AI_GATEWAY_REBUILD_MODEL:"openai/gpt-5.4"},
    fetchImpl:async(_url,init)=>{
      captured=init;
      return new Response(JSON.stringify({
        choices:[{message:{content:JSON.stringify({
          version:1,
          thesis:"Make the threshold the single authored event and let the surrounding chapters build toward and away from it.",
          failureDiagnosis:"The incumbent distributes equal visual pressure across chapters, so no moment feels consequential.",
          structuralReason:"Reordering the strongest authored states creates anticipation, event and proof without inventing new client content.",
          sceneBlueprints:[
            {sourceSceneId:sourceIds[0],label:"Approach",role:"establish",archetype:"editorial-reveal",cameraChoreography:"director-precision-push",intensity:3},
            {sourceSceneId:sourceIds[1],label:"Threshold",role:"threshold",archetype:"threshold-passage",cameraChoreography:"director-crane-reveal",intensity:10},
            {sourceSceneId:sourceIds[2],label:"Proof",role:"proof",archetype:"parallax-story",cameraChoreography:"director-pullback-reveal",intensity:4},
          ],
          interactionRecipes:[{kind:"scene-sequence",sceneSlot:1}],
          assetGaps:[],
        })}}],
      }),{status:200,headers:{"content-type":"application/json"}});
    },
  });
  assert.equal(plan.sceneBlueprints.length,3);
  assert.equal(plan.interactionRecipes[0].kind,"scene-sequence");
  const body=JSON.parse(String(captured?.body));
  assert.equal(body.model,"openai/gpt-5.4");
  assert.equal(body.response_format.type,"json_schema");
  assert.equal(body.messages[0].content.filter((part:{type:string})=>part.type==="image_url").length,2);
  const schemaText=JSON.stringify(body.response_format.json_schema.schema);
  assert.match(schemaText,new RegExp(sourceIds[0]));
  assert.doesNotMatch(schemaText,/sequenceName/);
  assert.match(String((captured?.headers as Record<string,string>).authorization),/Bearer test-key/);
});

test("Concept Reset planner fails closed without AI Gateway credentials",async()=>{
  await assert.rejects(()=>requestCreativeRebuildPlan({
    projectContext:"Rebuild the failed concept.",
    strategy:"narrative-reversal",
    experience,
    interactionGraph:graph,
    assetManifest:manifest,
    captures:[
      {id:"a",mimeType:"image/png",data:"YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFh"},
      {id:"b",mimeType:"image/png",data:"YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi"},
    ],
    environment:{},
    fetchImpl:async()=>new Response("{}",{status:200}),
  }),/requires AI_GATEWAY_API_KEY|Concept Reset requires/);
});
