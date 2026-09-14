import test from "node:test";
import assert from "node:assert/strict";
import raw from "../config/cinematic-systems.json" with { type: "json" };
import { parseCinematicSystems } from "../src/lib/cinematic/schema";
import { stepSpring } from "../src/lib/cinematic/spring";
import { sampleStack } from "../src/lib/cinematic/stack";
import { generateHalftonePoints } from "../src/lib/cinematic/procedural";
import { sampleDiagram } from "../src/lib/cinematic/diagrams";

test("cinematic manifest validates",()=>{const parsed=parseCinematicSystems(raw);assert.equal(parsed.version,1);assert.ok(parsed.scenes.length>=8);});
test("spring converges deterministically",()=>{const config=parseCinematicSystems(raw).defaults.spring;let state={value:0,velocity:0};for(let i=0;i<240;i++)state=stepSpring(state,1,1/60,config);assert.ok(Math.abs(state.value-1)<.002);assert.ok(Math.abs(state.velocity)<.01);});
test("stack sampling is reverse-safe",()=>{const config={enabled:true,scaleTo:.9,darkenTo:.55,depth:80,overlap:.2,pin:true};const forward=sampleStack(.37,config),reverse=sampleStack(.37,config);assert.deepEqual(forward,reverse);assert.ok(forward.scale<1&&forward.scale>.9);});
test("halftone generator supports KIMI-class 8004 point fields",()=>{const scene=parseCinematicSystems(raw).scenes.find(item=>item.id==="parti")!;const field=scene.procedural.find(item=>item.kind==="halftone");assert.ok(field&&field.kind==="halftone");if(field&&field.kind==="halftone")assert.equal(generateHalftonePoints(field).length,8004);});
test("diagram reveal progresses without mutating geometry",()=>{const scene=parseCinematicSystems(raw).scenes.find(item=>item.id==="studio")!;assert.ok(scene.diagram);const early=sampleDiagram(scene.diagram!,.2),late=sampleDiagram(scene.diagram!,.8);assert.equal(early.points.length,late.points.length);assert.ok(late.draw>early.draw);});
test("diagram rejects dangling edges",()=>{const broken=structuredClone(raw);const studio=broken.scenes.find((scene:any)=>scene.id==="studio");studio.diagram.edges.push({from:"missing",to:"court"});assert.throws(()=>parseCinematicSystems(broken));});
