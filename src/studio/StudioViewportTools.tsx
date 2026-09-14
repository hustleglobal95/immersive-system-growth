'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Raycaster, Vector2, type Object3D, type Mesh } from 'three';
import type { Vec3 } from '@/src/types/experience';

/** Select the first visible surface only: never click an asset through a wall. */
export function StudioViewportTools({ onSelect, points = [], onPointSelect, selectedPoint = -1 }: {
  onSelect?: (target: string) => void; points?: Vec3[]; onPointSelect?: (index: number) => void; selectedPoint?: number;
}) {
  const { gl, scene, camera, invalidate, get } = useThree();
  const down = useRef<{ x: number; y: number } | null>(null);
  const raycaster = useMemo(() => new Raycaster(), []);
  useEffect(() => {
    const canvas = gl.domElement;
    const start = (e: PointerEvent) => { if (e.button === 0) down.current = { x: e.clientX, y: e.clientY }; };
    const up = (e: PointerEvent) => {
      const startPoint = down.current; down.current = null;
      if (!startPoint || Math.hypot(e.clientX - startPoint.x, e.clientY - startPoint.y) > 4 || !onSelect) return;
      const box = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new Vector2((e.clientX - box.left) / box.width * 2 - 1, -(e.clientY - box.top) / box.height * 2 + 1), camera);
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        const mesh = hit.object as Mesh;
        if (!mesh.isMesh) continue;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (materials.every(m => m.transparent && m.opacity < .12)) continue;
        let object: Object3D | null = hit.object, target: string | undefined, visible = true, helper = false;
        while (object) { visible &&= object.visible; helper ||= Boolean(object.userData.studioHelper) || object.type.startsWith('TransformControls'); target ??= object.userData.studioTarget; object = object.parent; }
        if (!visible) continue;
        if (helper) return;
        if (target) onSelect(target);
        return;
      }
    };
    const cancel = () => { down.current = null; };
    canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel);
    return () => { canvas.removeEventListener('pointerdown', start); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); };
  }, [camera, gl, onSelect, raycaster, scene]);
  useEffect(() => {
    const frameSelection=(event: Event)=>{
      const data=(event as CustomEvent<{position:Vec3;radius:number}>).detail;
      if(!data||!data.position?.every(Number.isFinite)||!Number.isFinite(data.radius))return;
      const distance=Math.max(1,data.radius)*3;
      camera.position.set(data.position[0]+distance*.7,data.position[1]+distance*.45,data.position[2]+distance);
      camera.lookAt(...data.position);
      const controls=get().controls as unknown as {target?:{set:(...p:Vec3)=>void};update?:()=>void}|null;
      controls?.target?.set(...data.position);controls?.update?.();invalidate();
    };
    window.addEventListener('forge:frame-selection',frameSelection);return()=>window.removeEventListener('forge:frame-selection',frameSelection);
  },[camera,get,invalidate]);
  useEffect(() => { invalidate(); }, [points, selectedPoint, invalidate]);
  if (points.length < 2) return null;
  return <group userData={{ studioHelper: true }}>
    <Line points={points} color="#e3b06c" lineWidth={1.5} />
    {points.map((point, i) => <mesh key={i} position={point} onPointerDown={e => { e.stopPropagation(); onPointSelect?.(i); }}>
      <sphereGeometry args={[i === selectedPoint ? .12 : .08, 12, 8]} /><meshBasicMaterial color={i === selectedPoint ? '#ffffff' : '#e3b06c'} depthTest={false} />
    </mesh>)}
  </group>;
}
