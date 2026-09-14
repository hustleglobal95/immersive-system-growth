"use client";
import { useEffect, useRef } from "react";
import { cinematicSystems } from "@/src/lib/cinematic/config";
import { forgeTicker } from "@/src/lib/cinematic/ticker";
import { SpringValue } from "@/src/lib/cinematic/spring";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicStore, type PointerTrailPoint } from "@/src/store/cinematicStore";
export function CinematicSystemsController(){
  const reduced=useExperienceStore(s=>s.reducedMotion),pointerConfig=cinematicSystems.defaults.pointer,springConfig=cinematicSystems.defaults.spring;
  const target=useRef(0),spring=useRef(new SpringValue(0)),pointer=useRef({x:0,y:0,time:0,dwellStart:0});
  const trail=useRef<Array<PointerTrailPoint&{born:number}>>([]);
  useEffect(()=>{const state=useExperienceStore.getState();target.current=state.runtimeProgress??state.progress;spring.current.snap(target.current);return useExperienceStore.subscribe(next=>{target.current=next.runtimeProgress??next.progress;});},[]);
  useEffect(()=>{const move=(event:PointerEvent)=>{const now=performance.now(),x=event.clientX/Math.max(1,window.innerWidth)*2-1,y=-(event.clientY/Math.max(1,window.innerHeight)*2-1),dt=Math.max(8,now-pointer.current.time)/1000,dx=(x-pointer.current.x)/dt,dy=(y-pointer.current.y)/dt,distance=Math.hypot(x-pointer.current.x,y-pointer.current.y);if(distance>.018)pointer.current.dwellStart=now;pointer.current={x,y,time:now,dwellStart:pointer.current.dwellStart||now};if(pointerConfig.trailLength){trail.current.push({x,y,age:0,born:now});if(trail.current.length>pointerConfig.trailLength)trail.current.splice(0,trail.current.length-pointerConfig.trailLength);}const clamp=pointerConfig.velocityClamp,vx=Math.max(-clamp,Math.min(clamp,dx)),vy=Math.max(-clamp,Math.min(clamp,dy)),speed=Math.min(clamp,Math.hypot(vx,vy)),dwell=Math.min(1,Math.max(0,now-pointer.current.dwellStart)/Math.max(1,pointerConfig.dwellMs)),trailEnergy=Math.min(1,speed/clamp+trail.current.length/Math.max(1,pointerConfig.trailLength)*.2);useCinematicStore.getState().setPointerSignal({x,y,velocityX:vx,velocityY:vy,speed,pressure:event.pressure||0,dwell,trailEnergy},trail.current.map(point=>({x:point.x,y:point.y,age:Math.min(1,(now-point.born)/650)})));};window.addEventListener("pointermove",move,{passive:true});return()=>window.removeEventListener("pointermove",move);},[pointerConfig]);
  useEffect(()=>{if(reduced){spring.current.snap(target.current);useCinematicStore.getState().setSpring(target.current,0);return;}return forgeTicker.subscribe(delta=>{const value=spring.current.step(target.current,delta,springConfig);useCinematicStore.getState().setSpring(value,spring.current.velocity);});},[reduced,springConfig]);
  return null;
}
