import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseDirectorTreatment } from "../src/platform/directorSchema";
import { parseCreativeDirection } from "../src/platform/creativeDirectionSchema";
import { parseStudioProject } from "../src/platform/studioSchema";
import { createProductionPlanFromTreatment } from "../src/platform/directorProductionPlan";

const read = (path: string) => JSON.parse(fs.readFileSync(path, "utf8"));

test("HELIOT locks the threshold descent as its primary signature", () => {
  const treatment = parseDirectorTreatment(read("clients/heliot/director/treatment.json"));
  assert.equal(treatment.selectedTerritoryId, "cross-the-light");
  assert.equal(treatment.signatureMoment.name, "The Threshold Descent");
  assert.equal(Math.max(...treatment.emotionalArc.map((beat) => beat.intensity)), 10);
  assert.equal(treatment.emotionalArc.find((beat) => beat.id === "descent")?.intensity, 10);
  assert.ok((treatment.emotionalArc.find((beat) => beat.id === "reveal")?.intensity ?? 10) < 10);
});

test("HELIOT project points at persisted Director intelligence", () => {
  const project = parseStudioProject(read("clients/heliot/studio-project.json"));
  assert.equal(project.directorTreatmentPath, "clients/heliot/director/treatment.json");
  for (const path of [project.directorTreatmentPath, project.directorEvidencePath, project.directorDecisionsPath, project.directorFingerprintPath, project.directorCritiquePath, project.directorReviewHistoryPath]) {
    assert.equal(fs.existsSync(path), true, `${path} should exist`);
  }
});

test("HELIOT uses the full Creative Direction contract", () => {
  const creative = parseCreativeDirection(read("clients/heliot/creative-direction.json"));
  assert.ok(creative.artDirection);
  assert.equal(creative.scenes.length, 10);
  assert.ok(creative.artDirection!.forbiddenPatterns.some((item) => /generic hero orbit/i.test(item)));
  const descent = creative.scenes.find((scene) => scene.id === "surface");
  assert.ok(descent?.direction?.camera?.path.some((item) => /validated centerline/i.test(item)));
  assert.ok(descent?.direction?.negativeDirectives.some((item) => /no cut or teleport/i.test(item)));
  const aerial = creative.scenes.find((scene) => scene.id === "signature");
  assert.ok(aerial?.direction?.negativeDirectives.some((item) => /do not outdo the threshold descent/i.test(item)));
});

test("HELIOT evidence and decision ledger are release-grade", () => {
  const evidence = read("clients/heliot/director/evidence.json");
  const decisions = read("clients/heliot/director/decisions.json");
  const critique = read("clients/heliot/director/critique.json");
  const history = read("clients/heliot/director/review-history.json");
  assert.ok(evidence.evidence.length >= 8);
  assert.ok(evidence.confidence >= 0.9);
  assert.deepEqual(evidence.unsupportedClaims, []);
  assert.ok(decisions.decisions.length >= 6);
  assert.ok(decisions.decisions.every((item: { status: string }) => item.status === "locked"));
  assert.equal(critique.status, "final-cut");
  assert.equal(critique.verdict, "LOCK");
  assert.equal(critique.council.length, 12);
  assert.ok(history.reviews.some((review: { stage: number }) => review.stage === 100));
});

test("HELIOT portfolio memory matches the project fingerprint", () => {
  const local = read("clients/heliot/director/fingerprint.json");
  const stored = read("forge-intelligence/projects/heliot-optical-study.fingerprint.json");
  assert.deepEqual(stored, local);
});

test("HELIOT final-cut UI quiets chrome without hiding focused controls", () => {
  const css = fs.readFileSync("app/heliot/final-cut.css", "utf8");
  assert.match(css, /data-chapter="1"/);
  assert.match(css, /data-chapter="2"/);
  assert.match(css, /:focus-within/);
  assert.match(css, /prefers-reduced-motion/);
});

test("HELIOT locked treatment still compiles into Forge production", () => {
  const plan = createProductionPlanFromTreatment(read("clients/heliot/director/treatment.json"));
  assert.ok(plan.creativePlan.scenes.length >= 5);
  assert.equal(plan.readiness.blockers.filter((item) => item.startsWith("Director:")).length, 0);
});
