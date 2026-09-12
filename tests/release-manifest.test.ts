import assert from "node:assert/strict";
import test from "node:test";
import rawForgeProject from "../config/forge-project.json";
import { parseForgeProject } from "../src/platform/forgeProjectSchema";
import { createReleaseManifest, type ReleaseDocumentKind } from "../src/platform/releaseManifest";

const project = parseForgeProject(rawForgeProject);
const documents = {
  forgeProject: JSON.stringify(rawForgeProject),
  experience: "{}",
  studioProject: "{}",
  creativeDirection: "{}",
  assetManifest: "{}",
  visualSystems: "{}",
} satisfies Record<ReleaseDocumentKind, string>;

test("release fingerprints cover every reviewed runtime document", () => {
  const manifest = createReleaseManifest(project, documents);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.documents.length, 6);
  assert.deepEqual(manifest.documents.map((document) => document.kind), [
    "forgeProject",
    "experience",
    "studioProject",
    "creativeDirection",
    "assetManifest",
    "visualSystems",
  ]);
  manifest.documents.forEach((document) => {
    assert.match(document.sha256, /^[a-f0-9]{64}$/);
    assert.ok(document.bytes > 0);
  });
  assert.equal(manifest.documents[5].path, project.paths.visualSystems);
});

test("release fingerprints are deterministic and fail closed on missing documents", () => {
  assert.deepEqual(createReleaseManifest(project, documents), createReleaseManifest(project, documents));
  const incomplete = { ...documents, visualSystems: undefined } as unknown as Record<ReleaseDocumentKind, string>;
  assert.throws(() => createReleaseManifest(project, incomplete), /Missing release document/);
});
