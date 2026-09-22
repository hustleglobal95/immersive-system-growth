import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import { parseExperience } from "../src/lib/configSchema";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { specialistCriticBriefs } from "../src/platform/autonomy/visualDirector";
import { applyCreativeExecutionPlan, planCreativeExecution } from "../src/studio/creativeAgentPlan";
import type { DirectorBrief } from "../src/platform/directorSchema";
import type { AssetManifest } from "../src/types/assets";

const manifest=rawManifest as AssetManifest;
const brief:DirectorBrief={
  projectName:"Casa Lumen",
  projectType:"property",
  tier:"signature",
  client:"Atelier Maris",
  audience:"Design-conscious buyers who value architecture, privacy, material restraint and the Costa Brava setting.",
  objective:"Make the house feel spatially specific and desirable while moving qualified visitors toward a private inquiry.",
  primaryAction:"Request private information",
  brandTruth:"The house earns attention through restrained architecture, material tactility and the horizon rather than decorative luxury.",
  differentiators:["Coastal horizon relationship","Restrained material architecture","Private spatial sequence"],
  constraints:["Preserve supplied project facts","Avoid generic luxury gold","Mobile must preserve the threshold and horizon idea"],
  existingAssets:[
    {id:"pavilion",label:"Architectural pavilion GLB",type:"model",notes:"Registered production geometry"},
    {id:"coast",label:"Coastal imagery",type:"image",notes:"Registered visual context"},
  ],
  references:[{label:"Architectural film",lesson:"Patient threshold movement, stable horizon and restrained material closeups. Do not copy the grade or exact composition."}],
};

test("Creative Agent compiles Art Direction without rewriting protected project truth",()=>{
  const source=parseExperience(rawExperience);
  const first=structuredClone(source.scenes[0]);
  source.scenes[0]={...source.scenes[0],motionTracks:[]};
  const intelligence=runDirectorIntelligence({brief});
  const plan=planCreativeExecution({
    idea:"Make Casa Lumen feel like one restrained architectural journey from coast to threshold to horizon.",
    experience:source,
    manifest,
    variation:0,
    preferredMedia:["hybrid"],
    creativeDNA:intelligence.creativeDNA,
    artDirection:intelligence.artDirection,
    disciplineDirections:intelligence.disciplineDirections,
    mutations:intelligence.creativeMutations,
  });
  assert.equal(plan.validation.valid,true);
  const move=plan.sceneMoves.find((item)=>item.sceneIndex===0);
  assert.ok(move);
  const result=applyCreativeExecutionPlan(source,plan,[0]);
  const scene=result.scenes[0];

  assert.deepEqual(scene.copy,source.scenes[0].copy);
  assert.deepEqual(scene.camera.from,source.scenes[0].camera.from);
  assert.deepEqual(scene.camera.to,source.scenes[0].camera.to);
  assert.deepEqual(scene.material,source.scenes[0].material);
  assert.equal(scene.world.background,source.scenes[0].world.background);
  assert.equal(scene.world.fog,source.scenes[0].world.fog);
  assert.equal(scene.world.keyColor,source.scenes[0].world.keyColor);
  assert.equal(scene.world.rimColor,source.scenes[0].world.rimColor);
  assert.deepEqual(result.assets,source.assets);
  assert.ok(scene.post.bloom<=source.scenes[0].post.bloom);
  assert.ok(scene.post.vignette<=source.scenes[0].post.vignette);
  assert.equal(scene.camera.path,source.scenes[0].camera.waypoints?.length ? source.scenes[0].camera.path : move.compiledDirection.cameraPath);
  assert.ok(scene.motionTracks.some((track)=>track.id.startsWith("agent-v4-")));
  assert.notDeepEqual(scene.motionTracks,first.motionTracks);
});

test("Creative Agent leaves scenes outside the selected execution set untouched",()=>{
  const source=parseExperience(rawExperience);
  const intelligence=runDirectorIntelligence({brief});
  const plan=planCreativeExecution({
    idea:"Direct one coherent architectural world.",
    experience:source,
    manifest,
    creativeDNA:intelligence.creativeDNA,
    artDirection:intelligence.artDirection,
    disciplineDirections:intelligence.disciplineDirections,
    mutations:intelligence.creativeMutations,
  });
  assert.equal(plan.validation.valid,true);
  const selected=plan.sceneMoves[0].sceneIndex;
  const untouched=source.scenes.findIndex((_,index)=>index!==selected);
  const result=applyCreativeExecutionPlan(source,plan,[selected]);
  assert.deepEqual(result.scenes[untouched],source.scenes[untouched]);
});

test("Visual Director exposes the full Creative Intelligence critic council",()=>{
  assert.equal(specialistCriticBriefs.length,17);
  for(const critic of ["art-direction","color","lighting","material","image-direction","sound","originality","craft"]) {
    assert.ok(specialistCriticBriefs.some((item)=>item.id===critic));
  }
});

test("browser creative workflows load protected institutional memory and layered taste",()=>{
  const route=fs.readFileSync("app/api/studio/creative-intelligence/context/route.ts","utf8");
  const hook=fs.readFileSync("src/studio/useCreativeIntelligenceContext.ts","utf8");
  const agent=fs.readFileSync("src/studio/CreativeAgentWorkbench.tsx","utf8");
  const director=fs.readFileSync("src/studio/DirectorIntelligenceWorkbench.tsx","utf8");
  assert.match(route,/requireStudioRole\(request,"reviewer"\)/);
  assert.match(route,/readOperatorTaste\(identity\.id\)/);
  assert.match(route,/readProjectTaste\(projectId\)/);
  assert.match(route,/readMemoryDirectory\(projectId\)/);
  assert.match(route,/readPortfolioDirectory\(projectId\)/);
  assert.match(route,/portfolioFingerprints/);
  assert.match(route,/node\.projectId!==currentProjectId/);
  assert.match(hook,/creative-intelligence\/context/);
  assert.match(hook,/portfolio:data\.portfolio/);
  assert.match(agent,/portfolio:creativeContext\.portfolio/);
  assert.match(agent,/originalityBlocked/);
  assert.match(director,/portfolio:creativeContext\.portfolio/);
});

test("Creative Agent UI exposes DNA and mutation before execution",()=>{
  const agent=fs.readFileSync("src/studio/CreativeAgentWorkbench.tsx","utf8");
  assert.match(agent,/CREATIVE DNA/);
  assert.match(agent,/CREATIVE MUTATION/);
  assert.match(agent,/creativeCeiling/);
  assert.match(agent,/visualLanguageDivergence/);
});


test("Atelier Maris is persisted as prior-project originality evidence",()=>{
  const fingerprint=JSON.parse(fs.readFileSync("forge-intelligence/projects/atelier-maris-casa-lumen.fingerprint.json","utf8"));
  const memory=JSON.parse(fs.readFileSync("forge-intelligence/projects/atelier-maris-casa-lumen.memory.json","utf8"));
  assert.equal(fingerprint.projectId,"atelier-maris-casa-lumen");
  assert.ok(fingerprint.typographyBehavior.some((item:string)=>/Cormorant|serif/i.test(item)));
  assert.ok(fingerprint.compositionPatterns.some((item:string)=>/sticky story panel/i.test(item)));
  assert.ok(memory.nodes.some((node:{type:string})=>node.type==="TypographyGrammar"));
  assert.ok(memory.nodes.some((node:{type:string})=>node.type==="SignatureMoment"));
});
