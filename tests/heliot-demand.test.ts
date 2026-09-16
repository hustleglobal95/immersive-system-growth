import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsDemandFrame, type DemandFrameState } from '../src/experiences/heliot/demandFrame';
const initial: DemandFrameState = {
  progress: 0, velocity: 0, direction: 0, runtimeProgress: null, runtimeCamera: null,
  cameraPreview: null, pointer: { x: 0, y: 0 }, orbit: {}, quality: 'low',
  reducedMotion: false, freeCamera: false, guides: false, debug: true,
  selectedHotspot: null, retryGeneration: 0, visualSystems: {},
};
test('observing render stats or camera telemetry never schedules another frame', () => {
  const previous = { ...initial, rendererStats: {}, cameraTelemetry: {} };
  const next = { ...previous, rendererStats: {}, cameraTelemetry: {} };
  assert.equal(needsDemandFrame(next, previous), false);
  assert.equal(needsDemandFrame({ ...initial }, initial), false);
});
test('each authored runtime input wakes the HELIOT renderer', () => {
  for (const key of Object.keys(initial) as (keyof DemandFrameState)[]) {
    const value = initial[key];
    const changed = typeof value === 'number' ? value + 1 : typeof value === 'boolean' ? !value : typeof value === 'string' ? `${value}-changed` : {};
    assert.equal(needsDemandFrame({ ...initial, [key]: changed }, initial), true, key);
  }
});
