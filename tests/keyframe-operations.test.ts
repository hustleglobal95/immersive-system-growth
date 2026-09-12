import assert from "node:assert/strict";
import test from "node:test";
import { retimeSelection } from "../src/lib/keyframeOperations";

const keys = [
  { token: "track:a", at: 0.2 },
  { token: "track:b", at: 0.35 },
  { token: "track:c", at: 0.8 },
];

test("selected keys distribute evenly without moving the selection bounds", () => {
  assert.deepEqual(retimeSelection(keys, "distribute"), {
    "track:a": 0.2,
    "track:b": 0.5,
    "track:c": 0.8,
  });
});

test("selected key timing reverses deterministically inside its existing window", () => {
  const result = retimeSelection(keys, "reverse");
  assert.ok(Math.abs(result["track:a"] - 0.8) < 0.000001);
  assert.ok(Math.abs(result["track:b"] - 0.65) < 0.000001);
  assert.ok(Math.abs(result["track:c"] - 0.2) < 0.000001);
});
