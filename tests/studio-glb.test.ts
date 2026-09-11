import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { inspectGlb } from "../src/platform/glbInspector";

test("GLB inspector reports production nodes, meshes, materials and animations", () => {
  const file = fs.readFileSync("public/models/reference/burger.glb");
  const report = inspectGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  assert.equal(report.version, 2);
  assert.ok(report.meshes.length >= 9);
  assert.ok(report.materials.length >= 5);
  assert.ok(report.suggestedRigNodes.includes("top-bun"));
  assert.ok(report.suggestedRigNodes.includes("patty-bottom"));
  assert.deepEqual(report.warnings, []);
});

test("GLB inspector rejects malformed input", () => {
  assert.throws(() => inspectGlb(new ArrayBuffer(20)), /not a binary glTF/);
});
