'use client';

import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, Group, LineBasicMaterial, Mesh, PMREMGenerator, SRGBColorSpace } from 'three';
import { CinematicFrame, useCinematicFrame } from '@/src/components/three/CinematicFrame';
import { CameraRig } from '@/src/components/three/CameraRig';
import { ProductRig } from '@/src/components/three/ProductRig';
import { SceneLighting } from '@/src/components/three/SceneLighting';
import { WorldAtmosphere } from '@/src/components/three/WorldAtmosphere';
import { RendererLifecycle } from '@/src/components/three/RendererLifecycle';
import { AdaptiveQuality } from '@/src/components/three/AdaptiveQuality';
import { RenderStatsProbe } from '@/src/components/three/RenderStatsProbe';
import { SceneAssets } from '@/src/components/three/SceneAssets';
import { LabOrbitControls } from '@/src/components/three/LabOrbitControls';
import { useStudioEditor } from '@/src/components/runtime/StudioEditorContext';
import { useExperienceConfig } from '@/src/components/runtime/ExperienceConfigContext';
import { useExperienceStore } from '@/src/store/experienceStore';
import { apertureRadius, useLightLab } from './lightLab';
import { ObservatoryWorld } from './ObservatoryWorld';
import { CinematicRealism } from './CinematicRealism';
import { needsDemandFrame } from './demandFrame';
import { cinematicRenderProfile } from '@/src/lib/renderProfile';
const StudioTransformGizmo = lazy(() => import('@/src/components/three/StudioTransformGizmo').then(m => ({ default: m.StudioTransformGizmo })));

function StudioEnvironment() {
  const { gl } = useThree();
  const environment = useMemo(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, .04);
    room.dispose(); generator.dispose();
    return target;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  return <primitive object={environment.texture} attach="environment" />;
}
function Engraving() {
  const root = useRef<Group>(null);
  const frame = useCinematicFrame();
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(512, 512); ctx.fillStyle = '#ded8cb'; ctx.font = '500 29px monospace'; ctx.textAlign = 'center';
    const text = 'H E L I O T   \u2022   O B S E R V A T O R Y   /   0 0 1';
    [...text].forEach((letter, i) => {
      const angle = -.92 + i / (text.length - 1) * 1.84;
      ctx.save(); ctx.rotate(angle); ctx.fillText(letter, 0, -455); ctx.restore();
    });
    ctx.font = '24px monospace'; ctx.fillText('FIELD ASSEMBLY', 0, 474);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    if (!root.current) return;
    const state = useExperienceStore.getState();
    const p = state.reducedMotion ? 0 : frame.progress;
    root.current.visible = p < .3 || p > .64;
    const pose = frame.current.hero;
    root.current.position.set(...pose.position); root.current.scale.setScalar(pose.scale);
    root.current.rotation.set(pose.rotation[0] + state.orbit.pitch, pose.rotation[1] + state.orbit.yaw, pose.rotation[2]);
  });
  return <group ref={root} position={[0,-5.05,-16]}><mesh position={[0, 0, .527]}><planeGeometry args={[2.42, 2.42]} /><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} /></mesh></group>;
}
function OpticalField() {
  const frame = useCinematicFrame();
  const group = useRef<Group>(null);
  const material = useRef<LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (let j = 0; j < 12; j++) {
      const a = j / 12 * Math.PI * 2;
      const points = [[Math.cos(a) * 1.5, Math.sin(a) * 1.5, 6], [Math.cos(a) * .86, Math.sin(a) * .86, 3.65], [Math.cos(a) * .5, Math.sin(a) * .5, .65], [0, 0, -4.7]];
      for (let k = 0; k < points.length - 1; k++) positions.push(...points[k], ...points[k + 1]);
    }
    const result = new BufferGeometry(); result.setAttribute('position', new Float32BufferAttribute(positions, 3)); return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const p = frame.progress;
    const strength = Math.max(0, Math.min((p - .35) / .06, (.59 - p) / .07, 1));
    if (group.current) {
      group.current.visible = strength > 0 && !useExperienceStore.getState().reducedMotion;
      const diameter = p > .49 ? 1.4 / useLightLab.getState().aperture : 1;
      const pose = frame.current.hero;
      group.current.position.set(...pose.position); group.current.rotation.set(...pose.rotation);
      group.current.scale.set(diameter * pose.scale, diameter * pose.scale, pose.scale);
    }
    if (material.current) material.current.opacity = strength * .4;
    geometry.setDrawRange(0, Math.floor(Math.min(1, Math.max(0, (p - .35) / .08)) * 36) * 2);
  });
  return <group ref={group} position={[0,-5.05,-16]}><lineSegments geometry={geometry}><lineBasicMaterial ref={material} color="#d6a16b" transparent depthWrite={false} /></lineSegments></group>;
}
function Instrument() {
  const root = useRef<Group>(null);
  const diaphragm = useRef<Mesh>(null);
  const diaphragmRig = useRef<Group>(null);
  const frame = useCinematicFrame();
  const aperture = useLightLab(s => s.aperture);
  const experience = useExperienceConfig();
  const quality = useExperienceStore(s => s.quality);
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    if (root.current) root.current.visible = true;
    if (diaphragmRig.current) {
      const pose = frame.current.hero, orbit = useExperienceStore.getState().orbit;
      diaphragmRig.current.position.set(...pose.position); diaphragmRig.current.scale.setScalar(pose.scale);
      diaphragmRig.current.rotation.set(pose.rotation[0] + orbit.pitch, pose.rotation[1] + orbit.yaw, pose.rotation[2]);
    }
    if (diaphragm.current) diaphragm.current.visible = frame.progress >= .49 && frame.progress <= .61;
  });
  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera).then(() => {
      if (!cancelled) { gl.render(scene, camera); document.documentElement.dataset.heliotReady = 'true'; }
    }).catch(() => useExperienceStore.getState().setWebglStatus('failed'));
    return () => { cancelled = true; delete document.documentElement.dataset.heliotReady; };
  }, [gl, scene, camera]);
  return <group ref={root} userData={{ studioTarget: 'hero' }}>
    <ProductRig url={quality === 'low' ? experience.heroLowModel! : experience.heroModel} rig={experience.productRig!} />
    <Engraving />
    <group ref={diaphragmRig}><mesh ref={diaphragm} position={[0, 0, -.18]}><ringGeometry args={[apertureRadius(aperture), .86, 96]} /><meshStandardMaterial color="#49463d" metalness={.8} roughness={.38} side={2} /></mesh></group>
  </group>;
}
export function HeliotLoadingStatus() {
  const { active, progress, errors } = useProgress();
  const status = useExperienceStore(s => s.webglStatus);
  const failed = errors.length > 0 || status === 'failed' || status === 'lost';
  return <div className="heliot-readiness" role="status" aria-live="polite"><span className="heliot-readiness-dot" />{failed ? 'Still edition \u00b7 all chapters available' : active ? `Developing the field \u00b7 ${Math.round(progress)}%` : 'FIELD NOTES / 001'}</div>;
}
function PerformanceLedger() {
  const ledger = useRef({ frames: 0, maxCalls: 0, maxTriangles: 0, maxLines: 0 });
  const { gl } = useThree();
  useFrame(() => {
    const value = ledger.current;
    value.frames++; value.maxCalls = Math.max(value.maxCalls, gl.info.render.calls); value.maxTriangles = Math.max(value.maxTriangles, gl.info.render.triangles); value.maxLines = Math.max(value.maxLines, gl.info.render.lines);
    document.documentElement.dataset.heliotRenderBudget = JSON.stringify(value);
  }, -201);
  return null;
}
function FrameDemand() {
  const {invalidate,camera}=useThree();const frame=useCinematicFrame();
  useEffect(()=>{const off=useExperienceStore.subscribe((next, previous)=>{if(needsDemandFrame(next,previous))invalidate();});const offLab=useLightLab.subscribe(()=>invalidate());invalidate();return()=>{off();offLab();};},[invalidate]);
  useFrame(()=>{const state=useExperienceStore.getState();document.documentElement.dataset.heliotCamera=JSON.stringify(camera.position.toArray());if(Math.abs(frame.progress-(state.runtimeProgress??state.progress))>.000001)invalidate();});
  return null;
}
export function HeliotStage({ children }: { children?: ReactNode } = {}) {
  const quality=useExperienceStore(s=>s.quality);
  const governorTier=useExperienceStore(s=>s.renderGovernor.tier);
  const profile=cinematicRenderProfile(quality,governorTier);
  const editor = useStudioEditor();
  return <Canvas frameloop="demand" shadows={profile.shadows} camera={{ position: [5, 2.2, 8], fov: 43, near: .025, far: 450 }} dpr={1} gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<span>The optical study remains available below.</span>}>
    <RendererLifecycle /><AdaptiveQuality /><RenderStatsProbe /><PerformanceLedger /><StudioEnvironment />
    <CinematicFrame>
      <WorldAtmosphere /><SceneLighting /><CameraRig banking /><LabOrbitControls /><FrameDemand />
      <Suspense fallback={null}><ObservatoryWorld /><CinematicRealism /><Instrument /></Suspense>
      <SceneAssets />{children}
      {editor && <Suspense fallback={null}><StudioTransformGizmo /></Suspense>}
      <OpticalField />
    </CinematicFrame>
  </Canvas>;
}
