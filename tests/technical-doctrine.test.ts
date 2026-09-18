import test from "node:test";
import assert from "node:assert/strict";
import {
  immersiveConstructionPatterns,
} from "../src/platform/director-intelligence/constructionKnowledge";
import {
  doctrineForPatterns,
  immersiveTechnicalDoctrine,
} from "../src/platform/director-intelligence/technicalDoctrine";

test("primary-source technical doctrine covers critical immersive runtime concerns", () => {
  assert.equal(immersiveTechnicalDoctrine.length, 25);
  const ids = new Set(immersiveTechnicalDoctrine.map((item) => item.id));

  for (const id of [
    "three-precompile-upload",
    "r3f-demand-rendering",
    "video-frame-synchronization",
    "offscreen-canvas-isolation",
    "gsap-one-heartbeat",
    "gsap-high-frequency-setters",
    "refresh-rate-independent-time",
    "three-compressed-runtime-assets",
    "three-batching-instancing",
    "media-capability-selection",
    "page-visibility-suspension",
    "reduced-motion-substitution",
    "audio-analysis-smoothing",
    "view-transition-lifecycle",
    "renderer-info-budgeting",
    "gsap-responsive-lifecycle",
    "three-static-transform-control",
    "video-frame-callback-sync",
    "resize-observer-layout-sync",
    "content-visibility-long-page",
    "imagebitmap-worker-preparation",
  ]) {
    assert.ok(ids.has(id), `Missing doctrine: ${id}`);
  }

  assert.ok(
    immersiveTechnicalDoctrine.every(
      (item) =>
        item.source.startsWith("https://") &&
        item.principles.length >= 2 &&
        item.verification.length >= 2,
    ),
  );
});

test("technical doctrine only targets executable Forge construction patterns", () => {
  const known = new Set(immersiveConstructionPatterns.map((pattern) => pattern.id));
  const missing = immersiveTechnicalDoctrine
    .flatMap((item) => item.patternIds)
    .filter((patternId) => !known.has(patternId));

  assert.deepEqual(Array.from(new Set(missing)), []);
});

test("doctrine retrieval stays separate from visual precedent retrieval", () => {
  const doctrine = doctrineForPatterns([
    "prewarm-signature-systems",
    "freeze-static-render-work",
    "scrubbable-media-delivery",
  ]);

  assert.ok(doctrine.some((item) => item.id === "three-precompile-upload"));
  assert.ok(doctrine.some((item) => item.id === "r3f-demand-rendering"));
  assert.ok(doctrine.some((item) => item.id === "video-frame-synchronization"));
  assert.ok(
    doctrine.every(
      (item) =>
        item.authority === "official-docs" || item.authority === "web-standard",
    ),
  );
});
