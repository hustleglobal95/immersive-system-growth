import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { heliotExperience as config, relativeLight } from '../src/experiences/heliot/config';
import manifest from '../src/experiences/heliot/asset-manifest.json';
import { sampleExperience } from '../src/lib/sampleExperience';
import { sampleProductTrack } from '../src/lib/productRig';
import { auditCameraMotion } from '../src/lib/cameraDiagnostics';
import { buildSpatialScene, evaluateSpatialCameraTracks } from '../src/lib/spatialCamera';
import type { MotionTrack } from '../src/types/experience';

test('HELIOT ten-act timeline has continuous desktop and mobile cameras', () => {
  assert.equal(config.scenes.length, 10);
  assert.deepEqual(auditCameraMotion(config), []);
  for (let i = 1; i < config.scenes.length; i++) {
    assert.deepEqual(config.scenes[i - 1].camera.to, config.scenes[i].camera.from);
    assert.deepEqual(config.scenes[i - 1].mobileCamera!.to, config.scenes[i].mobileCamera!.from);
  }
});

test('HELIOT camera paths pass Forge spatial validation in both viewports', () => {
  for (const [viewport, aspect] of [['desktop', 16 / 9], ['mobile', 9 / 16]] as const) {
    for (const [index, scene] of config.scenes.entries()) {
      const samples = Array.from({ length: 65 }, (_, i) => sampleExperience(scene.range[0] + (scene.range[1] - scene.range[0]) * i / 64 - (i === 64 && index < 9 ? 1e-9 : 0), false, config, aspect).camera);
      const tracks = ['position', 'target', 'fov'].map(property => ({
        id: `verify-${property}`, label: property, type: property === 'fov' ? 'number' : 'vector', viewport, blend: 'absolute', muted: false, locked: false,
        target: `camera.${property}`, keyframes: samples.map((camera, i) => ({ id: `sample-${i}`, at: i / 64, easing: 'linear', value: camera[property as keyof typeof camera] })),
      })) as MotionTrack[];
      const spatial = buildSpatialScene(config, index, [{ id: 'hero', min: [-1.2,-1.2,-1.6], max: [1.2,1.2,1.3], role: 'subject', source: 'geometry' }]);
      const report = evaluateSpatialCameraTracks(tracks, spatial, viewport, 128);
      assert.equal(report.collisionSamples, 0, `${scene.id}/${viewport}: camera intersection`);
      assert.equal(report.floorViolations, 0, `${scene.id}/${viewport}: floor penetration`);
      assert.equal(report.framingViolations, 0, `${scene.id}/${viewport}: framing loss`);
    }
  }
});

test('HELIOT named GLB components resolve in both quality tiers and match manifest hashes', () => {
  for (const model of manifest.models) {
    const data = fs.readFileSync(`public${model.path}`);
    assert.equal(data.byteLength, model.bytes);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), model.sha256);
    const document = JSON.parse(data.subarray(20,20 + data.readUInt32LE(12)).toString());
    const names = document.nodes.map((node: { name: string }) => node.name);
    for (const node of config.productRig!.nodes) assert.ok(names.includes(node), node);
  }
});

test('HELIOT explosion is history independent and reassembles exactly', () => {
  for (const track of config.productRig!.tracks) {
    const expected = sampleProductTrack(track, .47);
    for (const p of [.8, .1, 1, .4, 0]) sampleProductTrack(track, p);
    assert.deepEqual(sampleProductTrack(track, .47), expected);
    assert.deepEqual(sampleProductTrack(track, 0), sampleProductTrack(track, 1));
  }
  assert.deepEqual(sampleExperience(.85, true, config).camera, sampleExperience(0, true, config).camera);
  assert.equal(relativeLight(1.4), 100);
  assert.equal(relativeLight(2), 49);
  assert.equal(relativeLight(8), 3);
});
