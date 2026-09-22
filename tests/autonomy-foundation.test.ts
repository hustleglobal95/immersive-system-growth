import test from "node:test";
import assert from "node:assert/strict";
import { inferPromptIntelligence } from "../src/platform/autonomy/promptIntelligence";
import { routeDecisionGuidance } from "../src/platform/autonomy/guidanceRouter";
import { forcedOptimizationDecision } from "../src/platform/autonomy/forcedOptimization";
import { autonomyContract } from "../src/platform/autonomy/contracts";
import { runAutonomyBenchmark } from "../src/platform/autonomy/autonomyBenchmark";
import { buildRenderReviewPlan } from "../src/platform/autonomy/visualReview";
import { buildFunctionalVerificationPlan } from "../src/platform/autonomy/functionalVerification";
import { parseBrandEvidence } from "../src/platform/autonomy/brandEvidence";
import fs from "node:fs";
import rawExperience from "../config/experience.json" with { type: "json" };
import { parseExperience } from "../src/lib/configSchema";
import type { AssetManifest } from "../src/types/assets";

const emptyManifest: AssetManifest = {
  models: [],
  textures: [],
  hdr: [],
  video: [],
  budgets: { modelMb:30, textureMb:24, hdrMb:16, videoMb:60, totalMb:120 },
};

test("short prompts infer commercially distinct Director briefs", () => {
  const watch = inferPromptIntelligence({ prompt:"Luxury mechanical watch. Enter the movement through an exploded 3D assembly.", projectName:"Watch", sceneCount:6, manifest:emptyManifest });
  const hotel = inferPromptIntelligence({ prompt:"Boutique hotel carved into a cliff. Make booking feel like arrival.", projectName:"Hotel", sceneCount:6, manifest:emptyManifest });
  const saas = inferPromptIntelligence({ prompt:"AI infrastructure platform. Explain complexity without generic glowing data particles.", projectName:"Cloud", sceneCount:6, manifest:emptyManifest });
  assert.equal(watch.projectType.value,"product");
  assert.equal(hotel.projectType.value,"hospitality");
  assert.equal(saas.projectType.value,"saas");
  assert.notEqual(watch.brief.primaryAction,hotel.brief.primaryAction);
  assert.notEqual(hotel.brief.audience,saas.brief.audience);
  assert.ok(watch.recommendedMedia.includes("real-3d"));
  assert.ok(watch.brief.brandTruth.includes("Working hypothesis"));
});

test("homebuilder prompts resolve to community decision-making instead of generic luxury property", () => {
  const packet=inferPromptIntelligence({
    prompt:"David Weekley Homes at Verona. Create an immersive launch experience for a future master-planned community with home designs, homesites and buyer choice.",
    projectName:"David Weekley Homes at Verona",
    sceneCount:7,
    manifest:emptyManifest,
  });
  assert.equal(packet.projectType.value,"property");
  assert.equal(packet.brief.primaryAction,"Explore the community");
  assert.match(packet.brief.audience,/Future homeowners|community/i);
  assert.match(packet.brief.brandTruth,/community understandable|builder trust|ownership/i);
  assert.ok(packet.brief.constraints.some((item)=>/logo swap/i.test(item)));
  assert.ok(packet.researchNeeds.some((item)=>/official site/i.test(item)));
});

test("prompt intelligence carries registered assets into Director evidence", () => {
  const manifest: AssetManifest = {
    ...emptyManifest,
    models:[{ path:"/models/watch.glb", bytes:4200000, sha256:"abc" }],
    textures:[{ path:"/textures/watch.webp", bytes:820000, sha256:"def" }],
  };
  const packet = inferPromptIntelligence({ prompt:"Premium watch product site.", projectName:"Watch", sceneCount:5, manifest });
  assert.equal(packet.brief.existingAssets.length,2);
  assert.ok(packet.brief.existingAssets.some((item) => item.type === "model"));
  assert.ok(packet.recommendedMedia.includes("real-3d"));
});

test("decision-time router returns focused patterns and technical doctrine", () => {
  const guidance = routeDecisionGuidance({ decision:"performance", projectType:"product", context:"Prewarm the 3D product signature reveal and avoid a first-scroll shader hitch." });
  assert.ok(guidance.patternIds.length > 0);
  assert.ok(guidance.directives.length > 0);
  assert.ok(guidance.doctrineIds.length > 0);
});

test("forced optimization refuses regressions and hard-gate failures", () => {
  const accepted = forcedOptimizationDecision({
    incumbentId:"A",
    candidateId:"B",
    judgments:[
      { judgeId:"visual-1", firstId:"A", secondId:"B", winnerId:"B", hardGateFailures:[], reasons:["Better hierarchy"], confidence:.9 },
      { judgeId:"visual-2", firstId:"B", secondId:"A", winnerId:"B", hardGateFailures:[], reasons:["Stronger composition"], confidence:.85 },
    ],
  });
  assert.equal(accepted.accepted,true);
  const rejected = forcedOptimizationDecision({
    incumbentId:"A",
    candidateId:"B",
    candidateHardGateFailures:["Mobile CTA missing"],
    judgments:[{ judgeId:"visual-1", firstId:"A", secondId:"B", winnerId:"B", hardGateFailures:[], reasons:["Looks better"], confidence:.9 }],
  });
  assert.equal(rejected.accepted,false);
  assert.equal(rejected.winner,"invalid");
});

test("autonomy contracts become stricter with higher autonomy levels", () => {
  assert.equal(autonomyContract(1).requires.visualComparison,false);
  assert.equal(autonomyContract(4).requires.visualComparison,true);
  assert.equal(autonomyContract(5).requires.finalCut,true);
  assert.ok(autonomyContract(5).hardGates.length > autonomyContract(1).hardGates.length);
});

test("autonomy prompt benchmark clears the release threshold", () => {
  const report = runAutonomyBenchmark();
  assert.ok(report.total >= 30);
  assert.ok(report.score >= 90, JSON.stringify(report.results.filter((item) => !item.passed), null, 2));
});


test("render review plan covers desktop and mobile scene states deterministically", () => {
  const experience = parseExperience(rawExperience);
  const plan = buildRenderReviewPlan(experience,6);
  assert.ok(plan.captures.length >= 12);
  assert.ok(plan.captures.some((item) => item.viewport === "desktop"));
  assert.ok(plan.captures.some((item) => item.viewport === "mobile"));
  assert.ok(plan.captures.some((item) => item.role === "handoff"));
  assert.ok(plan.dimensions.includes("composition"));
  assert.ok(plan.dimensions.includes("motion"));
  assert.equal(plan.dimensions.length,17);
  assert.ok(plan.dimensions.includes("art-direction"));
  assert.ok(plan.dimensions.includes("lighting"));
  assert.ok(plan.dimensions.includes("material"));
  assert.ok(plan.dimensions.includes("image-direction"));
  assert.ok(plan.dimensions.includes("sound"));
  assert.ok(plan.dimensions.includes("originality"));
  assert.ok(plan.dimensions.includes("craft"));
});

test("functional verification derives commercial and mobile gates from prompt intelligence", () => {
  const packet = inferPromptIntelligence({ prompt:"Luxury mechanical watch. Enter the movement through a cinematic 3D assembly.", projectName:"Watch", sceneCount:6, manifest:emptyManifest });
  const scenarios = buildFunctionalVerificationPlan(packet);
  assert.ok(scenarios.some((item) => item.id === "primary-action" && item.steps.some((step) => step.includes(packet.primaryAction.value))));
  assert.ok(scenarios.some((item) => item.id === "mobile-equivalence"));
  assert.ok(scenarios.every((item) => item.required));
});


test("David Weekley Verona client evidence stays structured and specific",()=>{
  const evidence=parseBrandEvidence(JSON.parse(fs.readFileSync("forge-intelligence/projects/david-weekley-verona.brand-evidence.json","utf8")));
  assert.equal(evidence.clientName,"David Weekley Homes — Verona, Central Pasco County");
  assert.ok(evidence.officialSources.length>=4);
  assert.ok(evidence.visualSignals.some((item)=>/masterplan|homesite|wayfinding/i.test(item)));
  assert.ok(evidence.antiSignals.some((item)=>/Atelier Maris/i.test(item)));
  assert.ok(evidence.commercialJobs.some((item)=>/before the neighborhood is fully built/i.test(item)));
});
