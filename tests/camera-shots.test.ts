import test from "node:test";
import assert from "node:assert/strict";
import { cameraSchema } from "../src/lib/configSchema";
import { createCameraShot, cameraShotNames, sampleCameraShot, subjectFitDistance } from "../src/lib/cameraShots";
import { sampleCameraPath } from "../src/lib/cameraPaths";

test("subject orbit keeps its radius instead of cutting through its subject", () => {
  const from: [number,number,number] = [-4,0,0], to: [number,number,number] = [4,0,0];
  for (let i=0;i<=100;i++) assert(Math.abs(Math.hypot(...sampleCameraPath(from,to,i/100,"subject-orbit"))-4)<1e-10);
  assert.deepEqual(sampleCameraPath(from,to,0,"subject-orbit"),from);
  assert.deepEqual(sampleCameraPath(from,to,1,"subject-orbit"),to);
});

test("authored shots validate and reverse identically around an offset target", () => {
  for (const name of cameraShotNames) for (const aspect of [16/9,9/16]) {
    const shot = createCameraShot(name,[10,2,-8],1.5,aspect);
    assert(cameraSchema.safeParse(shot).success);
    assert.deepEqual(sampleCameraShot(shot,0),shot.from);
    assert.deepEqual(sampleCameraShot(shot,1),shot.to);
    const forward = Array.from({length:101},(_,i)=>sampleCameraShot(shot,i/100));
    for (let i=100;i>=0;i--) {
      assert.deepEqual(sampleCameraShot(shot,i/100),forward[i]);
      const sample = forward[i];
      assert(sample.position.every(Number.isFinite));
      const distance = Math.hypot(...sample.position.map((v,j)=>v-sample.target[j]));
      assert(distance >= subjectFitDistance(1.5,sample.fov,aspect,1),"Subject must fit throughout the shot");
    }
  }
});

test("portrait framing expands distance and rejects invalid geometry", () => {
  assert(subjectFitDistance(1,38,9/16)>subjectFitDistance(1,38,16/9));
  for(const radius of [0,-1,NaN,Infinity]) assert.throws(()=>subjectFitDistance(radius,38,1));
  assert.throws(()=>subjectFitDistance(1,0,1));
  assert.throws(()=>subjectFitDistance(1,38,0));
});
