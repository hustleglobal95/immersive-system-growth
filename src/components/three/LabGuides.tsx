"use client";
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { ShaderSurface } from "@/src/components/three/ShaderSurface";
import { ScenePortal } from "@/src/components/three/ScenePortal";
export function LabGuides(){const experience=useExperienceConfig();const lines=useMemo(()=>experience.scenes.map(s=>Array.from({length:33},(_,i)=>sampleExperience(s.range[0]+(s.range[1]-s.range[0])*i/32,false,experience).camera.position)),[experience]);
 return <group>{lines.map((points,i)=><Line key={i} points={points} color={i%2?'#d993f9':'#69d7d8'} lineWidth={2}/>)}<group position={[-3,2,0]}><ShaderSurface effect="portal"/></group><group position={[0,2,0]}><ShaderSurface effect="dissolve" progress={.4}/></group><ScenePortal position={[3,2,0]} size={[1.5,1.5,1]}><color attach="background" args={['#152135']}/><ambientLight intensity={2}/><mesh><icosahedronGeometry args={[.6,1]}/><meshStandardMaterial color="#efb06a"/></mesh></ScenePortal></group>;
}
