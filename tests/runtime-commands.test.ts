import assert from "node:assert/strict";
import test from "node:test";
import { MeshPhysicalMaterial } from "three";
import { lerpCameraState, runtimeEase, sampleCameraDefinition, sampleCameraTransition } from "../src/lib/runtimeCommands";
import { clearShaderOverrides, readShaderTarget, registerMaterialShaderTarget, reapplyShaderTarget, writeShaderTarget } from "../src/runtime/shaderRegistry";
import type { CameraDefinition, CameraState } from "../src/types/experience";

const camera: CameraDefinition = {
  path: "linear",
  from: { position: [0, 0, 8], target: [0, 0, 0], fov: 42 },
  to: { position: [2, 1, 4], target: [0, .5, 0], fov: 34 },
};

test("runtime easing is bounded and preserves exact endpoints", () => {
  for (const easing of ["linear", "smooth", "ease-in", "ease-out", "ease-in-out"] as const) {
    assert.equal(runtimeEase(-1, easing), 0);
    assert.equal(runtimeEase(0, easing), 0);
    assert.equal(runtimeEase(1, easing), 1);
    assert.equal(runtimeEase(2, easing), 1);
    assert.ok(runtimeEase(.5, easing) >= 0 && runtimeEase(.5, easing) <= 1);
  }
});

test("camera command sampling is deterministic and blends from the live camera", () => {
  assert.deepEqual(sampleCameraDefinition(camera, 0), camera.from);
  assert.deepEqual(sampleCameraDefinition(camera, 1), camera.to);
  const live: CameraState = { position: [-5, 2, 10], target: [1, 0, 0], fov: 50 };
  assert.deepEqual(sampleCameraTransition(live, camera, 0), live);
  assert.deepEqual(sampleCameraTransition(live, camera, 1), camera.to);
  const halfway = lerpCameraState(live, camera.to, .5);
  assert.deepEqual(halfway.position, [-1.5, 1.5, 7]);
  assert.equal(halfway.fov, 42);
});

test("shader overrides persist after authored material values are reapplied", () => {
  clearShaderOverrides();
  const material = new MeshPhysicalMaterial({ roughness: .8, metalness: .1, color: "#ffffff" });
  const unregister = registerMaterialShaderTarget("hero-test", material);
  assert.equal(readShaderTarget("hero-test", "roughness"), .8);
  assert.equal(writeShaderTarget("hero-test", "roughness", .25), 1);
  assert.equal(material.roughness, .25);
  material.roughness = .9;
  assert.equal(reapplyShaderTarget("hero-test"), 1);
  assert.equal(material.roughness, .25);
  unregister();
  material.dispose();
  clearShaderOverrides();
});
