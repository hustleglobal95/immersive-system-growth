import assert from "node:assert/strict";
import test from "node:test";
import { advancePlayhead, curvePresets, normalizePlaybackRange } from "../src/lib/sequencerTransport";

test("transport advances deterministically at scene duration and playback rate", () => {
  const result = advancePlayhead(0.2, 1, { playing: true, loop: false, rate: 2, range: [0, 1], duration: 4 });
  assert.equal(result.playhead, 0.7);
  assert.equal(result.ended, false);
});

test("transport stops or loops at an authored playback range", () => {
  const stopped = advancePlayhead(0.7, 1, { playing: true, loop: false, rate: 1, range: [0.2, 0.8], duration: 2 });
  assert.deepEqual(stopped, { playhead: 0.8, ended: true });
  const looped = advancePlayhead(0.7, 1, { playing: true, loop: true, rate: 1, range: [0.2, 0.8], duration: 2 });
  assert.ok(looped.playhead >= 0.2 && looped.playhead < 0.8);
});

test("transport normalizes unsafe ranges and ships bounded curve presets", () => {
  assert.deepEqual(normalizePlaybackRange([0.8, 0.2]), [0.2, 0.8]);
  assert.ok(curvePresets.length >= 5);
  for (const preset of curvePresets) {
    assert.ok(preset.value[0] >= 0 && preset.value[0] <= 1);
    assert.ok(preset.value[2] >= 0 && preset.value[2] <= 1);
  }
});
