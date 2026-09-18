import test from "node:test";
import assert from "node:assert/strict";
import { directProject } from "../src/platform/directorEngine";
import {
  getLayersTemplateCorpus,
  immersiveReferenceCorpus,
  retrieveImmersiveReferences,
} from "../src/platform/director-intelligence/referenceCorpus";
import { broaderImmersiveReferenceCorpus } from "../src/platform/director-intelligence/broaderReferenceCorpus";
import { buildConstructionDirectives, immersiveConstructionPatterns } from "../src/platform/director-intelligence/constructionKnowledge";

const brief = {
  projectName: "Corpus Test",
  projectType: "saas" as const,
  tier: "signature" as const,
  client: "Corpus Client",
  audience: "Design-aware buyers evaluating a premium software product with a strong visual identity.",
  objective: "Create preference with one persistent immersive world while keeping product understanding and conversion clear.",
  primaryAction: "Start a project",
  brandTruth: "The product turns a complex system into one legible persistent environment.",
  differentiators: ["A single spatial model", "A distinctive controlled interaction"],
  constraints: ["Do not reset the central subject between sections", "Mobile must preserve the same idea"],
  existingAssets: [
    {
      id: "hero",
      label: "Hero spatial asset",
      type: "model" as const,
      notes: "Hero-quality GLB.",
    },
  ],
  references: [],
};

test("current GetLayers template corpus tracks all 49 public catalog templates", () => {
  assert.equal(getLayersTemplateCorpus.length, 49);
  assert.equal(
    new Set(getLayersTemplateCorpus.map((reference) => reference.id)).size,
    49,
  );
});

test("48 public template previews are visually reviewed and unresolved catalog entries stay evidence-empty", () => {
  const reviewed = getLayersTemplateCorpus.filter(
    (reference) => reference.evidenceLevel !== "catalog",
  );
  const catalogOnly = getLayersTemplateCorpus.filter(
    (reference) => reference.evidenceLevel === "catalog",
  );

  assert.equal(reviewed.length, 48);
  assert.equal(catalogOnly.length, 1);
  assert.equal(catalogOnly[0]?.id, "northwall");
  assert.ok(
    catalogOnly.every(
      (reference) =>
        reference.observedTraits.length === 0 &&
        reference.transferableLessons.length === 0 &&
        reference.constructionPatternIds.length === 0,
    ),
  );
});

test("deep references carry evidence-backed transferable construction lessons", () => {
  const supported = getLayersTemplateCorpus.filter(
    (reference) => reference.evidenceLevel !== "catalog",
  );
  assert.equal(supported.length, 48);
  assert.ok(
    supported.every(
      (reference) =>
        reference.observedTraits.length > 0 &&
        reference.transferableLessons.length > 0 &&
        reference.evidenceNotes.length > 0 &&
        reference.confidence >= 0.72,
    ),
  );
});

test("reference retrieval excludes catalog-only guesses", () => {
  const treatment = directProject(brief);
  const retrieved = retrieveImmersiveReferences(treatment, 8);
  assert.ok(retrieved.length > 0);
  assert.ok(
    retrieved.every(({ reference }) => reference.evidenceLevel !== "catalog"),
  );
  assert.ok(
    retrieved.some(({ reference }) => reference.id === "ascend"),
  );
});

test("construction directives are grounded in both patterns and corpus precedents", () => {
  const treatment = directProject(brief);
  const directives = buildConstructionDirectives(treatment, 7);
  assert.ok(directives.referenceIds.length > 0);
  assert.ok(directives.referenceLessons.length > 0);
  assert.ok(directives.patternIds.includes("continuous-visual-anchor"));
  assert.ok(
    directives.patternIds.includes("single-world-under-interface") ||
      directives.patternIds.includes("scroll-reposition-not-reset"),
  );
});


test("broader immersive corpus adds 95 public studio and technical/source studies", () => {
  assert.equal(broaderImmersiveReferenceCorpus.length, 95);
  assert.ok(
    broaderImmersiveReferenceCorpus.every(
      (reference) =>
        reference.evidenceLevel === "public-case-study" ||
        reference.evidenceLevel === "technical-reference",
    ),
  );
  assert.equal(immersiveReferenceCorpus.length, 144);
});

test("broader corpus teaches implementation-shaping lessons rather than only visual style", () => {
  const lessons = broaderImmersiveReferenceCorpus.flatMap(
    (reference) => reference.transferableLessons,
  );
  const patterns = new Set(
    broaderImmersiveReferenceCorpus.flatMap(
      (reference) => reference.constructionPatternIds,
    ),
  );

  assert.ok(lessons.some((lesson) => lesson.includes("camera")));
  assert.ok(lessons.some((lesson) => lesson.includes("mobile")));
  assert.ok(lessons.some((lesson) => lesson.includes("interaction")));
  assert.ok(patterns.has("interaction-as-thesis"));
  assert.ok(patterns.has("authored-camera-corridor"));
  assert.ok(patterns.has("choose-medium-by-capability"));
  assert.ok(patterns.has("mobile-medium-substitution"));
});

test("Director retrieval can pull non-GetLayers precedents", () => {
  const treatment = directProject(brief);
  const retrieved = retrieveImmersiveReferences(treatment, 20);
  assert.ok(
    retrieved.some(({ reference }) =>
      broaderImmersiveReferenceCorpus.some((candidate) => candidate.id === reference.id),
    ),
  );
});

test("precedent retrieval avoids one-source monoculture", () => {
  const treatment = directProject(brief);
  const retrieved = retrieveImmersiveReferences(treatment, 8);
  const hosts = retrieved.map(({ reference }) => new URL(reference.source).hostname.replace(/^www\./, ""));
  const counts = new Map<string, number>();
  for (const host of hosts) counts.set(host, (counts.get(host) ?? 0) + 1);

  assert.ok(new Set(hosts).size >= 3);
  assert.ok(Array.from(counts.values()).every((count) => count <= 2));
});

test("every corpus pattern id resolves to executable construction knowledge", () => {
  const known = new Set(immersiveConstructionPatterns.map((pattern) => pattern.id));
  const referenced = new Set(
    immersiveReferenceCorpus.flatMap((reference) => reference.constructionPatternIds),
  );
  const missing = Array.from(referenced).filter((id) => !known.has(id));

  assert.deepEqual(missing, []);
  assert.equal(immersiveConstructionPatterns.length, 81);
  assert.equal(known.size, 81);
});

test("construction consensus ranks patterns by evidence across precedents", () => {
  const treatment = directProject(brief);
  const directives = buildConstructionDirectives(treatment, 7);

  assert.ok(directives.patternEvidence.length > 0);
  assert.ok(
    directives.patternEvidence.every(
      (item) =>
        item.support > 0 &&
        item.sourceCount >= 1 &&
        item.referenceIds.length >= 1,
    ),
  );
  for (let index = 1; index < directives.patternEvidence.length; index += 1) {
    const previous = directives.patternEvidence[index - 1];
    const current = directives.patternEvidence[index];
    assert.ok(
      previous.sourceCount > current.sourceCount ||
        (previous.sourceCount === current.sourceCount &&
          previous.support >= current.support),
    );
  }
});

test("aggressive research adds media, audio, camera, DCC and interaction knowledge", () => {
  const patterns = new Set(immersiveConstructionPatterns.map((pattern) => pattern.id));

  for (const id of [
    "scrubbable-media-delivery",
    "depth-map-volumetric-reconstruction",
    "offscreen-render-worker",
    "progressive-fidelity-stack",
    "audio-reactive-semantic-band",
    "scroll-distance-pacing",
    "directional-cut-continuity",
    "spatial-metaphor-compression",
    "dcc-semantic-naming-contract",
    "static-geometry-batching",
    "input-work-on-demand",
    "orthographic-diorama-staging",
    "gamified-progress-with-skip",
    "pre-rendered-sequence-for-fidelity",
    "cross-device-companion-control",
    "personalization-to-render-state",
  ]) {
    assert.ok(patterns.has(id), `Missing aggressive-research pattern: ${id}`);
  }

  for (const referenceId of [
    "codrops-kai-design-dept",
    "codrops-phantom-land",
    "codrops-until-labs",
    "codrops-aether-1",
    "codrops-crosswire",
    "codrops-windland",
    "codrops-kode-immersive",
    "codrops-forged-build",
    "source-bruno-simon-folio-2019",
    "source-abigail-bloom-room",
    "unseen-letter",
    "unseen-superlist",
    "hello-monday-google-cloud",
    "unit9-lightsaber-escape",
  ]) {
    assert.ok(
      immersiveReferenceCorpus.some((reference) => reference.id === referenceId),
      `Missing aggressive-research reference: ${referenceId}`,
    );
  }
});