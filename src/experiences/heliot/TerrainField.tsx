'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Group, LineBasicMaterial } from 'three';
import { useCinematicFrame } from '@/src/components/three/CinematicFrame';
import { useExperienceStore } from '@/src/store/experienceStore';

// A deterministic spatial surface: the maquette returns to an inhabited field.
// Low tier halves line density; no per-frame allocation or independent ticker.
export function TerrainField(){
  const frame=useCinematicFrame();
  const quality=useExperienceStore(s=>s.quality);
  const group=useRef<Group>(null),material=useRef<LineBasicMaterial>(null);
  const geometry=useMemo(()=>{
    const positions:number[]=[];
    const height=(x:number,z:number)=>Math.sin(x*.48+z*.2)*.24+Math.cos(z*.72)*.17+Math.exp(-((x+4)**2+(z+3)**2)/12)*2.5;
    const rows=quality==='low'?28:56,columns=80;
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const z=-12+row/(rows-1)*24,x=-14+col/columns*28,n=x+28/columns;
      positions.push(x,height(x,z)-1.9,z,n,height(n,z)-1.9,z);
    }
    const result=new BufferGeometry();result.setAttribute('position',new Float32BufferAttribute(positions,3));return result;
  },[quality]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{
    const p=frame.progress;
    const strength=Math.max(0,Math.min((p-.67)/.055,(.825-p)/.035,1));
    if(group.current)group.current.visible=strength>0&&!useExperienceStore.getState().reducedMotion;
    if(material.current)material.current.opacity=strength*.4;
  });
  return <group ref={group}><lineSegments geometry={geometry}><lineBasicMaterial ref={material} color="#aa9366" transparent depthWrite={false}/></lineSegments></group>;
}
