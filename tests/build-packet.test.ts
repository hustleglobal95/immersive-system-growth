import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator";
import { buildForgeBuildPacket } from "../src/platform/buildPacket";
import { parseDirectorBrief } from "../src/platform/directorSchema";
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
    "## CREATIVE DNA",
    "## ART DIRECTION",
    "## SCENE-BY-SCENE CONSTRUCTION PLAN",
    "## CURRENT VALIDATED PROJECT STATE",
    "## REPOSITORY OPERATING CONTRACT",
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
