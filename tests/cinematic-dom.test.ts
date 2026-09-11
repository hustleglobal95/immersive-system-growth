import test from "node:test";
import assert from "node:assert/strict";
import { createProgressChannel, cueProgress } from "../src/lib/cinematicProgress";

test("scene cues support reverse seeks, skipped scenes and exact endpoints", () => {
  const range = [.2, .6] as const;
  const values = [0, .2, .4, 1, .6, .4, .2, 0].map((p) => cueProgress(p, range));
  const expected = [0, 0, .5, 1, 1, .5, 0, 0];
  values.forEach((value, index) => assert(Math.abs(value - expected[index]) < 1e-10));
  for (const bad of [[.4,.4], [.7,.2], [-1,.5], [0,2], [NaN,1]]) {
    assert.throws(() => cueProgress(.3, bad as [number,number]), RangeError);
  }
});

test("frame channel delivers exact shared samples and cleans up subscribers", () => {
  const channel = createProgressChannel();
  const a: number[] = [], b: number[] = [];
  const stop = channel.subscribe((p) => a.push(p));
  const stopB = channel.subscribe((p) => b.push(p));
  channel.publish(.372); channel.publish(.12); stop(); stop();
  channel.publish(.8); channel.publish(NaN); channel.publish(2); stopB();
  channel.publish(.5);
  assert.deepEqual(a, [.372,.12]);
  assert.deepEqual(b, [.372,.12,.8,1]);
});
