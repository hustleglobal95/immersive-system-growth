import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { inspectGlb, stableNodeId } from "../src/platform/glbInspector";

test("GLB inspector reports production nodes, meshes, materials and animations", () => {
  const file = fs.readFileSync("public/models/reference/burger.glb");
  const report = inspectGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  assert.equal(report.version, 2);
  assert.ok(report.meshes.length >= 9);
  assert.ok(report.materials.length >= 5);
  assert.ok(report.suggestedRigNodes.includes("top-bun"));
  assert.ok(report.suggestedRigNodes.includes("patty-bottom"));
  assert.ok(report.totals.triangles > 0);
  assert.ok(report.totals.vertices > 0);
  assert.equal(report.complexity, "light");
  const topBunMapping = report.suggestedMappings.find((mapping) => mapping.node === "top-bun");
  assert.ok(topBunMapping);
  assert.equal(topBunMapping.id, stableNodeId(topBunMapping.path));
  assert.match(topBunMapping.id, /^node-[a-z0-9-]+-[a-f0-9]{8}$/);
  assert.ok(report.nodes.every((node) => node.path.length > 0));
  assert.ok(report.recommendations.length > 0);
  assert.deepEqual(report.warnings, []);
});

test("GLB inspector rejects malformed input", () => {
  assert.throws(() => inspectGlb(new ArrayBuffer(20)), /not a binary glTF/);
});
