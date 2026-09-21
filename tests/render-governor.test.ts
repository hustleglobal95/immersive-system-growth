import test from "node:test";
import assert from "node:assert/strict";
import {
  governedDpr,
  governedParticleCount,
  governedShadowMapSize,
  renderGovernorProfile,
} from "../src/lib/renderGovernor";
import { cinematicRenderProfile } from "../src/lib/renderProfile";
import { useExperienceStore } from "../src/store/experienceStore";

test("Render Governor sheds secondary cost monotonically while preserving subject tier",()=>{
  const tiers=["native","balanced","performance","survival"] as const;
  const dprs=tiers.map((tier)=>governedDpr(2,"high",tier));
  assert.deepEqual(dprs,[2,1.76,1.44,1.16]);
  assert.ok(dprs.every((value,index)=>index===0 || value<=dprs[index-1]));
  assert.equal(governedDpr(.4,"high","survival"),.4);

  const particles=tiers.map((tier)=>governedParticleCount(1000,"high",tier));
  assert.deepEqual(particles,[1000,720,400,150]);
  const shadows=tiers.map((tier)=>governedShadowMapSize(2048,"high",tier));
  assert.deepEqual(shadows,[2048,2048,1024,512]);

  for(const tier of tiers) assert.equal(renderGovernorProfile("high",tier).preserveSubjectTier,true);
});

test("governor-aware render profiles remove expensive post/shadow work before coarse quality changes",()=>{
  const native=cinematicRenderProfile("high","native");
  const balanced=cinematicRenderProfile("high","balanced");
  const performance=cinematicRenderProfile("high","performance");
  const survival=cinematicRenderProfile("high","survival");
  assert.equal(native.bloom,true);
  assert.equal(native.bloomMipmap,true);
  assert.equal(balanced.bloom,true);
  assert.equal(balanced.bloomMipmap,false);
  assert.equal(performance.bloom,true);
  assert.equal(performance.bloomScale,.35);
  assert.equal(survival.bloom,false);
  assert.equal(survival.antialias,"none");
  assert.equal(survival.shadows,false);
});

test("automatic pressure burns render-governor budget before lowering hero/model quality",()=>{
  const store=useExperienceStore.getState();
  store.setProfile("high","auto");
  assert.equal(useExperienceStore.getState().quality,"high");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"native");

  store.adaptRendering(-1,"test");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"balanced");
  assert.equal(useExperienceStore.getState().quality,"high");

  useExperienceStore.getState().adaptRendering(-1,"test");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"performance");
  assert.equal(useExperienceStore.getState().quality,"high");

  useExperienceStore.getState().adaptRendering(-1,"test");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"survival");
  assert.equal(useExperienceStore.getState().quality,"high");

  useExperienceStore.getState().adaptRendering(-1,"test");
  assert.equal(useExperienceStore.getState().renderGovernor.pressureStreak,1);
  assert.equal(useExperienceStore.getState().quality,"high");

  useExperienceStore.getState().adaptRendering(-1,"test");
  assert.equal(useExperienceStore.getState().quality,"medium");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"survival");

  useExperienceStore.getState().adaptRendering(1,"test");
  useExperienceStore.getState().adaptRendering(1,"test");
  useExperienceStore.getState().adaptRendering(1,"test");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"native");
  assert.equal(useExperienceStore.getState().quality,"medium");
  useExperienceStore.getState().adaptRendering(1,"test");
  assert.equal(useExperienceStore.getState().quality,"high");
});

test("manual quality is never overwritten by Render Governor pressure",()=>{
  const store=useExperienceStore.getState();
  store.setProfile("high","high");
  for(let i=0;i<8;i++) useExperienceStore.getState().adaptRendering(-1,"manual-test");
  assert.equal(useExperienceStore.getState().qualityMode,"high");
  assert.equal(useExperienceStore.getState().quality,"high");
  assert.equal(useExperienceStore.getState().renderGovernor.tier,"survival");
  useExperienceStore.getState().adaptRendering(0,"manual-fallback");
  assert.equal(useExperienceStore.getState().quality,"high");
  useExperienceStore.getState().setProfile("high","auto");
});
