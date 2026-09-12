import assert from "node:assert/strict";
import test from "node:test";
import { cinematicRenderProfile } from "../src/lib/renderProfile";

test("cinematic render profiles increase quality without removing the low-tier safety floor", () => {
  const low = cinematicRenderProfile("low");
  const medium = cinematicRenderProfile("medium");
  const high = cinematicRenderProfile("high");
  assert.equal(low.bloom, false);
  assert.equal(low.antialias, "none");
  assert.equal(medium.antialias, "smaa");
  assert.ok(high.shadowMapSize > medium.shadowMapSize);
  assert.ok(medium.shadowMapSize > low.shadowMapSize);
  assert.equal(high.powerPreference, "high-performance");
});
