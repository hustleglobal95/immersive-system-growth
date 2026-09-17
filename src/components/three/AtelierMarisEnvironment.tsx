"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Group, ShaderMaterial } from "three";
import { useCasaSurfaces } from "@/src/components/three/materials/CasaLumenSurfaces";
import { useExperienceStore } from "@/src/store/experienceStore";

const SKY_VERTEX = `varying vec3 vWorld; void main(){ vec4 world=modelMatrix*vec4(position,1.0); vWorld=normalize(world.xyz); gl_Position=projectionMatrix*viewMatrix*world; }`;
const SKY_FRAGMENT = `uniform float uProgress; varying vec3 vWorld; void main(){ float band=pow(1.-abs(vWorld.y),4.5); vec3 dayTop=vec3(.22,.42,.62),dayHorizon=vec3(.88,.79,.66); vec3 duskTop=vec3(.055,.075,.12),duskHorizon=vec3(.62,.34,.20); float dusk=smoothstep(.70,1.,uProgress); gl_FragColor=vec4(mix(mix(dayTop,duskTop,dusk),mix(dayHorizon,duskHorizon,dusk),band*.82),1.); }`;
const WATER_VERTEX = `uniform float uTime; varying float vWave; varying vec2 vUv; void main(){ vec3 p=position; float w=sin((p.x+uTime*.33)*.72)*.025+cos((p.y-uTime*.22)*1.08)*.018; p.z+=w; vWave=w; vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const WATER_FRAGMENT = `uniform float uProgress; varying float vWave; varying vec2 vUv; void main(){ vec3 sea=mix(vec3(.06,.18,.24),vec3(.012,.05,.075),vUv.y); sea=mix(sea,vec3(.018,.035,.055),smoothstep(.7,1.,uProgress)*.75); float glint=smoothstep(.012,.04,abs(vWave)); gl_FragColor=vec4(sea+vec3(.72,.56,.38)*glint*.11,1.); }`;

function Olive({ position, scale=1, rotation=0 }:{position:[number,number,number];scale?:number;rotation?:number}){
  const leaves=useMemo(()=>Array.from({length:18},(_,i)=>({a:i*2.399,s:.38+(i%5)*.045,y:1.8+(i%6)*.18})),[]);
  return <group position={position} scale={scale} rotation={[0,rotation,0]}>
    <mesh castShadow position={[0,.92,0]} rotation={[0,0,.06]}><cylinderGeometry args={[.11,.18,1.9,8]}/><meshStandardMaterial color="#514333" roughness={.96}/></mesh>
    {leaves.map((l,i)=><mesh key={i} castShadow position={[Math.cos(l.a)*.72,l.y,Math.sin(l.a)*.62]} scale={[l.s,.22,l.s*.78]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color={i%3===0?"#61705b":"#495846"} roughness={.94}/></mesh>)}
  </group>;
}

function Villa(){
  const fins=useMemo(()=>Array.from({length:13},(_,i)=>-3.18+i*.53),[]);
  const surface=useCasaSurfaces();
  const stone=surface("stone",3), stoneFine=surface("stone",1.4), plaster=surface("plaster",2.5), oak=surface("oak",1.6), oakFine=surface("oak",1);
  return <group>
    {/* podium */}
    <mesh receiveShadow position={[0,-1.12,-.9]}><boxGeometry args={[10.8,.18,10.8]}/><meshStandardMaterial {...stone} color="#d9c8ac" roughness={.85}/></mesh>
    {/* stone planes */}
    <mesh castShadow receiveShadow position={[-3.8,.35,-1.5]}><boxGeometry args={[.48,3.45,7.2]}/><meshStandardMaterial {...plaster} color="#cdbb9f" roughness={.92} normalScale={[.6,.6]}/></mesh>
    <mesh castShadow receiveShadow position={[3.82,.35,-1.1]}><boxGeometry args={[.5,3.45,6.4]}/><meshStandardMaterial {...plaster} color="#d6c6a9" roughness={.9} normalScale={[.6,.6]}/></mesh>
    {/* oak roof plane */}
    <mesh castShadow position={[0,2.05,-1.25]}><boxGeometry args={[8.1,.28,6.9]}/><meshStandardMaterial {...oak} color="#9c7c58" roughness={.75}/></mesh>
    {/* honed stone interior floor */}
    <mesh receiveShadow position={[0,-.98,-1.45]}><boxGeometry args={[7.35,.12,6.0]}/><meshStandardMaterial {...stoneFine} color="#e2d6c2" roughness={.5} metalness={.02}/></mesh>
    {/* glass toward the bathing court */}
    <mesh position={[0,.35,-4.25]}><boxGeometry args={[7.1,2.8,.05]}/><meshPhysicalMaterial color="#cfe2e4" transparent opacity={.16} transmission={.74} roughness={.05} thickness={.2}/></mesh>
    {/* oak brise-soleil */}
    <group position={[0,.38,1.1]}>{fins.map((x,i)=><mesh key={i} castShadow position={[x,0,0]}><boxGeometry args={[.095,3.15,.33]}/><meshStandardMaterial {...oakFine} color={i%2?"#7b5b3e":"#8a6846"} roughness={.7}/></mesh>)}</group>
    {/* pool, coping and low furniture */}
    <mesh position={[0,-1.0,4.3]} receiveShadow><boxGeometry args={[7.8,.1,3.2]}/><meshPhysicalMaterial color="#286b76" roughness={.06} clearcoat={.9} clearcoatRoughness={.06} metalness={.06}/></mesh>
    <mesh position={[0,-.91,2.62]} receiveShadow><boxGeometry args={[8.2,.1,.16]}/><meshStandardMaterial {...stone} color="#e0d1b8" roughness={.8}/></mesh>
    <mesh castShadow position={[-1.4,-.8,-1.55]}><boxGeometry args={[2.5,.22,1.2]}/><meshStandardMaterial {...plaster} color="#e6ddd0" roughness={.96}/></mesh>
    <mesh castShadow position={[1.2,-.78,-1.4]}><boxGeometry args={[1.65,.25,.92]}/><meshStandardMaterial {...plaster} color="#e6ddd0" roughness={.96}/></mesh>
    {/* ceiling light slots so the interior chapters read under the roof */}
    <mesh position={[0,1.88,-.7]}><boxGeometry args={[5.4,.05,.14]}/><meshStandardMaterial color="#fff7ea" emissive="#ffeed4" emissiveIntensity={2.4} toneMapped={false}/></mesh>
    <mesh position={[0,1.88,-2.8]}><boxGeometry args={[5.4,.05,.14]}/><meshStandardMaterial color="#fff7ea" emissive="#ffeed4" emissiveIntensity={2.4} toneMapped={false}/></mesh>
    <pointLight position={[-.3,1.5,-1.5]} intensity={2.8} distance={10} decay={1.5} color="#ffe9cc"/>
    <pointLight position={[1.7,1.1,-3.0]} intensity={1.7} distance={6.5} decay={1.6} color="#fff2e0"/>
  </group>;
}

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
    <Villa/>
    <Olive position={[-4.7,-1.1,-1.6]} scale={1.05} rotation={.4}/><Olive position={[4.7,-1.1,1.2]} scale={.92} rotation={-.7}/><Olive position={[-5.6,-1.2,6.9]} scale={1.25} rotation={.2}/>
    <mesh position={[0,-1.2,9.2]} receiveShadow><boxGeometry args={[16,.3,2.2]}/><meshStandardMaterial color="#807565" roughness={1}/></mesh>
  </group>;
}
