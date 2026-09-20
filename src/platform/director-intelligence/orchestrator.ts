import { parseDirectorBrief, parseDirectorTreatment, type DirectorTreatment } from "@/src/platform/directorSchema";
import { directProject } from "@/src/platform/directorEngine";
import { createProductionPlanFromTreatment } from "@/src/platform/directorProductionPlan";
import type { DirectorIntelligenceInput, DirectorIntelligenceReport, EvaluationReport } from "@/src/platform/director-intelligence/types";
import type { DirectorHumanApprovals } from "@/src/platform/director-intelligence/humanGates";
import { buildEvidenceReport, requireEvidenceForPlanningAdvance } from "@/src/platform/director-intelligence/evidence";
import { retrievePrecedents, deconstructReference } from "@/src/platform/director-intelligence/precedents";
import { divergeTreatment } from "@/src/platform/director-intelligence/divergence";
import { fingerprintTreatment, scanPortfolio } from "@/src/platform/director-intelligence/portfolioMemory";
import { scanCategoryCliches } from "@/src/platform/director-intelligence/cliches";
import { runStressLab } from "@/src/platform/director-intelligence/stressTests";
import { createEvaluationScores, rankEvaluations, summarizeEvaluation } from "@/src/platform/director-intelligence/evaluation";
import { runDirectorCouncil } from "@/src/platform/director-intelligence/council";
import { buildOriginalityFingerprint, originalityBlockers } from "@/src/platform/director-intelligence/originality";
import { runCreativeDebate } from "@/src/platform/director-intelligence/debate";
import { analyzeAssetGap } from "@/src/platform/director-intelligence/assetGap";
import { estimateCreativeCeiling } from "@/src/platform/director-intelligence/ceiling";
import { rankProductionLeverage } from "@/src/platform/director-intelligence/productionLeverage";
import { buildWhyLadder, validateWhyLadders } from "@/src/platform/director-intelligence/whyLadder";
import { createDecisionLedger, decisionFromWhyLadder, proposeDecision } from "@/src/platform/director-intelligence/decisionLedger";
import { buildDefensePacket } from "@/src/platform/director-intelligence/clientReview";
import { simulateAudienceLenses } from "@/src/platform/director-intelligence/audience";
import { brandAssetBlockers, identifyDistinctiveBrandAssets } from "@/src/platform/director-intelligence/brandAssets";
import { detectCouncilInflation } from "@/src/platform/director-intelligence/calibration";
import { evaluateHumanGates } from "@/src/platform/director-intelligence/humanGates";
import { applyTasteCalibration, inferTasteTraits, tasteAdjustment } from "@/src/platform/director-intelligence/taste";
import { buildHierarchyReport, hierarchyApprovalBlockers } from "@/src/platform/director-intelligence/hierarchy";
import { buildConstructionDirectives } from "@/src/platform/director-intelligence/constructionKnowledge";
import { planImmersiveConstruction } from "@/src/platform/director-intelligence/constructionPlanner";
import { buildCreativeDNA } from "@/src/platform/director-intelligence/creativeDNA";
import { directArt } from "@/src/platform/director-intelligence/artDirector";
import { evaluateVisualLanguageDivergence, generateVisualLanguages } from "@/src/platform/director-intelligence/visualLanguage";
import { generateCreativeMutations } from "@/src/platform/director-intelligence/creativeMutation";
import { directDisciplines } from "@/src/platform/director-intelligence/disciplineDirectors";
import { estimateCreativeCeilingV2 } from "@/src/platform/director-intelligence/creativeCeilingV2";
import { reviewCreativeMemory } from "@/src/platform/director-intelligence/creativeMemory";
import { resolveCreativeTaste, type CreativeTasteLayers } from "@/src/platform/director-intelligence/creativeTaste";
import { judgmentPermitsProduction, parseDirectorJudgment, unverifiedDirectorJudgment } from "@/src/platform/director-intelligence/judgment";

export function runDirectorIntelligence(input: DirectorIntelligenceInput & { approvals?: DirectorHumanApprovals; finalCutRequested?: boolean; tasteLayers?: CreativeTasteLayers }) {
  const brief = parseDirectorBrief(input.brief);
  const baseline = directProject(brief);
  const diverged = divergeTreatment(brief, baseline);
  let treatment = diverged.treatment;
  const evidence = buildEvidenceReport(brief, treatment);
  const evidenceBlockers = requireEvidenceForPlanningAdvance(evidence);

  const precedentPool = input.precedents ?? undefined;
  const modes = ["problem", "medium-transfer", "constraint"] as const;
  const precedents = modes.flatMap((mode) => retrievePrecedents(brief, precedentPool, mode, 4)).filter((item, index, items) => items.findIndex((candidate) => candidate.precedent.id === item.precedent.id) === index).sort((a, b) => b.score - a.score).slice(0, 8);
  const referenceDeconstructions = brief.references.map((reference) => deconstructReference(reference.label, reference.lesson));

  const fingerprint = fingerprintTreatment(treatment);
  const collisions = scanPortfolio(fingerprint, input.portfolio ?? []);
  const brandAssets = identifyDistinctiveBrandAssets(brief, treatment);
  const brandBlockers = brandAssetBlockers(brandAssets);
  const evaluations: EvaluationReport[] = [];
  const fingerprintsByTerritory = new Map<string, ReturnType<typeof buildOriginalityFingerprint>>();
  const stressByTerritory = new Map<string, ReturnType<typeof runStressLab>>();
  const clicheByTerritory = new Map<string, ReturnType<typeof scanCategoryCliches>>();
  const tasteByTerritory = new Map<string, ReturnType<typeof tasteAdjustment>>();
  const resolvedTaste = resolveCreativeTaste(input.tasteLayers,input.taste);

  for (const territory of treatment.territories) {
    const cliches = scanCategoryCliches(brief, treatment, territory);
    const stress = runStressLab(brief, treatment, territory);
    const taste = tasteAdjustment(resolvedTaste.profile, inferTasteTraits(treatment, territory));
    const scores = applyTasteCalibration(createEvaluationScores(brief, treatment, territory, collisions, stress), taste.adjustment);
    const council = runDirectorCouncil(brief, treatment, territory, scores, { cliches, collisions, stress });
    const originality = buildOriginalityFingerprint(brief, treatment, territory, collisions, cliches);
    const blockers = [...evidenceBlockers, ...brandBlockers, ...stress.blockers, ...originalityBlockers(originality)];
    evaluations.push(summarizeEvaluation(territory.id, scores, brief.tier, council, blockers));
    fingerprintsByTerritory.set(territory.id, originality);
    stressByTerritory.set(territory.id, stress);
    clicheByTerritory.set(territory.id, cliches);
    tasteByTerritory.set(territory.id, taste);
  }

  const debate = runCreativeDebate(treatment.territories, evaluations);
  const ranked = rankEvaluations(evaluations);
  const winner = (debate.winnerId ? ranked.find((report) => report.territoryId === debate.winnerId) : undefined) ?? ranked[0];
  const selectedTerritory = treatment.territories.find((territory) => territory.id === winner?.territoryId) ?? treatment.territories[0];
  treatment = selectTerritory(treatment, selectedTerritory.id);

  const selectedEvaluation = evaluations.find((item) => item.territoryId === selectedTerritory.id) ?? ranked[0];
  const originality = fingerprintsByTerritory.get(selectedTerritory.id)!;
  const stress = stressByTerritory.get(selectedTerritory.id)!;
  const cliches = clicheByTerritory.get(selectedTerritory.id)!;
  const selectedTaste = tasteByTerritory.get(selectedTerritory.id)!;
  const construction = buildConstructionDirectives(treatment);
  const constructionPlan = planImmersiveConstruction(treatment, construction);
  const assetGap = analyzeAssetGap(brief, treatment);
  const ceiling = estimateCreativeCeiling(brief, treatment, selectedEvaluation, assetGap, stress);
  const leverage = rankProductionLeverage(treatment, selectedEvaluation, assetGap);
  const whyLadders = [
    buildWhyLadder(brief, selectedTerritory, `Lock thesis: ${selectedTerritory.thesis}`),
    buildWhyLadder(brief, selectedTerritory, `Protect signature moment: ${treatment.signatureMoment.name}`, "Concentrate custom production on the protected signature moment before secondary flourish."),
    buildWhyLadder(brief, selectedTerritory, `Use the selected camera/motion grammar`, "Prefer existing Forge-native camera and motion systems where they express the direction faithfully."),
  ];
  const whyBlockers = validateWhyLadders(whyLadders);
  let decisions = input.decisions ?? createDecisionLedger();
  for (const ladder of whyLadders) decisions = proposeDecision(decisions, decisionFromWhyLadder(ladder, evidence.evidence.slice(0, 4).map((item) => item.id), ["structure", "camera", "motion", "interaction"], "forge-director"));
  const defense = buildDefensePacket(brief, selectedTerritory);
  const audience = simulateAudienceLenses(brief, treatment, selectedTerritory);
  const inflation = detectCouncilInflation(selectedEvaluation.critiques);
  const hierarchy = buildHierarchyReport(brief, treatment);
  const hierarchyBlockers = hierarchyApprovalBlockers(hierarchy);
  const visualLanguages = generateVisualLanguages(brief,treatment);
  const visualLanguageDivergence = evaluateVisualLanguageDivergence(brief,visualLanguages);
  const selectedVisualLanguage=visualLanguages.find((item)=>item.territoryId===treatment.selectedTerritoryId) ?? visualLanguages[0];
  const creativeDNA = buildCreativeDNA({brief,treatment,precedents,visualLanguage:selectedVisualLanguage});
  const artDirection = directArt({brief,treatment,dna:creativeDNA});
  const disciplineDirections = directDisciplines({brief,treatment,dna:creativeDNA,art:artDirection});
  const creativeMutations = generateCreativeMutations(brief,treatment,creativeDNA);
  const creativeMemory = reviewCreativeMemory(creativeDNA,input.memory);
  const creativeCeiling = estimateCreativeCeilingV2({
    brief,treatment,selected:selectedEvaluation,assetGap,dna:creativeDNA,art:artDirection,divergence:visualLanguageDivergence,
  });

  const blockers = [...selectedEvaluation.blockers, ...whyBlockers, ...hierarchyBlockers];
  if (inflation.warning) blockers.push(inflation.warning);
  if (!diverged.diversity.sufficient) blockers.push(`Territory diversity score ${diverged.diversity.score} is below the required divergence threshold.`);
  if (brief.tier === "signature" || brief.tier === "flagship") {
    if (!precedents.some((item) => !item.precedent.industries.includes(brief.projectType))) blockers.push("Signature/Flagship direction lacks a cross-domain precedent transfer.");
    if (!visualLanguageDivergence.sufficient) blockers.push(...visualLanguageDivergence.blockers);
    if (creativeMemory.verdict==="rewrite") blockers.push("Creative Memory detects material house-style repetition; rewrite the strongest repeated creative devices before lock.");
  }

  let planningDisposition: DirectorIntelligenceReport["planningDisposition"] = debate.disposition === "REJECT ALL" ? "REJECT" : debate.disposition;
  if (blockers.length && planningDisposition === "ADVANCE") {
    planningDisposition = evidenceBlockers.length ? "RESEARCH REQUIRED" : assetGap.blockers.length ? "ASSET BLOCKED" : "REVISE";
  }
  const judgment = input.judgment ? parseDirectorJudgment(input.judgment) : unverifiedDirectorJudgment();
  const verdict = judgment.verdict;
  const judgmentBlockers = judgment.status === "verified"
    ? judgment.blockers
    : ["Creative judgment is UNVERIFIED until rendered evidence is reviewed by a calibrated judge or human reviewer."];

  const report: DirectorIntelligenceReport = {
    brief,treatment,evidence,precedents,fingerprint:fingerprintTreatment(treatment),collisions,evaluations,selectedEvaluation,
    originality,cliches,stress,ceiling,assetGap,leverage,hierarchy,whyLadders,decisions,defense,
    planningDisposition,judgment,verdict,blockers:unique([...blockers,...judgmentBlockers]),generatedAt:new Date().toISOString(),
  };
  const humanGates = evaluateHumanGates({ brief, treatment, evidence, selectedEvaluation, assetGap, decisions, approvals: input.approvals, finalCutRequested: input.finalCutRequested });
  const baseProductionPlan = createProductionPlanFromTreatment(treatment);
  const gateBlockers = humanGates.pending.map((gate) => `Human gate: ${gate.label} — ${gate.reason}`);
  const productionPlan = {
    ...baseProductionPlan,
    creativeIntelligence:{
      dna:creativeDNA,
      artDirection,
      visualLanguage:selectedVisualLanguage,
      disciplineDirections,
      mutations:creativeMutations.slice(0,3),
      ceiling:creativeCeiling,
    },
    readiness: {
      ...baseProductionPlan.readiness,
      blockers: unique([...baseProductionPlan.readiness.blockers, ...report.blockers, ...gateBlockers]),
      readyForProduction: baseProductionPlan.readiness.readyForProduction && judgmentPermitsProduction(report.planningDisposition,report.judgment) && humanGates.authorizedForProduction,
    },
  };
  return {
    report,productionPlan,debate,audience,brandAssets,referenceDeconstructions,construction,constructionPlan,
    divergence:diverged.diversity,visualLanguages,visualLanguageDivergence,creativeDNA,artDirection,disciplineDirections,
    creativeMutations,creativeMemory,creativeCeiling,councilCalibration:inflation,humanGates,tasteCalibration:selectedTaste,
    tasteModel:resolvedTaste,
  };
}

function selectTerritory(treatment: DirectorTreatment, territoryId: string) {
  const territory = treatment.territories.find((item) => item.id === territoryId); if (!territory) return treatment;
  return parseDirectorTreatment({ ...treatment, selectedTerritoryId: territory.id, thesis: territory.thesis, memoryStatement: `People will remember this experience because ${territory.memory}.`.slice(0, 600), signatureMoment: { ...treatment.signatureMoment, name: territory.name.slice(0, 180), description: territory.signatureMoment.slice(0, 1600), whyMemorable: territory.memory.slice(0, 600) } });
}

function unique(items: string[]) { return items.filter((item, index) => item && items.indexOf(item) === index); }
