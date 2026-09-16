import fs from "node:fs/promises";
import { parseDirectorBrief, parseDirectorTreatment } from "../src/platform/directorSchema.ts";
import { runDirectorIntelligence } from "../src/platform/director-intelligence/orchestrator.ts";
import { createProductionPlanFromTreatment } from "../src/platform/directorProductionPlan.ts";
import { parseStudioProject } from "../src/platform/studioSchema.ts";
import { parseCreativeDirection } from "../src/platform/creativeDirectionSchema.ts";
import { parseVisualSystems } from "../src/platform/visualSystems.ts";

const readJson = async (path) => JSON.parse(await fs.readFile(path, "utf8"));
const brief = parseDirectorBrief(await readJson("clients/heliot/director-brief.json"));
const treatment = parseDirectorTreatment(await readJson("clients/heliot/director/treatment.json"));
const project = parseStudioProject(await readJson("clients/heliot/studio-project.json"));
const creative = parseCreativeDirection(await readJson("clients/heliot/creative-direction.json"));
const visualSystems = parseVisualSystems(await readJson("clients/heliot/visual-systems.json"));
const evidence = await readJson("clients/heliot/director/evidence.json");
const decisions = await readJson("clients/heliot/director/decisions.json");
const fingerprint = await readJson("clients/heliot/director/fingerprint.json");
const portfolioFingerprint = await readJson("forge-intelligence/projects/heliot-optical-study.fingerprint.json");
const critique = await readJson("clients/heliot/director/critique.json");
const reviewHistory = await readJson("clients/heliot/director/review-history.json");
const finalCutCss = await fs.readFile("app/heliot/final-cut.css", "utf8");

if (project.directorTreatmentPath !== "clients/heliot/director/treatment.json") throw new Error("HELIOT Studio project does not point to the locked Director treatment.");
if (treatment.selectedTerritoryId !== "cross-the-light") throw new Error("HELIOT final-cut territory is not locked to Cross the Light.");
if (treatment.signatureMoment.name !== "The Threshold Descent") throw new Error("HELIOT primary signature must remain The Threshold Descent.");
if (!treatment.signatureMoment.description.includes("underground light gallery")) throw new Error("HELIOT signature no longer describes physical entry into the underground gallery.");
if (treatment.budgetAllocation.signatureMoment < 30) throw new Error("HELIOT flagship allocation no longer protects the signature moment.");
if (treatment.critique.blockers.length) throw new Error(`Locked HELIOT treatment contains Director blockers: ${treatment.critique.blockers.join(" | ")}`);

if (!creative.artDirection) throw new Error("HELIOT Creative Direction is missing the full art-direction constitution.");
if (!creative.artDirection.cameraLanguage.some((item) => /visitor moving through architecture/i.test(item))) throw new Error("HELIOT camera language drifted away from architectural traversal.");
if (!creative.artDirection.forbiddenPatterns.some((item) => /generic hero orbit/i.test(item))) throw new Error("HELIOT anti-orbit rule is missing.");
const descent = creative.scenes.find((scene) => scene.id === "surface");
if (!descent?.direction?.camera?.path.some((item) => /validated centerline/i.test(item))) throw new Error("HELIOT threshold descent no longer carries its spatial camera directive.");
if (!descent.direction.negativeDirectives.some((item) => /no cut or teleport/i.test(item))) throw new Error("HELIOT threshold descent lost its no-teleport final-cut rule.");
const aerial = creative.scenes.find((scene) => scene.id === "signature");
if (!aerial?.direction?.negativeDirectives.some((item) => /do not outdo the threshold descent/i.test(item))) throw new Error("HELIOT aerial reveal is no longer subordinate to the primary signature.");

if (!Array.isArray(evidence.evidence) || evidence.evidence.length < 8 || evidence.confidence < 0.9) throw new Error("HELIOT Director evidence is incomplete or low-confidence.");
if (evidence.unsupportedClaims?.length) throw new Error(`HELIOT contains unsupported Director claims: ${evidence.unsupportedClaims.join(" | ")}`);
if (!Array.isArray(decisions.decisions) || decisions.decisions.length < 6 || decisions.decisions.some((item) => item.status !== "locked")) throw new Error("HELIOT creative decision ledger is not fully locked.");
if (critique.status !== "final-cut" || critique.verdict !== "LOCK") throw new Error("HELIOT final Director critique is not locked.");
if (!Array.isArray(critique.council) || critique.council.length !== 12) throw new Error("HELIOT persisted Council review must contain all 12 roles.");
if (!reviewHistory.reviews?.some((review) => review.stage === 100)) throw new Error("HELIOT is missing its 100% final-cut review.");
if (fingerprint.projectId !== "heliot-optical-study" || portfolioFingerprint.projectId !== fingerprint.projectId) throw new Error("HELIOT creative fingerprint is not registered in Forge portfolio memory.");
if (JSON.stringify(fingerprint) !== JSON.stringify(portfolioFingerprint)) throw new Error("HELIOT project fingerprint and portfolio-memory fingerprint have drifted.");

if (!finalCutCss.includes('data-chapter="1"') || !finalCutCss.includes('data-chapter="2"') || !finalCutCss.includes(":focus-within")) throw new Error("HELIOT signature UI quieting or focus restoration is missing.");
if (visualSystems.systems.length !== 0) console.log(`HELIOT specialist visual systems declared: ${visualSystems.systems.map((item) => item.id).join(", ")}`);
else console.log("HELIOT visual-system manifest intentionally remains empty; bespoke world/light systems already carry the concept and Director final cut rejects decorative additions.");

const productionPlan = createProductionPlanFromTreatment(treatment);
if (productionPlan.creativePlan.scenes.length < 5) throw new Error("HELIOT locked Director handoff produced an incomplete Creative Plan.");
if (productionPlan.readiness.blockers.some((item) => item.startsWith("Director:"))) throw new Error(`HELIOT locked Director handoff contains blockers: ${productionPlan.readiness.blockers.join(" | ")}`);

// Keep the generative Director brain adversarial even though the manually locked treatment is authoritative.
const live = runDirectorIntelligence({ brief });
if (live.report.treatment.territories.length !== 3) throw new Error("HELIOT live Director must still produce exactly three territories.");
if (live.report.selectedEvaluation.critiques.length !== 12) throw new Error("HELIOT live Director Council is incomplete.");
if (live.report.stress.results.length < 12) throw new Error("HELIOT live stress lab is incomplete.");
if (live.report.verdict === "REJECT") throw new Error(`HELIOT live Director rejected the current brief: ${live.report.blockers.join(" | ")}`);

console.log(`HELIOT locked territory: ${treatment.selectedTerritoryId}`);
console.log(`HELIOT signature: ${treatment.signatureMoment.name}`);
console.log(`HELIOT persisted Council roles: ${critique.council.length}`);
console.log(`HELIOT evidence confidence: ${Math.round(evidence.confidence * 100)}%`);
console.log(`HELIOT locked decisions: ${decisions.decisions.length}`);
console.log(`HELIOT live Director verdict: ${live.report.verdict}`);
console.log(`HELIOT live creative ceiling: ${live.report.ceiling.current.toFixed(1)} -> ${live.report.ceiling.projected.toFixed(1)}`);
console.log(`HELIOT live stress resilience: ${live.report.stress.resilienceScore.toFixed(1)}/10`);
console.log("HELIOT Director final-cut audit passed.");
