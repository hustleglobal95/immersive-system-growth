import test from "node:test";
import assert from "node:assert/strict";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import { planInteractive3DFromPrompt } from "../src/platform/interactive3dPlanner";
import { evaluateInteractive3DBlueprintPolicy } from "../src/platform/interactive3dPolicy";
import { materializeInteractive3DExperience } from "../src/platform/interactive3dMaterializer";
import { constrainAiBlueprint, refineInteractive3DBlueprintWithAi } from "../src/platform/autonomy/aiGatewayInteractive3DPlanner";
import { generationRequestsForInteractive3D } from "../src/platform/interactive3dAssetFactory";
import { evaluateInteractive3DAutobuildReadiness } from "../src/platform/interactive3dAutobuild";

function plan(prompt:string,name:string) {
  return planInteractive3DFromPrompt({prompt,projectName:name,experience:rawExperience,manifest:rawManifest});
}

test("short prompts compile into materially different 3D experience archetypes", () => {
  const watch=plan("Create a premium interactive 3D mechanical watch launch with an exploded assembly reveal.","Aster Watch");
  const tower=plan("Create an immersive waterfront residence journey through architecture, threshold, materials and view.","Harbor House");
  const fashion=plan("Create an editorial couture campaign with cinematic typography, layered photography and restrained depth.","Nocturne Collection");
  assert.equal(watch.blueprint.experience.archetype,"product-reveal");
  assert.equal(tower.blueprint.experience.archetype,"spatial-story");
  assert.equal(fashion.blueprint.experience.archetype,"editorial-depth");
  assert.notEqual(watch.blueprint.experience.signatureMoment,tower.blueprint.experience.signatureMoment);
  assert.notDeepEqual(watch.blueprint.artDirection.palette,tower.blueprint.artDirection.palette);
  assert.ok([watch,tower,fashion].every((item)=>evaluateInteractive3DBlueprintPolicy(item.blueprint).passed));
});

test("prompt planner never reuses incumbent client-specific assets as the new hero by accident", () => {
  const result=plan("Create a cinematic coffee roastery experience centered on a tactile cup and roasted beans.","Zensia");
  const hero=result.blueprint.assets.find((asset)=>asset.heroCandidate)!;
  assert.equal(hero.status,"generate");
  assert.equal(hero.source,undefined);
  assert.ok(!result.blueprint.project.name.includes("ATELIER"));
});

test("owned hero input is explicit and survives as a production asset contract", () => {
  const result=planInteractive3DFromPrompt({
    prompt:"Create a premium 3D product reveal.",
    projectName:"Owned Product",
    experience:rawExperience,
    manifest:rawManifest,
    heroAsset:{id:"owned-product",label:"Owned Product GLB",type:"model",source:"/models/owned/product.glb"},
  });
  const hero=result.blueprint.assets.find((asset)=>asset.heroCandidate)!;
  assert.equal(hero.status,"existing");
  assert.equal(hero.source,"/models/owned/product.glb");
  assert.equal(evaluateInteractive3DBlueprintPolicy(result.blueprint).passed,true);
});

test("materializer removes incumbent content and emits registered Forge camera/motion work", () => {
  const result=plan("Create a premium interactive 3D mechanical watch launch with a controlled assembly reveal.","Aster Watch");
  const materialized=materializeInteractive3DExperience({blueprint:result.blueprint,experience:rawExperience});
  assert.equal(materialized.experience.meta.name,"Aster Watch");
  assert.ok(!materialized.experience.meta.description.includes("Casa Lumen"));
  assert.equal(materialized.experience.hotspots.length,0);
  assert.equal(materialized.experience.conversion,undefined);
  assert.ok(materialized.experience.scenes.every((scene)=>!scene.copy.body.includes("Begur")));
  assert.ok(materialized.appliedCommands.some((command)=>command.type==="camera.applyChoreography"));
  assert.ok(materialized.appliedCommands.some((command)=>command.type==="motion.applyArchetype"));
  assert.notDeepEqual(materialized.experience.scenes[0].camera,rawExperience.scenes[0].camera);
  assert.equal(materialized.experience.scenes[0].range[0],0);
  assert.equal(materialized.experience.scenes.at(-1)?.range[1],1);
  for(let index=1;index<materialized.experience.scenes.length;index++){
    const previous=materialized.experience.scenes[index-1];
    const current=materialized.experience.scenes[index];
    assert.equal(previous.range[1],current.range[0]);
    assert.deepEqual(previous.camera.to,current.camera.from);
    assert.deepEqual(previous.mobileCamera?.to,current.mobileCamera?.from);
  }
  assert.equal(materialized.assetReadiness.ready,false);
});

test("owned product hero is rendered once through PersistentHero rather than duplicated as a scene asset", () => {
  const result=planInteractive3DFromPrompt({
    prompt:"Create a premium 3D watch product reveal.",
    projectName:"Owned Product",
    experience:rawExperience,
    manifest:rawManifest,
    heroAsset:{id:"owned-product",label:"Owned Product GLB",type:"model",source:"/models/owned/product.glb"},
  });
  const materialized=materializeInteractive3DExperience({blueprint:result.blueprint,experience:rawExperience});
  assert.equal(materialized.experience.heroModel,"/models/owned/product.glb");
  assert.equal(materialized.experience.heroVisible,true);
  assert.equal(materialized.experience.assets.some((asset)=>asset.url==="/models/owned/product.glb"),false);
  assert.equal(materialized.assetReadiness.ready,true);
});

test("AI planner is bounded to Forge scene identity and protected asset facts", () => {
  const base=plan("Create a premium interactive 3D mechanical watch launch.","Aster Watch").blueprint;
  const candidate=structuredClone(base);
  candidate.experience.thesis="Use a precise material-led reveal with deliberate stillness around one mechanical transformation.";
  candidate.experience.scenes[0].camera.move="macro";
  candidate.assets[0].status="existing";
  candidate.assets[0].source="https://evil.example/hero.glb";
  const bounded=constrainAiBlueprint(base,candidate);
  assert.equal(bounded.experience.thesis,candidate.experience.thesis);
  assert.equal(bounded.assets[0].status,base.assets[0].status);
  assert.equal(bounded.assets[0].source,base.assets[0].source);
});

test("AI planner rejects attempts to replace executable scene identity", () => {
  const base=plan("Create an immersive waterfront residence journey.","Harbor House").blueprint;
  const candidate=structuredClone(base);
  candidate.experience.scenes[0].id="invented-scene";
  assert.throws(()=>constrainAiBlueprint(base,candidate),/scene identity/i);
});

test("AI Gateway planner uses structured output and validates the refined blueprint", async () => {
  const base=plan("Create a premium interactive 3D mechanical watch launch.","Aster Watch").blueprint;
  const candidate=structuredClone(base);
  candidate.experience.thesis="Turn mechanical precision into one restrained spatial reveal.";
  candidate.experience.scenes[0].camera.move="macro";
  let captured:RequestInit|undefined;
  const refined=await refineInteractive3DBlueprintWithAi({
    prompt:"Create a premium interactive 3D mechanical watch launch.",
    base,
    environment:{AI_GATEWAY_API_KEY:"test-key",FORGE_AI_GATEWAY_PLANNER_MODEL:"fixture/model"},
    fetchImpl:async(_url,init)=>{
      captured=init;
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(candidate)}}]}),{status:200,headers:{"content-type":"application/json"}});
    },
  });
  assert.equal(refined.experience.thesis,candidate.experience.thesis);
  const body=JSON.parse(String(captured?.body));
  assert.equal(body.model,"fixture/model");
  assert.equal(body.response_format.type,"json_schema");
});

test("asset factory emits project-specific generation requests instead of accepting placeholder assets", () => {
  const blueprint=plan("Create a premium interactive 3D mechanical watch launch.","Aster Watch").blueprint;
  const requests=generationRequestsForInteractive3D(blueprint);
  assert.ok(requests.some((request)=>request.type==="model"));
  assert.ok(requests.some((request)=>request.type==="image"));
  assert.ok(requests.every((request)=>request.prompt.includes("Aster Watch")));
  assert.ok(requests.every((request)=>!request.prompt.includes("Casa Lumen")));
});


function loopEvidence(loopId:"construction"|"visual-polish",acceptedImprovements:number) {
  return {
    code:0,
    reportPath:"/tmp/"+loopId+"/run-report.json",
    report:{
      version:1,
      runId:"test-"+loopId,
      loopId,
      objective:"Prove rendered quality.",
      status:"completed",
      startedAt:"2026-09-30T00:00:00.000Z",
      endedAt:"2026-09-30T00:01:00.000Z",
      source:"fixture",
      definition:{
        version:1,
        id:loopId,
        label:loopId,
        description:"fixture loop",
        objective:"fixture proof",
        worker:loopId==="construction"?"construction":"visual-repair",
        executable:true,
        verifiers:["schema","visual"],
        allowedRepairCommands:["scene.adjustPresentation"],
        strategies:[{id:"fixture",label:"fixture",instruction:"fixture strategy instruction"}],
        budgets:{maxCycles:1,maxCandidatesPerCycle:1,maxCandidateAttempts:1,maxWallTimeMs:30000,noProgressLimit:1},
        acceptance:{
          requireHardGates:true,
          requireCandidateWin:true,
          minPreferenceAgreement:0.67,
          maxMotionRegression:3,
        },
        memory:{runEvidence:true,projectJournal:"summary",forgeLearning:"manual-promotion"},
        humanGates:["Human approval required."],
      },
      baselineFingerprint:"a".repeat(64),
      currentFingerprint:"b".repeat(64),
      acceptedImprovements,
      candidateAttempts:1,
      noProgressStreak:0,
      reportedCostUsd:0,
      cycles:[{
        cycle:1,
        startedAt:"2026-09-30T00:00:00.000Z",
        endedAt:"2026-09-30T00:01:00.000Z",
        incumbentFingerprint:"a".repeat(64),
        candidates:[{
          id:"candidate-1",
          strategyId:"fixture",
          fingerprint:"b".repeat(64),
          hardGateFailures:[],
          functionalPassed:true,
          motionScore:100,
          comparisonAccepted:acceptedImprovements>0,
          comparisonWinner:acceptedImprovements>0?"candidate":"incumbent",
          preferenceAgreement:1,
          repairSummary:["fixture"],
          reason:"fixture comparison",
        }],
        ...(acceptedImprovements>0 ? {acceptedCandidateId:"candidate-1",acceptedFingerprint:"b".repeat(64)} : {}),
        noProgress:acceptedImprovements===0,
      }],
      humanApprovalRequired:true,
    },
  };
}

test("autonomous 3D readiness requires a separate visual-polish proof, not construction alone", () => {
  const result=evaluateInteractive3DAutobuildReadiness({
    materialized:true,
    signatureReady:true,
    aiRequested:true,
    aiConfigured:true,
    aiUsed:true,
    construction:loopEvidence("construction",1),
    visualPolish:null,
  });
  assert.equal(result.ready,false);
  assert.ok(result.blockers.some((item)=>item.includes("visual-polish")));
});

test("autonomous 3D readiness is earned only after both rendered loops pass hard gates", () => {
  const result=evaluateInteractive3DAutobuildReadiness({
    materialized:true,
    signatureReady:true,
    aiRequested:true,
    aiConfigured:true,
    aiUsed:true,
    construction:loopEvidence("construction",1),
    visualPolish:loopEvidence("visual-polish",1),
  });
  assert.equal(result.ready,true);
  assert.equal(result.totalAcceptedImprovements,2);
});

test("autonomous 3D readiness fails closed when no rendered improvement is proven", () => {
  const result=evaluateInteractive3DAutobuildReadiness({
    materialized:true,
    signatureReady:true,
    aiRequested:true,
    aiConfigured:true,
    aiUsed:true,
    construction:loopEvidence("construction",0),
    visualPolish:loopEvidence("visual-polish",0),
  });
  assert.equal(result.ready,false);
  assert.ok(result.blockers.some((item)=>item.includes("did not prove any accepted")));
});
