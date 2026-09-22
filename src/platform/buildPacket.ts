import type { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";
import { buildCreativeStateGraph, buildSignatureSliceGate } from "@/src/platform/agentic/creativeStateGraph";
import { assertProductionOriginalityGate } from "@/src/platform/director-intelligence/productionOriginalityGate";
import type { BrandEvidence } from "@/src/platform/autonomy/brandEvidence";

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
  brandEvidence?:BrandEvidence;
}

export function buildForgeBuildPacket(input:ForgeBuildPacketInput) {
  const {director,currentState,brandEvidence}=input;
  const report=director.report;
  assertProductionOriginalityGate(director.originalityGate);
  const treatment=report.treatment;
  const selected=treatment.territories.find((item)=>item.id===treatment.selectedTerritoryId) ?? treatment.territories[0];
  const creativeState=buildCreativeStateGraph(director);
  const signatureSlice=buildSignatureSliceGate(creativeState);
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
    "## VERIFIED CLIENT / BRAND EVIDENCE",
    brandEvidence ? json(brandEvidence) : "No structured brand evidence supplied. For named-client Signature/Flagship work, implementation must remain research-blocked until official first-party evidence is attached.",
    "",
    "## BRAND-SPECIFICITY CONTRACT",
    brandEvidence
      ? [
          "Every major visual decision must trace to the supplied first-party evidence, a real buyer/user job, or a project-specific constraint.",
          "Reusable Forge engineering may transfer. Prior-project visual grammar may not.",
          "The logo-swap test must fail: this experience should not plausibly belong to another client after changing the logo.",
          "Do not use generic premium/luxury shorthand when a more specific client truth exists.",
          "Preserve these anti-signals: "+brandEvidence.antiSignals.join(" | "),
          "Preserve these visual signals: "+brandEvidence.visualSignals.join(" | "),
          "Make these commercial jobs legible: "+brandEvidence.commercialJobs.join(" | "),
        ].join("\n")
      : "No verified brand-specificity contract is available.",
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
    "## PORTFOLIO DIVERGENCE EVIDENCE",
    json({
      originalityGate:director.originalityGate,
      collisions:report.collisions,
      creativeMemory:director.creativeMemory,
    }),
    "",
    "## CREATIVE STATE GRAPH",
    "This is the canonical creative truth. Director-locked fields may not be rewritten by implementation workers.",
    json(creativeState),
    "",
    "## SIGNATURE SLICE GATE",
    "Prove this slice before scaling production to the entire experience.",
    json(signatureSlice),
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
    "## AGENTIC EXECUTION MODEL",
    "- Creative State Graph is the shared source of truth; implementation workers do not renegotiate it.",
    "- Compile task-scoped Context Capsules for specialist work instead of repeatedly loading the entire project.",
    "- Route findings through the Capability Router before mutation; no agent gets permissions merely because it can reason about a problem.",
    "- Build and pass the Signature Slice Gate before expanding the full experience.",
    "- Rendered evidence and pairwise comparison decide promotion; new candidates never replace the incumbent by existence alone.",
    "",
    "## IMPLEMENTATION ORDER",
    "0. For named-client work, verify the supplied brand evidence is present and specific enough to support visual decisions. If it is absent, stop instead of generating a generic premium direction.",
    "1. Inspect the existing project and identify which Forge-native systems already own each requirement.",
    "2. Write the scene implementation map before changing production code: subject, copy, negative space, camera start/end/path, lighting, object state, typography behavior, interaction, transition, mobile equivalent, assets and preload requirements.",
    "3. Reuse the persistent Canvas, GSAP/ScrollTrigger, deterministic motion tracks, Forge camera choreography, interaction graph, media/mask and visual-physics systems before adding new architecture.",
    "4. Implement the smallest coherent vertical slice that proves the signature moment and continuity language.",
    "5. Capture that slice at desktop and mobile before expanding. Compare it against the packet's brand-specificity contract and prior-project collision evidence. If the result could be mistaken for an existing Forge project, rebuild the slice rather than polishing it.",
    "6. Extend the proven grammar across supporting scenes without giving every section equal spectacle.",
    "7. Implement mobile as a re-directed composition preserving the same idea, not a shrunken desktop.",
    "8. Run the repository verification gates and inspect rendered desktop/mobile evidence.",
    "9. Run the visual review/repair path on the actual rendered output. Correct brand-generic composition, typography, palette, interaction and narrative decisions before micro-polish.",
    "10. Correct framing, hierarchy, timing, first-use hitching, continuity and mobile failures before declaring completion.",
    "",
    "## NON-NEGOTIABLES",
    "- Do not invent client facts, metrics, materials, dimensions, awards, testimonials or asset availability.",
    "- Do not use an unrelated Forge project's typography stack, palette, composition system, narrative arc or signature interaction as a shortcut.",
    "- Do not treat words like premium, cinematic, luxury, editorial, minimal or immersive as art direction. Those are not client-specific decisions.",
    "- Do not expand full-site production from a visually generic signature slice.",
    "- Do not add a new animation clock.",
    "- Do not create a second competing WebGL architecture when the persistent Forge Canvas can own the effect.",
    "- Do not flatten the signature moment on mobile; reduce simultaneous complexity while preserving meaning.",
    "- Do not hide a missing asset behind decorative effects. Report the dependency.",
    "- Do not treat a passing build as proof of visual quality.",
    "- Do not change the controlling thesis because implementation is inconvenient; escalate a genuine missing primitive explicitly.",
    "",
    "## ACCEPTANCE CONTRACT",
    "- The rendered experience communicates the controlling thesis without requiring the strategy document.",
    "- At least five visible design decisions can be traced directly to verified client evidence or a specific buyer/user job.",
    "- The logo-swap test fails: replacing the client identity with an unrelated competitor would make the art direction feel wrong.",
    "- The signature slice is materially distinct from prior Forge portfolio fingerprints in typography, composition, palette, narrative and signature mechanism.",
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
