'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, Group, LineBasicMaterial, PMREMGenerator, SRGBColorSpace } from 'three';
import { CinematicFrame, useCinematicFrame } from '@/src/components/three/CinematicFrame';
import { CameraRig } from '@/src/components/three/CameraRig';
import { ProductRig } from '@/src/components/three/ProductRig';
import { SceneLighting } from '@/src/components/three/SceneLighting';
import { WorldAtmosphere } from '@/src/components/three/WorldAtmosphere';
import { RendererLifecycle } from '@/src/components/three/RendererLifecycle';
import { AdaptiveQuality } from '@/src/components/three/AdaptiveQuality';
import { RenderStatsProbe } from '@/src/components/three/RenderStatsProbe';
import { useExperienceConfig } from '@/src/components/runtime/ExperienceConfigContext';
import { useExperienceStore } from '@/src/store/experienceStore';

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
    const text = 'H E L I O T   •   0 1   /   O P T I C A L   S T U D Y';
    [...text].forEach((letter, i) => {
      const angle = -.92 + i / (text.length - 1) * 1.84;
      ctx.save(); ctx.rotate(angle); ctx.fillText(letter, 0, -455); ctx.restore();
    });
    ctx.font = '24px monospace'; ctx.fillText('35 / 1.4', 0, 474);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    if (!root.current) return;
    const state = useExperienceStore.getState();
    const p = state.reducedMotion ? 0 : frame.progress;
    // Labels stay with the named crown; its separation is sampled by the same rig sampler below.
    root.current.visible = p < .3 || p > .64;
    root.current.rotation.set(state.orbit.pitch, state.orbit.yaw, 0);
  });
  return <group ref={root}><mesh position={[0, 0, 1.264]}><planeGeometry args={[2.42, 2.42]} /><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} /></mesh></group>;
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
    if (group.current) group.current.visible = strength > 0 && !useExperienceStore.getState().reducedMotion;
    if (material.current) material.current.opacity = strength * .4;
    geometry.setDrawRange(0, Math.floor(Math.min(1, Math.max(0, (p - .35) / .08)) * 36) * 2);
  });
  return <group ref={group}><lineSegments geometry={geometry}><lineBasicMaterial ref={material} color="#d6a16b" transparent depthWrite={false} /></lineSegments></group>;
}

function Instrument() {
  const experience = useExperienceConfig();
  const quality = useExperienceStore(s => s.quality);
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    // Actual geometry + material readiness, followed by shader compilation and a render.
    let cancelled = false;
    gl.compileAsync(scene, camera).then(() => {
      if (!cancelled) { gl.render(scene, camera); document.documentElement.dataset.heliotReady = 'true'; }
    }).catch(() => useExperienceStore.getState().setWebglStatus('failed'));
    return () => { cancelled = true; delete document.documentElement.dataset.heliotReady; };
  }, [gl, scene, camera]);
  return <>
    <ProductRig url={quality === 'low' ? experience.heroLowModel! : experience.heroModel} rig={experience.productRig!} />
    <Engraving />
  </>;
}

export function HeliotLoadingStatus() {
  const { active, progress, errors } = useProgress();
  const status = useExperienceStore(s => s.webglStatus);
  const failed = errors.length > 0 || status === 'failed' || status === 'lost';
  return <div className="heliot-readiness" role="status" aria-live="polite">
    <span className="heliot-readiness-dot" />{failed ? 'Still edition · all chapters available' : active ? `Preparing optics · ${Math.round(progress)}%` : 'Optical study / 01'}
  </div>;
}

export function HeliotStage() {
  return <Canvas camera={{ position: [5, 3, 9], fov: 38, near: .05, far: 80 }} dpr={1} gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<span>The optical study remains available below.</span>}>
    <RendererLifecycle /><AdaptiveQuality /><RenderStatsProbe />
    <StudioEnvironment />
    <CinematicFrame>
      <WorldAtmosphere /><SceneLighting /><CameraRig />
      <Suspense fallback={null}><Instrument /></Suspense>
      <OpticalField />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.1, 0]}><planeGeometry args={[150, 150]} /><meshBasicMaterial color="#151719" /></mesh>
      {[2.4, 3, 4, 6].map(radius => <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.095, 0]}><ringGeometry args={[radius, radius + .009, 128]} /><meshBasicMaterial color="#8f9c9e" transparent opacity={.12} depthWrite={false} /></mesh>)}
    </CinematicFrame>
  </Canvas>;
}
