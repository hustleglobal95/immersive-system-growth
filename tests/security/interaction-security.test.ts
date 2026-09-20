import assert from "node:assert/strict";
import test from "node:test";
import { parseInteractionGraph } from "../../src/lib/interactionGraph";
import { createInteractionSnapshot, runInteractionEvent } from "../../src/lib/interactionGraphEngine";
import { parseInteractionEventInput, parseInteractionUrlValueInput } from "../../src/lib/interactionEventSecurity";

const graph=parseInteractionGraph({
  version:1,
  id:"security-test",
  initialState:"idle",
  states:["idle","opened"],
  variables:{},
  nodes:[
    {id:"trigger",kind:"trigger",label:"Trigger",position:{x:0,y:0},event:"custom",name:"open-panel",states:[]},
    {id:"state",kind:"state",label:"Opened",position:{x:1,y:0},state:"opened"},
  ],
  edges:[{id:"edge",from:"trigger",to:"state",branch:"always",priority:0}],
  mobileSubstitutions:[],
});

test("malicious XSS interaction input is rejected before graph actions execute",()=>{
  const malicious={
    type:"custom",
    name:"open-panel",
    payload:{source:"<img src=x onerror=alert(1)>",href:"javascript:alert(1)"},
  };
  assert.equal(parseInteractionEventInput(malicious),null);

  const result=runInteractionEvent(
    graph,
    createInteractionSnapshot(graph),
    malicious as never,
    {quality:"high",reducedMotion:false},
  );
  assert.equal(result.state,"idle");
  assert.equal(result.effects.length,0);
  assert.equal(result.matchedTriggers.length,0);
  assert.equal(result.halted,true);
  assert.match(result.trace[0]?.detail ?? "","Rejected invalid interaction event");
});

test("raycast targets and payloads are strictly bounded",()=>{
  const valid=parseInteractionEventInput({
    type:"drag",
    target:"rig:Rotor",
    payload:{x:.2,y:-.3,worldX:2,worldY:1,worldZ:0,dx:3,dy:-2,pressure:.5,pointerType:"mouse"},
  });
  assert.ok(valid);
  assert.equal(valid.target,"rig:Rotor");

  assert.equal(parseInteractionEventInput({
    type:"drag",
    target:"rig:Rotor",
    payload:{dx:1,dy:2,innerHTML:"<script>alert(1)</script>"},
  }),null);

  assert.equal(parseInteractionEventInput({
    type:"click",
    target:"rig:<script>alert(1)</script>",
  }),null);
});

test("malicious URL fragments and parameters are rejected",()=>{
  assert.equal(parseInteractionUrlValueInput("javascript:alert(1)"),null);
  assert.equal(parseInteractionUrlValueInput("#<img-onerror=alert(1)>"),null);
  assert.equal(parseInteractionUrlValueInput("scene=arrival&mode=detail"),"scene=arrival&mode=detail");
});
