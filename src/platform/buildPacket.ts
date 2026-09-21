import type { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";

type DirectorRun=ReturnType<typeof runDirectorIntelligence>;

export interface ForgeBuildPacketInput {
  director:DirectorRun;
  currentState:{
    experience:unknown;
    assetManifest:unknown;
    interactionGraph:unknown;
    cinematicSystems?:unknown;
  };
  repoContract:string;
}

export function buildForgeBuildPacket(input:ForgeBuildPacketInput) {
  const {director,currentState}=input;
  const report=director.report;
  const treatment=report.treatment;
  const selected=treatment.territories.find((item)=>item.id===treatment.selectedTerritoryId) ?? treatment.territories[0];
  const sections=[
    "# FORGE BUILD PACKET — CLAUDE EXECUTION CONTRACT",
    "",
    "## ROLE",
    "You are the implementation engineer for an already-directed Forge experience. Do not replace the approved creative thesis with a different concept. Translate the packet into production code using the repository's existing systems first.",
    "",
    "## TRUTH STATUS",
    `Planning disposition: ${report.planningDisposition}`,
    `Rendered creative judgment: ${report.judgment.verdict}`,
    report.judgment.status==="verified"
      ? "Rendered judgment is verified. Preserve its evidence scope and repair findings."
      : "Rendered creative judgment is not yet verified. Treat this packet as an implementation plan, not proof that the final render is creatively approved.",
    "",
    "## PROJECT BRIEF",
    json(report.brief),
    "",
    "## CONTROLLING THESIS",
    selected?.thesis ?? treatment.thesis,
    "",
    "## MEMORY TEST",
    treatment.memoryStatement,
    "",
    "## PRIMARY SIGNATURE MOMENT",
    json(treatment.signatureMoment),
    "",
    "## EMOTIONAL / INTENSITY ARC",
    json(treatment.emotionalArc),
    "",
    "## SELECTED VISUAL LANGUAGE",
    json(director.visualLanguages.find((item)=>item.territoryId===treatment.selectedTerritoryId) ?? director.visualLanguages[0]),
    "",
    "## CREATIVE DNA",
    json(director.creativeDNA),
    "",
    "## ART DIRECTION",
    json(director.artDirection),
    "",
    "## DISCIPLINE DIRECTION",
    json(director.disciplineDirections),
    "",
    "## HIERARCHY CONTRACT",
    json(report.hierarchy),
    "",
    "## ASSET REALITY",
    json(report.assetGap),
    "",
    "## CONSTRUCTION RESEARCH",
    json({
      references:director.construction.referenceIds,
      lessons:director.construction.referenceLessons,
      compositionRules:director.construction.compositionRules,
      motionRules:director.construction.motionRules,
      transitionRules:director.construction.transitionRules,
      interactionRules:director.construction.interactionRules,
      implementationRules:director.construction.implementationRules,
      mobileRules:director.construction.mobileRules,
      forbiddenPatterns:director.construction.forbiddenPatterns,
      technicalVerification:director.construction.technicalVerification,
      failureAvoidance:director.construction.failureAvoidance,
    }),
    "",
    "## SCENE-BY-SCENE CONSTRUCTION PLAN",
    json(director.constructionPlan),
    "",
    "## CURRENT VALIDATED PROJECT STATE",
    "This is the incumbent. Preserve client facts and working behavior unless this packet explicitly directs a bounded change.",
    json(currentState),
    "",
    "## BLOCKERS / UNKNOWNS",
    json({
      directorBlockers:report.blockers,
      evidenceUnknowns:report.evidence.unknowns,
      assetBlockers:report.assetGap.blockers,
      humanGates:director.humanGates.pending,
    }),
    "",
    "## REPOSITORY OPERATING CONTRACT",
    trimContract(input.repoContract),
    "",
    "## IMPLEMENTATION ORDER",
    "1. Inspect the existing project and identify which Forge-native systems already own each requirement.",
    "2. Write the scene implementation map before changing production code: subject, copy, negative space, camera start/end/path, lighting, object state, typography behavior, interaction, transition, mobile equivalent, assets and preload requirements.",
    "3. Reuse the persistent Canvas, GSAP/ScrollTrigger, deterministic motion tracks, Forge camera choreography, interaction graph, media/mask and visual-physics systems before adding new architecture.",
    "4. Implement the smallest coherent vertical slice that proves the signature moment and continuity language.",
    "5. Extend the same grammar across supporting scenes without giving every section equal spectacle.",
    "6. Implement mobile as a re-directed composition preserving the same idea, not a shrunken desktop.",
    "7. Run the repository verification gates and inspect rendered desktop/mobile evidence.",
    "8. Correct framing, hierarchy, timing, first-use hitching, continuity and mobile failures before declaring completion.",
    "",
    "## NON-NEGOTIABLES",
    "- Do not invent client facts, metrics, materials, dimensions, awards, testimonials or asset availability.",
    "- Do not add a new animation clock.",
    "- Do not create a second competing WebGL architecture when the persistent Forge Canvas can own the effect.",
    "- Do not flatten the signature moment on mobile; reduce simultaneous complexity while preserving meaning.",
    "- Do not hide a missing asset behind decorative effects. Report the dependency.",
    "- Do not treat a passing build as proof of visual quality.",
    "- Do not change the controlling thesis because implementation is inconvenient; escalate a genuine missing primitive explicitly.",
    "",
    "## ACCEPTANCE CONTRACT",
    "- The rendered experience communicates the controlling thesis without requiring the strategy document.",
    "- The named signature moment is clearly the strongest visual/interactive beat.",
    "- Supporting chapters contain enough stillness and restraint for the peak to matter.",
    "- Copy and focal subject do not compete for the same spatial priority.",
    "- Forward and reverse scroll reconstruct deterministic states.",
    "- Mobile preserves narrative order, focal hierarchy and the signature idea.",
    "- Primary conversion controls remain semantic and usable.",
    "- First encounter is smooth; preloading/prewarming covers the signature path.",
    "- Functional, motion, mobile, performance, accessibility and asset gates pass where applicable.",
    "- Any external or subjective creative approval remains explicitly unverified until rendered evidence is reviewed.",
    "",
    "## DEFINITION OF DONE",
    "Do not stop because the code compiles. Stop when the implementation matches this packet, the repository gates pass, desktop/mobile renders have been inspected, and remaining deviations are either fixed or explicitly documented as asset/external-review blockers.",
  ];
  return sections.join("\n");
}

function json(value:unknown) {
  return JSON.stringify(value,null,2);
}

function trimContract(value:string) {
  const normalized=value.trim();
  if(normalized.length<=12000) return normalized;
  return normalized.slice(0,12000)+"\n[Repository contract truncated to 12,000 characters for packet size.]";
}
