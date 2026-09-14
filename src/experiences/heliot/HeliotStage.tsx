'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
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
import { useExperienceConfig } from '@/src/components/runtime/ExperienceConfigContext';
import { useExperienceStore } from '@/src/store/experienceStore';
import { ObservatoryPlate } from './ObservatoryPlate';
import { apertureRadius, useLightLab } from './lightLab';
import { TerrainField } from './TerrainField';

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
    const text = 'H E L I O T   •   O B S E R V A T O R Y   /   0 0 1';
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
    // Labels stay with the named crown; its separation is sampled by the same rig sampler below.
    root.current.visible = p < .3 || p > .64;
    root.current.rotation.set(state.orbit.pitch, state.orbit.yaw, 0);
  });
  return <group ref={root}><mesh position={[0, 0, .527]}><planeGeometry args={[2.42, 2.42]} /><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} /></mesh></group>;
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
      group.current.scale.set(diameter, diameter, 1);
    }
    if (material.current) material.current.opacity = strength * .4;
    geometry.setDrawRange(0, Math.floor(Math.min(1, Math.max(0, (p - .35) / .08)) * 36) * 2);
  });
  return <group ref={group}><lineSegments geometry={geometry}><lineBasicMaterial ref={material} color="#d6a16b" transparent depthWrite={false} /></lineSegments></group>;
}

function Instrument() {
  const root = useRef<Group>(null);
  const diaphragm = useRef<Mesh>(null);
  const frame = useCinematicFrame();
  const aperture = useLightLab(s => s.aperture);
  const experience = useExperienceConfig();
  const quality = useExperienceStore(s => s.quality);
  const { gl, scene, camera } = useThree();
  useFrame(() => {
    if (root.current) {
      root.current.visible = !useExperienceStore.getState().reducedMotion && frame.progress > .285 && frame.progress < .815;
      root.current.scale.setScalar(1 - Math.max(0,Math.min(1,(frame.progress-.68)/.1))*.8);
      root.current.position.y = -1.25 * Math.max(0,Math.min(1,(frame.progress-.68)/.1));
    }
    if (diaphragm.current) diaphragm.current.visible = frame.progress >= .49 && frame.progress <= .61;
  });
  useEffect(() => {
    // Actual geometry + material readiness, followed by shader compilation and a render.
    let cancelled = false;
    gl.compileAsync(scene, camera).then(() => {
      if (!cancelled) { gl.render(scene, camera); document.documentElement.dataset.heliotReady = 'true'; }
    }).catch(() => useExperienceStore.getState().setWebglStatus('failed'));
    return () => { cancelled = true; delete document.documentElement.dataset.heliotReady; };
  }, [gl, scene, camera]);
  return <group ref={root}>
    <ProductRig url={quality === 'low' ? experience.heroLowModel! : experience.heroModel} rig={experience.productRig!} />
    <Engraving />
    <mesh ref={diaphragm} position={[0, 0, -.18]}><ringGeometry args={[apertureRadius(aperture), .86, 96]} /><meshStandardMaterial color="#49463d" metalness={.8} roughness={.38} side={2} /></mesh>
  </group>;
}

export function HeliotLoadingStatus() {
  const { active, progress, errors } = useProgress();
  const status = useExperienceStore(s => s.webglStatus);
  const failed = errors.length > 0 || status === 'failed' || status === 'lost';
  return <div className="heliot-readiness" role="status" aria-live="polite">
    <span className="heliot-readiness-dot" />{failed ? 'Still edition · all chapters available' : active ? `Developing the field · ${Math.round(progress)}%` : 'FIELD NOTES / 001'}
  </div>;
}

function PerformanceLedger() {
  const ledger = useRef({ frames: 0, maxCalls: 0, maxTriangles: 0, maxLines: 0 });
  const { gl } = useThree();
  useFrame(() => {
    const value = ledger.current;
    value.frames++;
    value.maxCalls = Math.max(value.maxCalls, gl.info.render.calls);
    value.maxTriangles = Math.max(value.maxTriangles, gl.info.render.triangles);
    value.maxLines = Math.max(value.maxLines, gl.info.render.lines);
    if (value.frames % 30 === 0) document.documentElement.dataset.heliotRenderBudget = JSON.stringify(value);
  }, -201);
  return null;
}

export function HeliotStage() {
  return <Canvas camera={{ position: [5, 3, 9], fov: 38, near: .05, far: 80 }} dpr={1} gl={{ antialias: true, powerPreference: 'high-performance' }} fallback={<span>The optical study remains available below.</span>}>
    <RendererLifecycle /><AdaptiveQuality /><RenderStatsProbe /><PerformanceLedger />
    <StudioEnvironment />
    <CinematicFrame>
      <WorldAtmosphere /><SceneLighting /><CameraRig />
      <Suspense fallback={null}><ObservatoryPlate /></Suspense>
      <Suspense fallback={null}><Instrument /></Suspense>
      <OpticalField />
      <TerrainField />
    </CinematicFrame>
  </Canvas>;
}
