import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { fingerprintTreatment, compareFingerprints } from "../src/platform/director-intelligence/portfolioMemory";
import { createTasteProfile, recordPreference } from "../src/platform/director-intelligence/taste";
import { scanCategoryCliches } from "../src/platform/director-intelligence/cliches";
import { runStressLab } from "../src/platform/director-intelligence/stressTests";
import { createDecisionLedger, proposeDecision, lockDecision } from "../src/platform/director-intelligence/decisionLedger";
import { recordClientFeedback } from "../src/platform/director-intelligence/clientReview";
import { reviewProduction } from "../src/platform/director-intelligence/continuousCritic";
import { synthesizePostmortem } from "../src/platform/director-intelligence/learning";
import { buildResearchBrief, auditResearchFindings } from "../src/platform/director-intelligence/research";
import { resolveCreativeTaste } from "../src/platform/director-intelligence/creativeTaste";
import { reviewCreativeMemory } from "../src/platform/director-intelligence/creativeMemory";
import { createEmptyMemoryGraph, ingestCreativeIntelligenceMemory, ingestProjectMemory } from "../src/platform/director-intelligence/memory";
import { deconstructReference } from "../src/platform/director-intelligence/precedents";

const brief = {
  projectName: "Aurelia Tower",
  projectType: "property" as const,
  tier: "signature" as const,
  client: "Aurelia Development",
  audience: "Affluent buyers comparing waterfront residences who value privacy, view, material quality and a credible sense of place.",
  objective: "Create preference for the tower and convert qualified visitors into private sales inquiries.",
  primaryAction: "Request private presentation",
  brandTruth: "The tower's value is the progressive separation from city noise into private waterfront elevation.",
  differentiators: ["Uninterrupted waterfront view corridors", "Private arrival sequence separates public city from residential life"],
  constraints: ["Avoid generic gold luxury treatment", "Do not use gratuitous building orbiting", "Mobile must preserve the ascent idea"],
  existingAssets: [{ id: "tower", label: "Hero tower model", type: "model" as const, notes: "Hero-quality GLB with facade and residence levels." }, { id: "mark", label: "Aurelia horizon mark", type: "brand" as const, notes: "Recognizable horizontal brand symbol used across sales materials." }],
  references: [{ label: "Architectural film", lesson: "Stable horizon and patient threshold movement; do not copy grading or composition." }],
};

test("advanced Director runs full intelligence pipeline", () => {
  const result = runDirectorIntelligence({ brief });
  assert.equal(result.report.evaluations.length, 3);
  assert.equal(result.report.selectedEvaluation.critiques.length, 12);
  assert.equal(result.debate.pairwise.length, 3);
  assert.ok(result.report.stress.results.length >= 12);
  assert.ok(result.report.precedents.some((item) => !item.precedent.industries.includes("property")));
  assert.ok(result.report.whyLadders.every((ladder) => ladder.valid));
  assert.ok(result.productionPlan.creativePlan.scenes.length >= 5);
  assert.ok(result.construction.patternIds.includes("continuous-visual-anchor"));
  assert.ok(result.construction.implementationRules.length > 0);
  assert.equal(result.constructionPlan.sceneDecisions.length, result.report.treatment.emotionalArc.length);
  assert.ok(result.constructionPlan.sceneDecisions.every((scene) => scene.continuityAnchor.length > 0));
  assert.ok(result.constructionPlan.criticalBootStrategy.length > 0);
  assert.ok(["LOCK", "REVISE", "RESEARCH REQUIRED", "ASSET BLOCKED", "REJECT"].includes(result.report.verdict));
});

test("Creative Intelligence 2 produces a complete project-specific creative system", () => {
  const result = runDirectorIntelligence({ brief });
  assert.equal(result.creativeDNA.version,1);
  assert.equal(result.creativeDNA.projectName,brief.projectName);
  assert.ok(result.creativeDNA.northStar.length > 20);
  assert.ok(result.creativeDNA.signatureMechanism.length > 20);
  assert.equal(result.visualLanguages.length,3);
  assert.equal(new Set(result.visualLanguages.map((item)=>item.modeId)).size,3);
  assert.equal(result.visualLanguageDivergence.matrix.length,3);
  assert.ok(result.visualLanguageDivergence.minimumDistance > 0);
  assert.equal(result.artDirection.sceneFrames.length,result.report.treatment.emotionalArc.length);
  assert.equal(Object.keys(result.disciplineDirections).length,8);
  assert.ok(result.creativeMutations.length >= 5);
  assert.ok(result.creativeMutations.every((item)=>item.preserves.length >= 3));
  assert.equal(Object.keys(result.creativeCeiling.dimensions).length,13);
  assert.ok(result.creativeCeiling.current >= 0 && result.creativeCeiling.current <= 10);
  assert.ok(result.creativeCeiling.projected >= result.creativeCeiling.current);
  assert.ok(result.productionPlan.creativeIntelligence.dna.northStar.length > 0);
});

test("visual-language divergence is enforced more aggressively at signature tiers", () => {
  const signature = runDirectorIntelligence({ brief });
  const cinematic = runDirectorIntelligence({ brief:{...brief,tier:"cinematic"} });
  assert.ok(signature.visualLanguageDivergence.threshold > cinematic.visualLanguageDivergence.threshold);
  assert.equal(signature.visualLanguageDivergence.matrix.length,3);
});

test("Creative Mutation challenges the mechanism without discarding brand truth", () => {
  const result = runDirectorIntelligence({ brief });
  const top=result.creativeMutations[0];
  assert.ok(top.question.endsWith("?"));
  assert.ok(top.preserves.some((item)=>item.includes(brief.differentiators[0])));
  assert.ok(top.systems.length >= 2);
  assert.ok(top.originalityPotential >= 7);
});

test("layered taste keeps studio preference dominant without becoming a hard brand rule", () => {
  const studio=recordPreference(createTasteProfile(),{id:"studio-1",winnerId:"a",loserId:"b",reasons:["Prefer restraint"],dimensions:{restraintVsSpectacle:-1},createdAt:"2026-01-01T00:00:00.000Z"});
  const operator=recordPreference(createTasteProfile(),{id:"operator-1",winnerId:"b",loserId:"a",reasons:["Prefer spectacle"],dimensions:{restraintVsSpectacle:1},createdAt:"2026-01-02T00:00:00.000Z"});
  const resolved=resolveCreativeTaste({studio,operator});
  assert.ok(resolved.profile.dimensions.restraintVsSpectacle < 0);
  assert.equal(resolved.contributions[0]?.layer,"studio");
  assert.match(resolved.rule,/None may override factual brief or brand constraints/);
});

test("Creative Memory flags repeated house-style signals without turning them into fake laws", () => {
  const result=runDirectorIntelligence({brief});
  const memory={
    version:1 as const,
    nodes:[
      {id:"old-signature",type:"SignatureMoment" as const,label:"Repeated signature",text:result.creativeDNA.signatureMechanism,tags:["signature","property"],projectId:"old-project",confidence:.9},
      {id:"lesson",type:"Lesson" as const,label:"Quiet transitions",text:"Quiet transitions protected architectural authority.",tags:["architecture","restraint"],projectId:"old-project",confidence:.6},
    ],
    edges:[],
  };
  const review=reviewCreativeMemory(result.creativeDNA,memory);
  assert.ok(review.repeatedSignals.some((item)=>item.nodeId==="old-signature"));
  assert.ok(["watch","rewrite"].includes(review.verdict));
});


test("approved Creative Intelligence becomes reusable memory without storing unselected mutations",()=>{
  const result=runDirectorIntelligence({brief});
  const projectId="aurelia-tower";
  let graph=ingestProjectMemory(createEmptyMemoryGraph(),projectId,brief,result.report.treatment);
  const language=result.visualLanguages.find((item)=>item.territoryId===result.report.treatment.selectedTerritoryId)!;
  graph=ingestCreativeIntelligenceMemory(graph,projectId,brief,{
    dna:result.creativeDNA,
    artDirection:result.artDirection,
    visualLanguage:language,
    disciplineDirections:result.disciplineDirections,
  });
  assert.ok(graph.nodes.some((node)=>node.type==="ArtDirection"));
  assert.ok(graph.nodes.some((node)=>node.type==="VisualLanguage"));
  assert.ok(graph.nodes.some((node)=>node.type==="LightingGrammar"));
  assert.ok(graph.nodes.some((node)=>node.type==="MaterialGrammar"));
  assert.ok(!graph.nodes.some((node)=>node.type==="CreativeMutation"));

  graph=ingestCreativeIntelligenceMemory(graph,projectId,brief,{
    dna:result.creativeDNA,
    artDirection:result.artDirection,
    visualLanguage:language,
    disciplineDirections:result.disciplineDirections,
    selectedMutation:result.creativeMutations[0],
  });
  assert.ok(graph.nodes.some((node)=>node.type==="CreativeMutation" && node.id.includes(result.creativeMutations[0].id)));
});

test("reference deconstruction transfers principles without inventing unseen disciplines",()=>{
  const deconstruction=deconstructReference("Film study","Stable horizon and slow camera movement. Use a threshold transition into warmer light.");
  assert.equal(deconstruction.version,2);
  assert.match(deconstruction.lenses.camera,/Stable horizon|slow camera/i);
  assert.match(deconstruction.lenses.transitions,/threshold/i);
  assert.match(deconstruction.lenses.typography,/Not evidenced/);
  assert.match(deconstruction.transferRule,/Never transfer the reference's exact composition/);
  assert.ok(deconstruction.doNotCopy.includes("typeface"));
});

test("portfolio collision catches identical prior work", () => {
  const treatment = directProject(brief);
  const fingerprint = fingerprintTreatment(treatment, "current");
  const collision = compareFingerprints(fingerprint, { ...fingerprint, projectId: "previous" });
  assert.equal(collision.verdict, "reject");
  assert.equal(collision.dimensions.overall, 100);
});

test("category cliché scan surfaces property defaults", () => {
  const treatment = directProject(brief);
  const territory = { ...treatment.territories[0], visualPremise: treatment.territories[0].visualPremise + " generic gold luxury treatment and gratuitous building orbit" };
  const scan = scanCategoryCliches(brief, treatment, territory);
  assert.ok(scan.detected.length >= 1);
});

test("stress lab includes brand-swap and mobile gates", () => {
  const treatment = directProject(brief);
  const report = runStressLab(brief, treatment, treatment.territories[0]);
  assert.ok(report.results.some((item) => item.id === "brand-swap"));
  assert.ok(report.results.some((item) => item.id === "mobile"));
});

test("taste profile learns pairwise preference without absolute scores", () => {
  const profile = recordPreference(createTasteProfile(), { id: "pref-1", winnerId: "a", loserId: "b", reasons: ["A is more restrained and concept-specific."], dimensions: { restraintVsSpectacle: -0.8, familiarVsNovel: 0.5 }, createdAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(profile.preferences.length, 1);
  assert.ok(profile.dimensions.restraintVsSpectacle < 0);
});

test("creative decisions can be proposed and explicitly locked", () => {
  let ledger = createDecisionLedger();
  ledger = proposeDecision(ledger, { decision: "Keep horizon fixed through ascent", whyLadder: ["creative", "brand", "audience", "emotion", "medium", "production"], evidenceIds: ["brief-brand-truth"], affectedSystems: ["camera"], rejectedAlternatives: [{ decision: "Free orbit", reason: "Turns architecture into a product turntable." }], author: "director" });
  ledger = lockDecision(ledger, "decision-001", "human-creative-director");
  assert.equal(ledger.decisions[0].status, "locked");
});

test("client feedback distinguishes facts from preference", () => {
  assert.equal(recordClientFeedback("The floor count is incorrect").classification, "factual-correction");
  assert.equal(recordClientFeedback("I prefer the logo bigger").classification, "preference");
});

test("continuous critic becomes stricter late in production", () => {
  const treatment = directProject(brief);
  const review = reviewProduction(treatment, 90, createDecisionLedger(), { implementedSystems: ["camera", "motion"], signatureStrength: 7.5 });
  assert.ok(review.blockers.length >= 1);
});

test("postmortem stores low-confidence observations rather than fake laws", () => {
  const observations = synthesizePostmortem({ projectId: "aurelia", selectedTerritoryId: "rise", revisions: 1, outcomes: ["Client praised the quiet transition into the residence."] });
  assert.ok(observations.length >= 1);
  assert.ok(observations.every((item) => item.confidence === "low"));
});

test("research helper requires provenance", () => {
  const research = buildResearchBrief("Aurelia", "property", brief.objective);
  assert.ok(research.queries.length >= 3);
  assert.ok(auditResearchFindings([{ id: "x", topic: "precedent", claim: "Useful claim", source: "not-a-url", sourceAuthority: "secondary", retrievedAt: "2026-01-01" }]).length >= 1);
});
