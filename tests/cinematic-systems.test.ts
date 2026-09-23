import test from "node:test";
import assert from "node:assert/strict";
import raw from "../config/cinematic-systems.json" with { type: "json" };
import { parseCinematicSystems } from "../src/lib/cinematic/schema";
import { stepSpring } from "../src/lib/cinematic/spring";
import { sampleStack } from "../src/lib/cinematic/stack";
import { generateHalftonePoints } from "../src/lib/cinematic/procedural";
import { sampleDiagram } from "../src/lib/cinematic/diagrams";
import experience from "../config/experience.json" with { type: "json" };
import { cursorRevealIdleDecay, resolveCursorRevealBackend, shouldInjectCursorReveal } from "../src/lib/cinematic/cursorReveal";
import { resolveVisualPhysicsBackend, sampleSceneTransition, visualPhysicsCost } from "../src/lib/cinematic/visualPhysics";
import { cinematicPresets } from "../src/lib/cinematic/presets";

test("cinematic manifest covers exactly the experience's scenes",()=>{
  const parsed=parseCinematicSystems(raw);
  assert.equal(parsed.version,1);
  const configured=parsed.scenes.map(scene=>scene.id).sort();
  const authored=experience.scenes.map(scene=>scene.id).sort();
  assert.deepEqual(configured,authored);
  assert.equal(new Set(configured).size,configured.length);
});
test("spring converges deterministically",()=>{const config=parseCinematicSystems(raw).defaults.spring;let state={value:0,velocity:0};for(let i=0;i<240;i++)state=stepSpring(state,1,1/60,config);assert.ok(Math.abs(state.value-1)<.002);assert.ok(Math.abs(state.velocity)<.01);});
test("stack sampling is reverse-safe",()=>{const config={enabled:true,scaleTo:.9,darkenTo:.55,depth:80,overlap:.2,pin:true};const forward=sampleStack(.37,config),reverse=sampleStack(.37,config);assert.deepEqual(forward,reverse);assert.ok(forward.scale<1&&forward.scale>.9);});
test("halftone generator supports KIMI-class 8004 point fields",()=>{const scene=parseCinematicSystems(raw).scenes.find(item=>item.procedural.some(system=>system.kind==="halftone"));assert.ok(scene);const field=scene.procedural.find(item=>item.kind==="halftone");assert.ok(field&&field.kind==="halftone");if(field&&field.kind==="halftone")assert.equal(generateHalftonePoints(field).length,8004);});
test("diagram reveal progresses without mutating geometry",()=>{const scene=parseCinematicSystems(raw).scenes.find(item=>item.diagram);assert.ok(scene?.diagram);const diagram=scene.diagram;const early=sampleDiagram(diagram,.2),late=sampleDiagram(diagram,.8);assert.equal(early.points.length,late.points.length);assert.ok(late.draw>early.draw);});
test("diagram rejects dangling edges",()=>{const broken=structuredClone(raw);const carrier=broken.scenes.find((scene)=>scene.diagram);assert.ok(carrier?.diagram);carrier.diagram.edges.push({from:"missing",to:carrier.diagram.points[0].id});assert.throws(()=>parseCinematicSystems(broken));});
test("depth and normal spatial modes require their production maps",()=>{const parsed=parseCinematicSystems({version:1,defaults:{spring:{mass:1,stiffness:180,damping:24,precision:.001,maxStep:1/30},pointer:{trailLength:24,smoothing:.18,velocityClamp:4,dwellMs:350},reducedMotion:"minimal"},scenes:[{id:"hero",spatial:{mode:"depth-relight",depthMap:"/textures/reference/depth.png",normalMap:"/textures/reference/normal.png",planes:[],pointerResponse:.2,scrollResponse:.1,depthStrength:30,relightStrength:.6,focus:.5},procedural:[],occlusion:[]}]});assert.equal(parsed.scenes[0].spatial?.mode,"depth-relight");assert.throws(()=>parseCinematicSystems({version:1,defaults:{spring:{mass:1,stiffness:180,damping:24,precision:.001,maxStep:1/30},pointer:{trailLength:24,smoothing:.18,velocityClamp:4,dwellMs:350},reducedMotion:"minimal"},scenes:[{id:"hero",spatial:{mode:"depth-relight",planes:[],pointerResponse:.2,scrollResponse:.1,depthStrength:30,relightStrength:.6,focus:.5},procedural:[],occlusion:[]}]}));});


test("cursor reveal supports lens, persistent trail and GPU fluid policy",()=>{
  const parsed=parseCinematicSystems({
    version:1,
    defaults:{spring:{mass:1,stiffness:180,damping:24,precision:.001,maxStep:1/30},pointer:{trailLength:24,smoothing:.18,velocityClamp:4,dwellMs:350},reducedMotion:"minimal"},
    scenes:[{id:"hero",cursorReveal:{src:"/textures/reference/reveal-field.svg",mode:"fluid"},procedural:[],occlusion:[]}],
  });
  const config=parsed.scenes[0].cursorReveal;
  assert.ok(config);
  assert.equal(config.mode,"fluid");
  assert.equal(config.touch,"drag");
  assert.equal(resolveCursorRevealBackend(config,{quality:"high",webgl2:true,floatTargets:true,reducedMotion:false}),"webgl-fluid");
  assert.equal(resolveCursorRevealBackend(config,{quality:"high",webgl2:true,floatTargets:false,reducedMotion:false}),"webgl-trail");
  assert.equal(resolveCursorRevealBackend(config,{quality:"low",webgl2:true,floatTargets:true,reducedMotion:false}),"canvas");
  assert.equal(shouldInjectCursorReveal(config,{pointerType:"touch",down:false,active:true}),false);
  assert.equal(shouldInjectCursorReveal(config,{pointerType:"touch",down:true,active:true}),true);
  assert.equal(cursorRevealIdleDecay(config,config.lingerMs,1/60),1);
  assert.ok(cursorRevealIdleDecay(config,config.lingerMs+1000,1/60)<1);
});


test("visual physics parses warp, refraction and shader transitions with deterministic fallback",()=>{
  const parsed=parseCinematicSystems({
    version:1,
    defaults:{spring:{mass:1,stiffness:180,damping:24,precision:.001,maxStep:1/30},pointer:{trailLength:24,smoothing:.18,velocityClamp:4,dwellMs:350},reducedMotion:"minimal"},
    scenes:[{id:"hero",warp:{mode:"water"},refraction:{mode:"liquid"},sceneTransition:{effect:"pixel",range:[.7,1]},procedural:[],occlusion:[]}],
  });
  const scene=parsed.scenes[0];
  assert.equal(scene.warp?.mode,"water");
  assert.equal(scene.warp?.strength,.38);
  assert.equal(scene.refraction?.dispersion,.008);
  assert.equal(scene.sceneTransition?.blockSize,24);
  assert.equal(resolveVisualPhysicsBackend({quality:"high",webgl2:true,reducedMotion:false}),"webgl");
  assert.equal(resolveVisualPhysicsBackend({quality:"low",webgl2:true,reducedMotion:false}),"fallback");
  assert.equal(resolveVisualPhysicsBackend({quality:"high",webgl2:true,reducedMotion:true}),"fallback");
  assert.deepEqual(sampleSceneTransition(scene.sceneTransition!,0.5),{progress:0,active:false,complete:false});
  assert.ok(Math.abs(sampleSceneTransition(scene.sceneTransition!,0.85).progress-.5)<1e-9);
  assert.deepEqual(sampleSceneTransition(scene.sceneTransition!,1),{progress:1,active:false,complete:true});
  assert.equal(visualPhysicsCost(scene),"heavy");
});


test("visual physics presets compile as first-class scene systems",()=>{
  const warp=cinematicPresets.warpSurface("hero");
  const refract=cinematicPresets.refractiveSurface("hero");
  const transition=cinematicPresets.shaderTransition("hero","/textures/reference/reveal-field.svg");
  const stack=cinematicPresets.visualPhysics("hero");
  assert.equal(warp.warp?.mode,"elastic");
  assert.equal(refract.refraction?.mode,"liquid");
  assert.equal(transition.sceneTransition?.effect,"liquid");
  assert.ok(stack.warp&&stack.refraction&&stack.sceneTransition);
  const parsed=parseCinematicSystems({version:1,defaults:{spring:{mass:1,stiffness:180,damping:24,precision:.001,maxStep:1/30},pointer:{trailLength:24,smoothing:.18,velocityClamp:4,dwellMs:350},reducedMotion:"minimal"},scenes:[stack]});
  assert.equal(parsed.scenes[0].warp?.mode,"water");
  assert.equal(parsed.scenes[0].refraction?.mode,"lens");
  assert.equal(parsed.scenes[0].sceneTransition?.effect,"chromatic");
});

test("visual physics respects device fallback policy and transition windows",()=>{
  assert.equal(resolveVisualPhysicsBackend({quality:"high",webgl2:true,reducedMotion:false}),"webgl");
  assert.equal(resolveVisualPhysicsBackend({quality:"low",webgl2:true,reducedMotion:false}),"fallback");
  assert.equal(resolveVisualPhysicsBackend({quality:"high",webgl2:false,reducedMotion:false}),"fallback");
  assert.equal(resolveVisualPhysicsBackend({quality:"high",webgl2:true,reducedMotion:true}),"fallback");
  const transition=cinematicPresets.shaderTransition("hero").sceneTransition;
  assert.ok(transition);
  if(!transition)return;
  assert.equal(sampleSceneTransition(transition,.4).progress,0);
  assert.equal(sampleSceneTransition(transition,1).progress,1);
  assert.equal(sampleSceneTransition(transition,.86).active,true);
});

test("visual physics cost flags stacked high-cost effects",()=>{
  const scene=cinematicPresets.visualPhysics("hero");
  assert.equal(visualPhysicsCost(scene),"heavy");
  assert.equal(visualPhysicsCost({warp:cinematicPresets.warpSurface("hero").warp}),"light");
});
