"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Group, ShaderMaterial } from "three";
import { useExperienceStore } from "@/src/store/experienceStore";

const SKY_VERTEX = `varying vec3 vWorld; void main(){ vec4 world=modelMatrix*vec4(position,1.0); vWorld=normalize(world.xyz); gl_Position=projectionMatrix*viewMatrix*world; }`;
const SKY_FRAGMENT = `uniform float uProgress; varying vec3 vWorld; void main(){ float band=pow(1.-abs(vWorld.y),4.5); vec3 dayTop=vec3(.22,.42,.62),dayHorizon=vec3(.88,.79,.66); vec3 duskTop=vec3(.055,.075,.12),duskHorizon=vec3(.62,.34,.20); float dusk=smoothstep(.70,1.,uProgress); gl_FragColor=vec4(mix(mix(dayTop,duskTop,dusk),mix(dayHorizon,duskHorizon,dusk),band*.82),1.); }`;
const WATER_VERTEX = `uniform float uTime; varying float vWave; varying vec2 vUv; void main(){ vec3 p=position; float w=sin((p.x+uTime*.33)*.72)*.025+cos((p.y-uTime*.22)*1.08)*.018; p.z+=w; vWave=w; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const WATER_FRAGMENT = `uniform float uProgress; varying float vWave; varying vec2 vUv; void main(){ vec3 sea=mix(vec3(.06,.18,.24),vec3(.012,.05,.075),vUv.y); sea=mix(sea,vec3(.018,.035,.055),smoothstep(.7,1.,uProgress)*.75); float glint=smoothstep(.012,.04,abs(vWave)); gl_FragColor=vec4(sea+vec3(.72,.56,.38)*glint*.11,1.); }`;

/**
 * Casa Lumen is a photographic chapter sequence. The world behind it carries coastal light and
 * water only -- no massing stand-in. Placeholder architecture read as a grey-box model bleeding
 * through the plates, so the building lives in the photography until real GLB geometry exists.
 */
export function AtelierMarisEnvironment(){
  const sky=useRef<ShaderMaterial>(null),water=useRef<ShaderMaterial>(null),world=useRef<Group>(null);
  const reduced=useExperienceStore(s=>s.reducedMotion);
  useFrame(state=>{
    const store=useExperienceStore.getState(); const p=store.runtimeProgress ?? store.progress;
    if(sky.current) sky.current.uniforms.uProgress.value=p;
    if(water.current){ water.current.uniforms.uProgress.value=p; water.current.uniforms.uTime.value=reduced?0:state.clock.elapsedTime; }
    if(world.current) world.current.rotation.y=Math.sin(p*Math.PI)*.018;
  });
  return <group ref={world}>
    <mesh scale={[-1,1,1]}><sphereGeometry args={[75,32,24]}/><shaderMaterial ref={sky} side={BackSide} depthWrite={false} uniforms={{uProgress:{value:0}}} vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.35,13]}><planeGeometry args={[110,110,96,96]}/><shaderMaterial ref={water} uniforms={{uTime:{value:0},uProgress:{value:0}}} vertexShader={WATER_VERTEX} fragmentShader={WATER_FRAGMENT}/></mesh>
  </group>;
}
