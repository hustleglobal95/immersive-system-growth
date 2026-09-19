import test from "node:test";
import assert from "node:assert/strict";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";
import { parseExperience } from "../src/lib/configSchema";
import { parseInteractionGraph } from "../src/lib/interactionGraph";
import { parseAssetManifest } from "../src/platform/assetManifestSchema";
import { createAutopilotSession, decideAutopilot } from "../src/platform/control-plane/autopilot";
import { forgeCapabilityRegistry } from "../src/platform/control-plane/capabilityRegistry";
import { critiqueContinuously } from "../src/platform/control-plane/continuousCritic";
import { compileMission } from "../src/platform/control-plane/mission";
import { recommendProjectOutcomes } from "../src/platform/control-plane/outcomeEngine";
import { buildMissionPlan } from "../src/platform/control-plane/planGraph";
import { evaluateProjectHealth } from "../src/platform/control-plane/projectHealth";

const manifest=parseAssetManifest(rawManifest);
const graph=parseInteractionGraph(rawGraph);

function fixture() {
  const source=structuredClone(rawExperience) as unknown as { scenes:Array<Record<string,unknown>> };
  source.scenes[0].motionTracks=[];
  delete source.scenes[0].mobileCamera;
  return parseExperience(source);
}

test("Mission Contract turns an outcome brief into bounded project-wide intent",()=>{
  const experience=fixture();
  const mission=compileMission({
    statement:"Create a flagship mechanical watch launch that feels precise, warm, engineered and unforgettable.",
    projectName:"Operator Intelligence Test",
    experience,
    manifest,
  });
  assert.equal(mission.version,1);
  assert.equal(mission.humanDecisions.length,3);
  assert.ok(mission.signatureMoment.length>40);
  assert.ok(mission.operatingPrinciples.some((item)=>/mobile/i.test(item)));
});

test("Plan Graph turns project health into dependent Forge operations",()=>{
  const experience=fixture();
  const health=evaluateProjectHealth({experience,manifest,graph,validationIssues:[]});
  const mission=compileMission({
    statement:"Create a flagship mechanical watch launch that feels precise, warm, engineered and unforgettable.",
    projectName:"Operator Intelligence Test",
    experience,
    manifest,
  });
  const plan=buildMissionPlan({mission,health});
  assert.ok(plan.steps.some((step)=>step.id==="creative-world"));
  assert.ok(plan.steps.some((step)=>step.id==="motion-0" && step.capabilityId==="scene.compose-motion"));
  assert.ok(plan.steps.some((step)=>step.id==="mobile-0" && step.capabilityId==="scene.fix-mobile"));
  assert.ok(plan.steps.some((step)=>step.id==="signature-moment" && step.autonomy==="human"));
  const capabilityIds=new Set(forgeCapabilityRegistry.map((item)=>item.id));
  assert.ok(plan.steps.filter((step)=>step.capabilityId).every((step)=>capabilityIds.has(step.capabilityId!)));
});

test("Outcome Engine ranks project-wide leverage instead of only selected-object gaps",()=>{
  const experience=fixture();
  const health=evaluateProjectHealth({experience,manifest,graph,validationIssues:[]});
  const mission=compileMission({
    statement:"Create a signature product experience with a decisive assembly moment and restrained luxury.",
    projectName:"Outcome Test",
    experience,
    manifest,
  });
  const plan=buildMissionPlan({mission,health});
  const outcomes=recommendProjectOutcomes({mission,plan,health,limit:3});
  assert.ok(outcomes.length>0);
  assert.ok(outcomes[0].score>=outcomes.at(-1)!.score);
  assert.ok(outcomes.every((item)=>item.step.status==="ready"));
});

test("Autopilot executes only bounded reversible work and pauses at review or human gates",()=>{
  const experience=fixture();
  const health=evaluateProjectHealth({experience,manifest,graph,validationIssues:[]});
  const mission=compileMission({
    statement:"Create a flagship product launch with one unforgettable mechanical reveal.",
    projectName:"Autopilot Test",
    experience,
    manifest,
  });
  const plan=buildMissionPlan({mission,health});
  const session=createAutopilotSession(plan,"autopilot");
  for(const step of plan.steps.filter((item)=>item.status==="ready")) {
    const decision=decideAutopilot(step,"autopilot");
    if(step.autonomy==="human") assert.equal(decision.disposition,"human-gate");
    if(step.autonomy==="preview") assert.equal(decision.disposition,"prepare-review");
  }
  assert.ok(session.humanRequired>=1);
});

test("Continuous Critic converts health evidence into bounded repair recommendations",()=>{
  const experience=fixture();
  const health=evaluateProjectHealth({experience,manifest,graph,validationIssues:[]});
  const mission=compileMission({
    statement:"Create a premium immersive product story with strong mobile translation.",
    projectName:"Critic Test",
    experience,
    manifest,
  });
  const plan=buildMissionPlan({mission,health});
  const report=critiqueContinuously({mission,health,plan});
  assert.notEqual(report.status,"clear");
  assert.ok(report.findings.some((finding)=>finding.domain==="motion"));
  assert.ok(report.findings.some((finding)=>finding.domain==="mobile"));
  assert.ok(report.topRepair);
});


test("human Mission gates block dependent automation until explicitly approved",()=>{
  const experience=fixture();
  const health=evaluateProjectHealth({experience,manifest,graph,validationIssues:[]});
  const mission=compileMission({
    statement:"Create a flagship mechanical watch launch with a precise warm visual world.",
    projectName:"Decision Gate Test",
    experience,
    manifest,
  });
  const blocked=buildMissionPlan({mission,health});
  assert.equal(blocked.steps.find((step)=>step.id==="creative-world")?.status,"ready");
  assert.equal(blocked.steps.find((step)=>step.id==="motion-0")?.status,"blocked");

  const approved=buildMissionPlan({mission,health,completedDecisionIds:["creative-world"]});
  assert.equal(approved.steps.find((step)=>step.id==="creative-world")?.status,"complete");
  assert.equal(approved.steps.find((step)=>step.id==="motion-0")?.status,"ready");
});
