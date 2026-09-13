import assert from "node:assert/strict";
import test from "node:test";
import type { ProductTrack } from "../src/types/experience";
import raw from "../recipes/burger-showcase.json";
import { parseExperience } from "../src/lib/configSchema";
import {
  sampleOpacityTrack,
  sampleProductTrack,
  sampleTransformTrack,
  sampleVisibilityTrack,
} from "../src/lib/productRig";

const position = {
  node: "top-bun",
  property: "position",
  mode: "offset",
  keyframes: [
    { at: 0, value: [0, 0, 0] },
    { at: 0.5, value: [0, 3, 0], easing: "linear" },
    { at: 1, value: [0, 0, 0] },
  ],
} satisfies ProductTrack;

test("product tracks are deterministic, clamped and reverse independent", () => {
  const forward = Array.from({ length: 101 }, (_, i) => sampleProductTrack(position, i / 100));
  for (let i = 100; i >= 0; i--)
    assert.deepEqual(sampleProductTrack(position, i / 100), forward[i]);
  assert.deepEqual(sampleTransformTrack(position, -5), [0, 0, 0]);
  assert.deepEqual(sampleTransformTrack(position, 5), [0, 0, 0]);
});

test("opacity and visibility tracks hold exact endpoints", () => {
  const opacity = {
    node: "cheese",
    property: "opacity",
    keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1, easing: "linear" }],
  } satisfies ProductTrack;
  const visible = {
    node: "cheese",
    property: "visible",
    keyframes: [{ at: 0, value: false }, { at: 0.5, value: true }],
  } satisfies ProductTrack;
  assert.equal(sampleOpacityTrack(opacity, 0), 0);
  assert.equal(sampleOpacityTrack(opacity, 1), 1);
  assert.equal(sampleVisibilityTrack(visible, 0.49), false);
  assert.equal(sampleVisibilityTrack(visible, 0.5), true);
});

test("schema rejects unknown rig nodes and unordered keyframes", () => {
  const unknownNode = structuredClone(raw);
  unknownNode.productRig.tracks[0].node = "missing-node";
  assert.throws(() => parseExperience(unknownNode));
  const unordered = structuredClone(raw);
  unordered.productRig.tracks[0].keyframes[1].at = 0;
  assert.throws(() => parseExperience(unordered));
});
