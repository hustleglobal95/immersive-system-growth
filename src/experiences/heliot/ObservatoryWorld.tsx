'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, useGLTF, useTexture } from '@react-three/drei';
import { BackSide, DoubleSide, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, InstancedMesh, Object3D, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import { createPassageCurve } from './flightGeometry';
import { useCinematicFrame } from '@/src/components/three/CinematicFrame';
import { useExperienceStore } from '@/src/store/experienceStore';

export function terrainHeight(x:number,z:number){
  const r=Math.hypot(x,z);
  const edge=Math.max(0,Math.min(1,(r-8)/20));
  return -1.28+(Math.sin(x*.24+Math.sin(z*.17)*2)*Math.cos(z*.21)*.22+Math.sin(x*.53-z*.32)*.08)*edge;
}

function stoneTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!,data=ctx.createImageData(256,256);let seed=47;
  for(let i=0;i<data.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=100+(seed%65);data.data.set([n,n-4,n-11,255],i);}
  ctx.putImageData(data,0,0);const texture=new CanvasTexture(canvas);texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(12,12);texture.colorSpace=SRGBColorSpace;return texture;
}

function BasaltTerrain(){
  const quality=useExperienceStore(s=>s.quality);
  const geometry=useMemo(()=>{
    const n=quality==='low'?80:128,positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
    const color=new Color();
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
      const x=(i/n-.5)*110,z=(j/n-.5)*110,y=terrainHeight(x,z);
      positions.push(x,y,z);uvs.push(i/n*20,j/n*20);const shade=.10+(Math.sin(x*1.9+z*.8)*Math.cos(z*2.7)+1)*.012;
      color.setRGB(shade,shade,shade*.95);colors.push(color.r,color.g,color.b);
    }
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=((i+.5)/n-.5)*110,z=((j+.5)/n-.5)*110;
      // The entrance and gallery are hollow architectural space, not solid terrain.
      if(Math.abs(x)<1.5&&z<-.7&&z>-6.3)continue;
      if(Math.abs(x)<4.2&&z>=-1.5&&z<10.5)continue;
      const a=j*(n+1)+i;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);
    }
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(positions,3));result.setAttribute('uv',new Float32BufferAttribute(uvs,2));result.setAttribute('color',new Float32BufferAttribute(colors,3));result.setIndex(indices);result.computeVertexNormals();return result;
  },[quality]);
  const source=useTexture('/models/heliot/basalt.webp');
  const texture=useMemo(()=>{const t=source.clone();t.wrapS=t.wrapT=RepeatWrapping;t.colorSpace=SRGBColorSpace;t.needsUpdate=true;return t;},[source]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh geometry={geometry} receiveShadow><meshLambertMaterial vertexColors map={texture}/></mesh>;
}

function RockField(){
  const texture=useTexture('/models/heliot/basalt.webp');
  const mesh=useRef<InstancedMesh>(null);const quality=useExperienceStore(s=>s.quality);const count=quality==='low'?100:200;
  useEffect(()=>{
    if(!mesh.current)return;const dummy=new Object3D();let seed=98;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<count;i++){
      let x=(random()-.5)*70;const z=(random()-.5)*70;
      if(Math.abs(x)<9&&z<1&&z>-18)x=Math.sign(x||1)*(10+random()*12);
      if(Math.abs(x)<3&&z>0&&z<14)x=Math.sign(x||1)*(4+random()*8);
      const size=.08+random()**3*.85;
      dummy.position.set(x,terrainHeight(x,z)+size*.25,z);dummy.rotation.set(random()*2,random()*6,random());dummy.scale.set(size*(1+random()),size*.6,size);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate=true;
  },[count]);
  return <instancedMesh ref={mesh} args={[undefined,undefined,count]} receiveShadow><dodecahedronGeometry args={[1,1]}/><meshStandardMaterial color="#262b29" map={texture} roughness={.95}/></instancedMesh>;
}

function Gateway(){
  const quality=useExperienceStore(s=>s.quality);
  const gltf=useGLTF(quality==='low'?'/models/heliot/heliot-01-low.glb':'/models/heliot/heliot-01.glb');
  const scene=useMemo(()=>{const clone=gltf.scene.clone(true);clone.traverse(o=>{o.castShadow=true;o.receiveShadow=true;});return clone;},[gltf.scene]);
  return <primitive object={scene}/>;
}

function Gallery(){
  const texture=useMemo(()=>stoneTexture(),[]);useEffect(()=>()=>texture.dispose(),[texture]);
  const interior=useRef<Group>(null);const frame=useCinematicFrame();
  useFrame(()=>{if(interior.current)interior.current.visible=frame.progress>.165&&frame.progress<.785;});
  const fins=useRef<InstancedMesh>(null);
  useEffect(()=>{
    if(!fins.current)return;const dummy=new Object3D();
    for(let i=0;i<120;i++){const a=i/120*Math.PI*2;dummy.position.set(Math.cos(a)*.99,Math.sin(a)*.99,-.65);dummy.rotation.set(0,0,a);dummy.updateMatrix();fins.current.setMatrixAt(i,dummy.matrix);}fins.current.instanceMatrix.needsUpdate=true;
  },[]);
  return <group>
    <instancedMesh ref={fins} args={[undefined,undefined,120]} castShadow><boxGeometry args={[.18,.012,1.7]}/><meshStandardMaterial color="#947041" roughness={.4} metalness={.82}/></instancedMesh>
    <group ref={interior} position={[0,-5.5,-8]}>
    <mesh position={[0,-1.22,-8.7]} receiveShadow><boxGeometry args={[16,.12,14.5]}/><meshStandardMaterial color="#494a41" roughness={.78} map={texture}/></mesh>
    <mesh position={[0,4.2,-8]} castShadow><boxGeometry args={[16,.35,16]}/><meshStandardMaterial color="#39382f" roughness={.95} map={texture}/></mesh>
    {[-8,8].map(x=><mesh key={x} position={[x,1.5,-8]} castShadow><boxGeometry args={[.4,5.7,16]}/><meshStandardMaterial color="#514e42" roughness={.9} map={texture}/></mesh>)}
    <mesh position={[0,1.5,-16]}><boxGeometry args={[16,5.7,.4]}/><meshStandardMaterial color="#292c28" roughness={.9}/></mesh>
    {[-6,-3,0,3,6].map(x=><group key={x} position={[x,0,0]}>
      <mesh position={[0,4,-8]}><boxGeometry args={[.075,.12,15]}/><meshStandardMaterial color="#e0c395" emissive="#f2bd69" emissiveIntensity={2}/></mesh>
      <mesh position={[0,-1.145,-8]}><boxGeometry args={[.013,.005,15]}/><meshBasicMaterial color="#c6a475"/></mesh>
    </group>)}
    {[-3,-6,-9,-12,-15].map(z=><group key={z}>
      <mesh position={[0,-1.2,z]} scale={[8,5.2,1]}><torusGeometry args={[1,.018,6,64,Math.PI]}/><meshStandardMaterial color="#4a493a" metalness={.6} roughness={.4}/></mesh>
      {[-7.6,7.6].map(x=><mesh key={x} position={[x,1.4,z]}><boxGeometry args={[.22,5.3,.22]}/><meshStandardMaterial color="#272d2a" roughness={.5} metalness={.5}/></mesh>)}
    </group>)}
    <pointLight position={[0,3,-8]} color="#edc590" intensity={32} distance={18} decay={2}/>
    <mesh position={[0,-1,-8]}><cylinderGeometry args={[1.45,1.55,.35,96]}/><meshStandardMaterial color="#343c36" metalness={.45} roughness={.45}/></mesh>
    <mesh position={[0,-.81,-8]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.42,1.44,96]}/><meshBasicMaterial color="#e3bf79"/></mesh>
    </group>
    <mesh position={[0,-1.12,4]} receiveShadow><boxGeometry args={[.6,.12,10]}/><meshStandardMaterial color="#827a66" roughness={.7}/></mesh>
    {[-.32,.32].map(x=><mesh key={x} position={[x,-1.052,4]}><boxGeometry args={[.009,.006,10]}/><meshBasicMaterial color="#d4b875"/></mesh>)}
  </group>;
}

function DescentPassage(){
  const path=useMemo(()=>createPassageCurve(),[]);
  const ribs=useRef<InstancedMesh>(null);
  useEffect(()=>{if(!ribs.current)return;const dummy=new Object3D(),axis=new Vector3(0,0,1);for(let i=0;i<48;i++){const t=i/47;dummy.position.copy(path.getPointAt(t));dummy.quaternion.setFromUnitVectors(axis,path.getTangentAt(t));dummy.updateMatrix();ribs.current.setMatrixAt(i,dummy.matrix);}ribs.current.instanceMatrix.needsUpdate=true;},[path]);
  return <group>
    <mesh><tubeGeometry args={[path,100,1.07,48,false]}/><meshStandardMaterial color="#302d25" metalness={.55} roughness={.5} side={DoubleSide}/></mesh>
    <instancedMesh ref={ribs} args={[undefined,undefined,48]}><torusGeometry args={[1.035,.018,5,48]}/><meshStandardMaterial color="#a78047" emissive="#725024" emissiveIntensity={.25} metalness={.7} roughness={.4}/></instancedMesh>
    <pointLight position={[0,-2.2,-4.8]} color="#edb979" intensity={8} distance={8}/>
  </group>;
}

function DistantLandscape(){
  const texture=useTexture('/models/heliot/distant-landscape.webp');
  return <mesh position={[0,-30,0]}><cylinderGeometry args={[90,90,180,96,1,true,Math.PI/2,Math.PI]}/><meshBasicMaterial map={texture} side={BackSide} toneMapped={false}/></mesh>;
}

export function ObservatoryWorld(){
  const frame=useCinematicFrame();const water=useRef<Group>(null);
  useFrame(()=>{if(water.current)water.current.visible=frame.progress<.2||frame.progress>.77;});
  return <>
    <Sky distance={450} sunPosition={[35,8,-45]} inclination={.1} azimuth={.25} turbidity={7} rayleigh={1.2} mieCoefficient={.012} mieDirectionalG={.88}/>
    <DistantLandscape/><BasaltTerrain/><RockField/><Gateway/><DescentPassage/><Gallery/>
    <group ref={water}>
      <group position={[0,-2.38,0]} scale={[1,-1,1]}><Gateway/></group>
      <mesh position={[0,-1.19,4.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[8,12]}/><meshStandardMaterial transparent opacity={.63} color="#263631" roughness={.18} metalness={.7} depthWrite={false}/></mesh>
      <mesh position={[0,-3.9,4.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[8.4,12.4]}/><meshStandardMaterial color="#17211d" roughness={.5}/></mesh>
    </group>
  </>;
}
