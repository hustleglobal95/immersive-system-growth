import test from "node:test";
import assert from "node:assert/strict";
import { broaderImmersiveReferenceCorpus } from "../src/platform/director-intelligence/broaderReferenceCorpus";
import { immersiveConstructionPatterns } from "../src/platform/director-intelligence/constructionKnowledge";
import { buildReferenceLensCoverage, type ImmersiveConstructionLens } from "../src/platform/director-intelligence/constructionLenses";
import { immersiveFailureKnowledge } from "../src/platform/director-intelligence/failureKnowledge";
import { immersiveTechnicalDoctrine } from "../src/platform/director-intelligence/technicalDoctrine";

test("reconciled research wave remains present and executable", () => {
  const patterns = new Set(immersiveConstructionPatterns.map((item) => item.id));
  for (const id of [
    "dom-proxy-spatial-alignment",
    "screen-space-effect-substitution",
    "bounded-parametric-character-system",
    "remote-rendered-fidelity",
    "branching-authored-film",
    "decoded-frame-bank-for-hard-scrub",
  ]) assert.ok(patterns.has(id), "Missing reconciled construction pattern: " + id);

  const failures = new Set(immersiveFailureKnowledge.map((item) => item.id));
  for (const id of [
    "api-support-is-not-performance-proof",
    "parallel-preload-decode-contention",
    "multiple-canvas-context-proliferation",
    "high-frequency-react-layout-thrash",
    "content-trapped-in-spatial-ui",
    "mid-scene-loading-breaks-story",
  ]) assert.ok(failures.has(id), "Missing reconciled failure lesson: " + id);

  const doctrine = new Set(immersiveTechnicalDoctrine.map((item) => item.id));
  for (const id of [
    "three-static-transform-control",
    "video-frame-callback-sync",
    "resize-observer-layout-sync",
    "content-visibility-long-page",
    "imagebitmap-worker-preparation",
  ]) assert.ok(doctrine.has(id), "Missing reconciled technical doctrine: " + id);
});

test("reconciled public research references and construction lenses stay available", () => {
  const references = new Set(broaderImmersiveReferenceCorpus.map((item) => item.id));
  for (const id of [
    "14islands-progressive-webgl",
    "14islands-blobmixer",
    "monks-hp-possibility-city",
    "north-kingdom-endless-summer",
    "active-theory-engine-architecture",
    "stink-abbey-road",
    "reflektor-cadillac-celestiq",
    "unit9-piaget-polo",
  ]) assert.ok(references.has(id), "Missing reconciled research reference: " + id);

  const coverage = buildReferenceLensCoverage(broaderImmersiveReferenceCorpus);
  const lenses = new Set(coverage.map((item) => item.lens));
  for (const lens of [
    "composition",
    "motion-choreography",
    "narrative-transition",
    "camera-spatial",
    "interaction",
    "media",
    "runtime-performance",
    "asset-pipeline",
    "responsive-accessibility",
    "content-data-commerce",
    "production-tooling",
    "sound",
  ] as ImmersiveConstructionLens[]) assert.ok(lenses.has(lens), "Missing construction lens coverage: " + lens);
  assert.ok(coverage.every((item) => item.referenceIds.length > 0 && item.patternIds.length > 0));
});

test("reconciled intelligence counts are synchronized", () => {
  assert.equal(broaderImmersiveReferenceCorpus.length, 187);
  assert.equal(immersiveConstructionPatterns.length, 108);
  assert.equal(immersiveFailureKnowledge.length, 18);
  assert.equal(immersiveTechnicalDoctrine.length, 25);
});
