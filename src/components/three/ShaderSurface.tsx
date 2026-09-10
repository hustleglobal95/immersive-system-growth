"use client";
import { useMemo,useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color,type ShaderMaterial } from "three";
import { portalVertex,portalFragment } from "@/src/shaders/portal";
import { dissolveVertex,dissolveFragment } from "@/src/shaders/dissolve";
import { useExperienceStore } from "@/src/store/experienceStore";
export function ShaderSurface({effect="portal",progress=0}:{effect?:"portal"|"dissolve";progress?:number}){
 const material=useRef<ShaderMaterial>(null);
 const uniforms=useMemo(()=>({uTime:{value:0},uProgress:{value:0},uA:{value:new Color('#42cbd1')},uB:{value:new Color('#d079fc')},uColor:{value:new Color('#e99c55')}}),[]);
 useFrame((_,delta)=>{const m=material.current;if(!m)return;if(!useExperienceStore.getState().reducedMotion)m.uniforms.uTime.value+=Math.min(delta,.1);m.uniforms.uProgress.value=Math.min(1,Math.max(0,progress));});
 return <mesh><planeGeometry args={[1.5,1.5,16,16]}/><shaderMaterial ref={material} uniforms={uniforms} vertexShader={effect==='portal'?portalVertex:dissolveVertex} fragmentShader={effect==='portal'?portalFragment:dissolveFragment} transparent={effect==='portal'} depthWrite={effect!=='portal'} toneMapped={false}/></mesh>;
}
