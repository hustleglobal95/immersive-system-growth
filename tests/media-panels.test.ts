import test from "node:test";
import assert from "node:assert/strict";
import { sampleMediaPanel, type PanelWindow } from "../src/lib/mediaPanels";
import { sceneMediaSchema } from "../src/lib/configSchema";

const window:PanelWindow={start:.5,end:1,enterStart:.375,exitStart:1,first:false,last:true,direction:"up",zoom:1.08};
test("incoming media reaches exact frame and reverses without history",()=>{
  assert.equal(sampleMediaPanel(.375,window).panelY,100);
  assert.equal(sampleMediaPanel(.5,window).panelY,0);
  assert.equal(sampleMediaPanel(1,window).visible,true);
  assert.equal(sampleMediaPanel(.3,window).visible,false);
  const samples=[.38,.44,.5,1,.5,.44,.38].map(p=>sampleMediaPanel(p,window));
  assert.deepEqual(samples[0],samples[6]);assert.deepEqual(samples[1],samples[5]);
  assert(sampleMediaPanel(.4,window,true).scale<=1.04);
});
test("overlapping panels cover the viewport for both travel directions",()=>{
  for(const direction of ["up","down"] as const) for(let i=0;i<=100;i++){
    const p=.375+i/100*.125;
    const a=sampleMediaPanel(p,{...window,start:0,end:.5,enterStart:0,exitStart:.375,first:true,last:false,exitDirection:direction});
    const b=sampleMediaPanel(p,{...window,direction});
    const intervals=[a,b].filter(s=>s.visible).map(s=>[s.panelY,s.panelY+100]).sort((x,y)=>x[0]-y[0]);
    assert(intervals[0][0]<=0);let end=intervals[0][1];for(const interval of intervals.slice(1)){assert(interval[0]<=end+.000001);end=Math.max(end,interval[1]);}assert(end>=100-.000001);
  }
});
test("media config requires safe source, video poster and bounded art direction",()=>{
  assert(sceneMediaSchema.safeParse({kind:"image",src:"/textures/test.jpg",alt:"Product"}).success);
  assert(!sceneMediaSchema.safeParse({kind:"video",src:"/video/test.mp4",alt:"Product"}).success);
  assert(!sceneMediaSchema.safeParse({kind:"image",src:"javascript:alert(1)",alt:"Product"}).success);
  assert(!sceneMediaSchema.safeParse({kind:"image",src:"/textures/test.jpg",alt:"Product",overlap:.9}).success);
});
test("media transition presets sample deterministic reveal properties",()=>{
  for(const transition of ["slide","curtain","zoom","dissolve","wipe"] as const){
    const a=sampleMediaPanel(.44,{...window,transition});
    const b=sampleMediaPanel(.44,{...window,transition});
    assert.deepEqual(a,b);
    assert(a.opacity>=0&&a.opacity<=1);
    assert(a.clip>=0&&a.clip<=100);
  }
});
