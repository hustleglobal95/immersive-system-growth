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
import { createPassageCurve } from '../src/experiences/heliot/flightGeometry';

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
      // A hollow entrance is navigable space, not a solid product bounding box.
      // Exterior shots frame the gateway; gallery holds frame the exhibit.
      const traversing = [1,2,7].includes(index);
      const exterior = [0,8,9].includes(index);
      const spatialConfig = { ...config, heroVisible: !traversing, scenes: config.scenes.map(s => exterior ? {...s,hero:{...s.hero,from:{...s.hero.from,position:[0,0,0] as [number,number,number]},to:{...s.hero.to,position:[0,0,0] as [number,number,number]}}} : s) };
      const spatial = buildSpatialScene(spatialConfig, index, [{ id: 'hero', min: [-1.2,-1.2,-.55], max: [1.2,1.2,.55], role: 'subject', source: 'geometry' }]);
      // The gallery is below the landscape; use its modeled floor elevation.
      spatial.floorY=exterior?-1.25:-6.66;
      const report = evaluateSpatialCameraTracks(tracks, spatial, viewport, 128);
      assert.equal(report.collisionSamples, 0, `${scene.id}/${viewport}: camera intersection`);
      assert.equal(report.floorViolations, 0, `${scene.id}/${viewport}: floor penetration`);
      // Passage shots frame the route; object-framing gates apply to exhibit/exterior holds.
      if(!traversing)assert.equal(report.framingViolations, 0, `${scene.id}/${viewport}: framing loss`);
    }
  }
});

test('drone actually crosses the hollow gateway in both directions with clearance', () => {
  const passage=createPassageCurve().getPoints(1000);
  for(const aspect of [16/9,9/16]){
    const enter=sampleExperience(.20,false,config,aspect).camera.position;
    const leave=sampleExperience(.80,false,config,aspect).camera.position;
    assert.ok(enter[2]<-1,'camera enters the gallery');assert.ok(leave[2]>2,'camera exits into the landscape');
    for(let i=0;i<=2000;i++){
      const camera=sampleExperience(i/2000,false,config,aspect).camera;
      const [x,y,z]=camera.position;
      assert.ok(Math.hypot(...camera.target.map((v,k)=>v-camera.position[k]))>.25,'look direction remains defined');
      if(z>=-1.5&&z<=.55&&Math.abs(x)<1.3&&y<1.3)assert.ok(Math.hypot(x,y)<.76,`clear passage at ${i/2000}: ${camera.position}`);
      if(z<-1.5&&z>-9.8){const clearance=Math.min(...passage.map(p=>Math.hypot(p.x-x,p.y-y,p.z-z)));assert.ok(clearance<.85,`passage clearance at ${i/2000}: ${clearance}`);}
      if(z<=-9.8&&z>-24)assert.ok(y>-6.64&&y<-1.5&&Math.abs(x)<7.5,`gallery clearance at ${i/2000}`);
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
