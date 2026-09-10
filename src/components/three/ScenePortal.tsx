"use client";
import type { ReactNode } from "react";
import { MeshPortalMaterial } from "@react-three/drei";
import type { Vec3 } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
// A real offscreen destination scene. GlassPortal remains the separate glass-threshold primitive.
export function ScenePortal({children,position=[0,0,-2],rotation=[0,0,0],size=[2.8,3.8,1],blend=0}:{children:ReactNode;position?:Vec3;rotation?:Vec3;size?:Vec3;blend?:number}){
 const quality=useExperienceStore(s=>s.quality),motion=useExperienceStore(s=>s.reducedMotion);
 return <mesh position={position} rotation={rotation} scale={size}><planeGeometry args={[1,1]}/>{quality==='low'||motion?<meshBasicMaterial color="#1c3540"/>:<MeshPortalMaterial blur={0} blend={Math.max(0,Math.min(1,blend))} resolution={quality==='high'?512:256} events={false}>{children}</MeshPortalMaterial>}</mesh>;
}
