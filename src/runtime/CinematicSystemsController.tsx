"use client";
import { useEffect, useRef } from "react";
import { cinematicSystems } from "@/src/lib/cinematic/config";
import { forgeTicker } from "@/src/lib/cinematic/ticker";
import { SpringValue } from "@/src/lib/cinematic/spring";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicStore, type PointerTrailPoint } from "@/src/store/cinematicStore";

export function CinematicSystemsController(){
  const reduced=useExperienceStore(s=>s.reducedMotion),pointerConfig=cinematicSystems.defaults.pointer,springConfig=cinematicSystems.defaults.spring;
  const target=useRef(0),spring=useRef(new SpringValue(0)),pointer=useRef({x:0,y:0,time:0,dwellStart:0,pointerType:"mouse",pressure:0}),down=useRef(false),active=useRef(false);
  const trail=useRef<Array<PointerTrailPoint&{born:number}>>([]);

  useEffect(()=>{const state=useExperienceStore.getState();target.current=state.runtimeProgress??state.progress;spring.current.snap(target.current);return useExperienceStore.subscribe(next=>{target.current=next.runtimeProgress??next.progress;});},[]);

  useEffect(()=>{
    const publish=(now:number,vx=0,vy=0,speed=0,pressure=pointer.current.pressure)=>{
      const dwell=Math.min(1,Math.max(0,now-pointer.current.dwellStart)/Math.max(1,pointerConfig.dwellMs));
      const trailEnergy=Math.min(1,speed/pointerConfig.velocityClamp+trail.current.length/Math.max(1,pointerConfig.trailLength)*.2);
      useCinematicStore.getState().setPointerSignal({
        x:pointer.current.x,y:pointer.current.y,velocityX:vx,velocityY:vy,speed,pressure,dwell,trailEnergy,
        pointerType:pointer.current.pointerType,down:down.current,active:active.current,lastMoveAt:pointer.current.time,
      },trail.current.map(point=>({x:point.x,y:point.y,age:Math.min(1,(now-point.born)/650)})));
    };
    const move=(event:PointerEvent)=>{
      const now=performance.now(),x=event.clientX/Math.max(1,window.innerWidth)*2-1,y=-(event.clientY/Math.max(1,window.innerHeight)*2-1),dt=Math.max(8,now-pointer.current.time)/1000,dx=(x-pointer.current.x)/dt,dy=(y-pointer.current.y)/dt,distance=Math.hypot(x-pointer.current.x,y-pointer.current.y);
      if(distance>.018)pointer.current.dwellStart=now;
      pointer.current={x,y,time:now,dwellStart:pointer.current.dwellStart||now,pointerType:event.pointerType||"mouse",pressure:event.pressure||0};
      active.current=true;
      if(pointerConfig.trailLength){trail.current.push({x,y,age:0,born:now});if(trail.current.length>pointerConfig.trailLength)trail.current.splice(0,trail.current.length-pointerConfig.trailLength);}
      const clamp=pointerConfig.velocityClamp,vx=Math.max(-clamp,Math.min(clamp,dx)),vy=Math.max(-clamp,Math.min(clamp,dy)),speed=Math.min(clamp,Math.hypot(vx,vy));
      publish(now,vx,vy,speed,event.pressure||0);
    };
    const pointerDown=(event:PointerEvent)=>{down.current=true;active.current=true;pointer.current.pointerType=event.pointerType||pointer.current.pointerType;pointer.current.pressure=event.pressure||pointer.current.pressure;publish(performance.now());};
    const pointerUp=()=>{down.current=false;publish(performance.now());};
    const pointerCancel=()=>{down.current=false;active.current=false;publish(performance.now());};
    const pointerOut=(event:PointerEvent)=>{if(event.relatedTarget===null){active.current=false;down.current=false;publish(performance.now());}};
    const blur=()=>{active.current=false;down.current=false;publish(performance.now());};

    window.addEventListener("pointermove",move,{passive:true});
    window.addEventListener("pointerdown",pointerDown,{passive:true});
    window.addEventListener("pointerup",pointerUp,{passive:true});
    window.addEventListener("pointercancel",pointerCancel,{passive:true});
    window.addEventListener("pointerout",pointerOut,{passive:true});
    window.addEventListener("blur",blur);
    return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerdown",pointerDown);window.removeEventListener("pointerup",pointerUp);window.removeEventListener("pointercancel",pointerCancel);window.removeEventListener("pointerout",pointerOut);window.removeEventListener("blur",blur);};
  },[pointerConfig]);

  useEffect(()=>{if(reduced){spring.current.snap(target.current);useCinematicStore.getState().setSpring(target.current,0);return;}return forgeTicker.subscribe(delta=>{const value=spring.current.step(target.current,delta,springConfig);useCinematicStore.getState().setSpring(value,spring.current.velocity);});},[reduced,springConfig]);
  return null;
}
