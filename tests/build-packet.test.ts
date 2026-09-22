import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { buildForgeBuildPacket } from "../src/platform/buildPacket";
import { parseDirectorBrief } from "../src/platform/directorSchema";
import { directProject } from "../src/platform/directorEngine";
import { fingerprintTreatment } from "../src/platform/director-intelligence/portfolioMemory";
import { applyBrandEvidenceToBrief, parseBrandEvidence } from "../src/platform/autonomy/brandEvidence";
import rawExperience from "../config/experience.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";
import rawCinematic from "../config/cinematic-systems.json";
import rawBrief from "../config/director-brief.example.json";

test("Forge Build Packet consolidates direction, construction and acceptance into one Claude contract",()=>{
  const director=runDirectorIntelligence({brief:parseDirectorBrief(rawBrief)});
  const packet=buildForgeBuildPacket({
    director,
    currentState:{experience:rawExperience,assetManifest:rawManifest,interactionGraph:rawGraph,cinematicSystems:rawCinematic},
    repoContract:fs.readFileSync("CLAUDE.md","utf8"),
  });
  for(const heading of [
    "# FORGE BUILD PACKET",
    "## PROJECT BRIEF",
    "## CONTROLLING THESIS",
    "## PRIMARY SIGNATURE MOMENT",
    "## CREATIVE STATE GRAPH",
    "## SIGNATURE SLICE GATE",
    "## CREATIVE DNA",
    "## ART DIRECTION",
    "## SCENE-BY-SCENE CONSTRUCTION PLAN",
    "## CURRENT VALIDATED PROJECT STATE",
    "## REPOSITORY OPERATING CONTRACT",
    "## AGENTIC EXECUTION MODEL",
    "## IMPLEMENTATION ORDER",
    "## ACCEPTANCE CONTRACT",
    "## DEFINITION OF DONE",
  ]) assert.ok(packet.includes(heading),heading+" missing");
  assert.match(packet,/Do not treat a passing build as proof of visual quality/);
  assert.match(packet,/Rendered creative judgment/);
  assert.ok(packet.length>12000);
});

test("Forge Build Packet preserves unverified judgment semantics instead of pretending creative approval",()=>{
  const director=runDirectorIntelligence({brief:parseDirectorBrief(rawBrief)});
  const packet=buildForgeBuildPacket({
    director,
    currentState:{experience:rawExperience,assetManifest:rawManifest,interactionGraph:rawGraph},
    repoContract:"Test contract",
  });
  assert.match(packet,/not yet verified/i);
  assert.match(packet,/implementation plan, not proof/i);
});


test("Forge Build Packet hard-stops Signature work that collides with prior Forge creative language",()=>{
  const brief=parseDirectorBrief({...rawBrief,tier:"signature"});
  const previous=fingerprintTreatment(directProject(brief),"atelier-maris-prior");
  const director=runDirectorIntelligence({brief,portfolio:[previous]});
  assert.equal(director.originalityGate.required,true);
  assert.equal(director.originalityGate.passed,false);
  assert.ok(director.report.blockers.some((item)=>/anti-repeat gate blocked/i.test(item)));
  assert.throws(()=>buildForgeBuildPacket({
    director,
    currentState:{experience:rawExperience,assetManifest:rawManifest,interactionGraph:rawGraph,cinematicSystems:rawCinematic},
    repoContract:"Test contract",
  }),/portfolio collision|anti-repeat/i);
});


test("Forge Build Packet carries verified client evidence and anti-template acceptance rules",()=>{
  const evidence=parseBrandEvidence({
    version:1,
    clientName:"David Weekley Homes",
    officialSources:[{
      label:"Official brand promise",
      url:"https://www.davidweekleyhomes.com/",
      observations:["The company presents homebuilding as a guided process with customer choice and community discovery."],
    }],
    verifiedBrandTruth:"Help future homeowners understand the community, compare homes and trust the path to ownership before inquiry.",
    verifiedAudience:"Future homeowners evaluating community fit, home design options and builder trust.",
    verifiedPrimaryAction:"Explore the community",
    differentiators:["Community choice is central","Home design and personalization are part of the sales experience"],
    commercialJobs:["Make a future community understandable before it is fully built","Help buyers compare paths into a home"],
    visualSignals:["Bright residential daylight and navigable community information","Useful home and neighborhood information as visual material"],
    antiSignals:["Generic dark luxury editorial treatment","Atelier-style oversized serif over cinematic architecture"],
    contentSignals:["Homesites","Home designs","Community location","Builder process"],
    unknowns:["Final Verona amenity package is not verified."],
  });
  const brief=applyBrandEvidenceToBrief(parseDirectorBrief({...rawBrief,tier:"cinematic"}),evidence);
  const director=runDirectorIntelligence({brief});
  const packet=buildForgeBuildPacket({
    director,
    currentState:{experience:rawExperience,assetManifest:rawManifest,interactionGraph:rawGraph,cinematicSystems:rawCinematic},
    repoContract:"Test contract",
    brandEvidence:evidence,
  });
  assert.match(packet,/VERIFIED CLIENT \/ BRAND EVIDENCE/);
  assert.match(packet,/BRAND-SPECIFICITY CONTRACT/);
  assert.match(packet,/logo-swap test/i);
  assert.match(packet,/five visible design decisions/i);
  assert.match(packet,/Atelier-style oversized serif/);
  assert.match(packet,/Explore the community/);
});
