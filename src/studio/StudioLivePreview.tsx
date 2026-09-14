'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { ExperienceConfigProvider } from '@/src/components/runtime/ExperienceConfigContext';
import { StudioEditorProvider, type StudioGizmoState } from '@/src/components/runtime/StudioEditorContext';
import { WebGLBoundary } from '@/src/components/runtime/WebGLBoundary';
import { CinematicMedia } from '@/src/components/dom/CinematicMedia';
import { CinematicTransitionLayers } from '@/src/components/dom/CinematicTransitionLayers';
import { getSceneIndex } from '@/src/lib/experience';
import { useExperienceStore } from '@/src/store/experienceStore';
import type { ExperienceConfig, QualityMode } from '@/src/types/experience';
import { sampleExperience } from '@/src/lib/sampleExperience';
import { StudioIcon } from './ui/StudioControls';
const SceneCanvas = dynamic(() => import('@/src/components/three/SceneCanvas').then(m => m.SceneCanvas), { ssr: false });
const HeliotStage = dynamic(() => import('@/src/experiences/heliot/HeliotStage').then(m => m.HeliotStage), { ssr: false });
type Viewport = 'desktop' | 'tablet' | 'mobile';

export function StudioLivePreview({ experience, active, setActive, progress: controlledProgress, onProgressChange, gizmo = null, children, viewport: controlledViewport, onViewportChange, compact = false, playing: controlledPlaying, onPlayingChange, duration = 30, guides = false, showCopy = true }: {
  experience: ExperienceConfig; active: number; setActive: (index: number) => void;
  progress?: number; onProgressChange?: (progress: number) => void; gizmo?: StudioGizmoState | null;
  children?: ReactNode; viewport?: Viewport; onViewportChange?: (viewport: Viewport) => void;
  compact?: boolean; playing?: boolean; onPlayingChange?: (value: boolean) => void; duration?: number; guides?: boolean; showCopy?: boolean;
}) {
  const [canRender, setCanRender] = useState<boolean | null>(null);
  const [internalProgress, setInternalProgress] = useState(() => midpoint(experience.scenes[active].range));
  const progress = controlledProgress ?? internalProgress;
  const [internalViewport, setInternalViewport] = useState<Viewport>('desktop');
  const viewport = controlledViewport ?? internalViewport;
  const [internalPlaying, setInternalPlaying] = useState(false);
  const playing = controlledPlaying ?? internalPlaying;
  const setPlaying = (value: boolean) => { setInternalPlaying(value); onPlayingChange?.(value); };
  const playingChange = useRef(onPlayingChange);
  useEffect(() => { playingChange.current = onPlayingChange; }, [onPlayingChange]);
  const progressRef = useRef(progress), changeRef = useRef(onProgressChange);
  const quality = useExperienceStore(s => s.qualityMode);
  const webgl = useExperienceStore(s => s.webglStatus);
  const stats = useExperienceStore(s => s.rendererStats);
  const free = useExperienceStore(s => s.freeCamera);
  const heliot = experience.meta.name.startsWith('HELIOT');
  useEffect(() => {
    const store = useExperienceStore.getState();
    const saved = { ceiling: store.deviceCeiling, quality: store.qualityMode, systemMotion: store.systemReducedMotion, override: store.motionOverride, debug: store.debug };
    // Enable the existing camera/renderer probes here, without mounting the public debug HUD.
    // Restore the previous diagnostics setting when leaving this preview.
    store.resetRuntimeOverrides(); store.setProfile('high', saved.quality); store.setReducedMotion(false); store.setDebug(true); store.setFreeCamera(false); store.setWebglStatus('loading');
    return () => { store.resetRuntimeOverrides(); store.setFreeCamera(false); store.setProfile(saved.ceiling, saved.quality); store.setSystemReducedMotion(saved.systemMotion); store.setReducedMotion(saved.override); store.setDebug(saved.debug); store.setWebglStatus('loading'); };
  }, []);
  useEffect(() => {
    // Detect unsupported WebGL before mounting R3F, keeping the authoring UI usable.
    const frame = requestAnimationFrame(() => {
      const probe = document.createElement('canvas');
      let supported = false;
      try { const context = probe.getContext('webgl2'); supported = Boolean(context); context?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { supported = false; }
      setCanRender(supported);
      if (!supported) useExperienceStore.getState().setWebglStatus('failed');
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { changeRef.current = onProgressChange; }, [onProgressChange]);
  useEffect(() => {
    const i = getSceneIndex(progress, experience);
    useExperienceStore.getState().setScrollState(progress, 0, 0, i);
    if (i !== active) setActive(i);
  }, [experience, progress, active, setActive]);
  useEffect(() => {
    if (!playing || free) return;
    let frame = 0, prior = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, progressRef.current + Math.min(now - prior, 100) / (Math.max(5, Math.min(120, duration)) * 1000));
      prior = now; progressRef.current = next;
      if (changeRef.current) changeRef.current(next); else setInternalProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick); else { setInternalPlaying(false); playingChange.current?.(false); }
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [playing, free, duration]);
  const seek = (value: number) => { const next = Math.max(0, Math.min(1, value)); progressRef.current = next; if (changeRef.current) changeRef.current(next); else setInternalProgress(next); };
  const aspect = viewport === 'mobile' ? 9 / 16 : viewport === 'tablet' ? 4 / 3 : 16 / 9;
  const sampled = sampleExperience(progress, false, experience, aspect);
  const copy = sampled.scene.copy;
  return <section className="studio-card studio-preview" aria-label="Live experience preview" data-compact={compact} data-runtime={heliot ? 'heliot' : 'forge'}>
    {!compact && <div className="studio-card__head"><div><span>{heliot ? 'HELIOT PRODUCTION WORLD' : 'PRODUCTION RUNTIME'}</span><h2 id="live-preview-title">Live experience preview</h2></div><output data-status={webgl}>{webgl}</output></div>}
    <div className="studio-preview__toolbar">
      <div role="group" aria-label="Preview viewport">{(['desktop','tablet','mobile'] as const).map(size => <button key={size} aria-pressed={viewport === size} onClick={() => { setInternalViewport(size); onViewportChange?.(size); }}><StudioIcon name={size}/><span>{size}</span></button>)}</div>
      <label>Quality<select aria-label="Preview quality" value={quality} onChange={e => useExperienceStore.getState().setQuality(e.target.value as QualityMode)}><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <span className="pro-render-stats" data-testid="studio-render-stats" data-calls={stats.calls} data-triangles={stats.triangles}>{webgl === 'failed' ? '3D preview unavailable' : stats.calls > 0 ? `${stats.calls} calls / ${Math.round(stats.triangles / 1000)}k triangles` : 'Preparing scene...'}</span>
    </div>
    <div className="studio-preview__viewport" data-viewport={viewport}><div className="studio-preview__canvas">
      <ExperienceConfigProvider value={experience}><StudioEditorProvider value={gizmo}>
        {canRender && <WebGLBoundary>{heliot ? <HeliotStage>{children}</HeliotStage> : <SceneCanvas>{children}</SceneCanvas>}</WebGLBoundary>}
        <CinematicMedia /><CinematicTransitionLayers />
      </StudioEditorProvider></ExperienceConfigProvider>
      {(canRender === false || webgl === 'failed') && <div className="pro-still-preview" data-testid="studio-still-preview">
        {/* This is explicitly a still reference, never represented as the live scene. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {heliot && <img src="/models/heliot/observatory-landscape.webp" alt="HELIOT environment reference"/>}
        <div><StudioIcon name="camera" size={22}/><strong>Still reference / 3D unavailable</strong><p>This browser cannot render WebGL. Scene configuration, snapshots, and export remain available. Use a WebGL-capable browser for camera and object manipulation.</p></div>
      </div>}
      {guides && <div className="pro-composition-guides" aria-hidden="true"><i/><i/><b/><b/></div>}
      {!free && showCopy && canRender !== false && webgl !== 'failed' && <div className="studio-preview__copy" style={{ pointerEvents: 'none', opacity: sampled.motion.copy.opacity, translate: `0 ${sampled.motion.copy.y}px`, filter: `blur(${sampled.motion.copy.blur}px)` } as CSSProperties}><span>{copy.eyebrow}</span><strong>{copy.headline}</strong></div>}
    </div></div>
    {!compact && <><div className="studio-preview__transport"><button disabled={free} onClick={() => { if (progress >= 1) seek(0); setPlaying(!playing); }}>{playing && !free ? 'Pause' : 'Play'}</button><output>{progress.toFixed(3)}</output><input aria-label="Live preview progress" type="range" min={0} max={1} step={.001} value={progress} onChange={e => { setPlaying(false); seek(Number(e.target.value)); }} /></div>
    <div className="studio-preview__scenes" role="list" aria-label="Preview scenes">{experience.scenes.map((s,i) => <button role="listitem" key={s.id} className={active === i ? 'is-active' : ''} onClick={() => { setPlaying(false); setActive(i); seek(midpoint(s.range)); }}><small>{String(i+1).padStart(2,'0')}</small>{s.label}</button>)}</div></>}
  </section>;
}
function midpoint(range: [number, number]) { return (range[0] + range[1]) / 2; }
