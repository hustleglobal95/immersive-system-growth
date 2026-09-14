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
const SceneCanvas = dynamic(() => import('@/src/components/three/SceneCanvas').then(m => m.SceneCanvas), { ssr: false });
const HeliotStage = dynamic(() => import('@/src/experiences/heliot/HeliotStage').then(m => m.HeliotStage), { ssr: false });
type Viewport = 'desktop' | 'tablet' | 'mobile';

export function StudioLivePreview({ experience, active, setActive, progress: controlledProgress, onProgressChange, gizmo = null, children, viewport: controlledViewport, onViewportChange }: {
  experience: ExperienceConfig; active: number; setActive: (index: number) => void;
  progress?: number; onProgressChange?: (progress: number) => void; gizmo?: StudioGizmoState | null;
  children?: ReactNode; viewport?: Viewport; onViewportChange?: (viewport: Viewport) => void;
}) {
  const [internalProgress, setInternalProgress] = useState(() => midpoint(experience.scenes[active].range));
  const progress = controlledProgress ?? internalProgress;
  const [internalViewport, setInternalViewport] = useState<Viewport>('desktop');
  const viewport = controlledViewport ?? internalViewport;
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(progress), changeRef = useRef(onProgressChange);
  const quality = useExperienceStore(s => s.qualityMode);
  const webgl = useExperienceStore(s => s.webglStatus);
  const stats = useExperienceStore(s => s.rendererStats);
  const free = useExperienceStore(s => s.freeCamera);
  const heliot = experience.meta.name.startsWith('HELIOT');
  useEffect(() => {
    const store = useExperienceStore.getState();
    const saved = { ceiling: store.deviceCeiling, quality: store.qualityMode, systemMotion: store.systemReducedMotion, override: store.motionOverride, debug: store.debug };
    store.resetRuntimeOverrides(); store.setProfile('high', 'high'); store.setReducedMotion(false); store.setDebug(false); store.setFreeCamera(false); store.setWebglStatus('loading');
    return () => { store.resetRuntimeOverrides(); store.setFreeCamera(false); store.setProfile(saved.ceiling, saved.quality); store.setSystemReducedMotion(saved.systemMotion); store.setReducedMotion(saved.override); store.setDebug(saved.debug); store.setWebglStatus('loading'); };
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
      const next = Math.min(1, progressRef.current + Math.min(now - prior, 100) / 18000);
      prior = now; progressRef.current = next;
      if (changeRef.current) changeRef.current(next); else setInternalProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick); else setPlaying(false);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [playing, free]);
  const seek = (value: number) => { const next = Math.max(0, Math.min(1, value)); progressRef.current = next; if (changeRef.current) changeRef.current(next); else setInternalProgress(next); };
  const aspect = viewport === 'mobile' ? 9 / 16 : viewport === 'tablet' ? 4 / 3 : 16 / 9;
  const sampled = sampleExperience(progress, false, experience, aspect);
  const copy = sampled.scene.copy;
  return <section className="studio-card studio-preview" aria-labelledby="live-preview-title" data-runtime={heliot ? 'heliot' : 'forge'}>
    <div className="studio-card__head"><div><span>{heliot ? 'HELIOT PRODUCTION WORLD' : 'PRODUCTION RUNTIME'}</span><h2 id="live-preview-title">Live experience preview</h2></div><output data-status={webgl}>{webgl}</output></div>
    <div className="studio-preview__toolbar">
      <div role="group" aria-label="Preview viewport">{(['desktop','tablet','mobile'] as const).map(size => <button key={size} aria-pressed={viewport === size} onClick={() => { setInternalViewport(size); onViewportChange?.(size); }}>{size}</button>)}</div>
      <label>Quality<select aria-label="Preview quality" value={quality} onChange={e => useExperienceStore.getState().setQuality(e.target.value as QualityMode)}><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <span>{stats.calls} calls / {stats.triangles.toLocaleString()} triangles</span>
    </div>
    <div className="studio-preview__viewport" data-viewport={viewport}><div className="studio-preview__canvas">
      <ExperienceConfigProvider value={experience}><StudioEditorProvider value={gizmo}>
        <WebGLBoundary>{heliot ? <HeliotStage>{children}</HeliotStage> : <SceneCanvas>{children}</SceneCanvas>}</WebGLBoundary>
        <CinematicMedia /><CinematicTransitionLayers />
      </StudioEditorProvider></ExperienceConfigProvider>
      {!free && <div className="studio-preview__copy" style={{ pointerEvents: 'none', opacity: sampled.motion.copy.opacity, translate: `0 ${sampled.motion.copy.y}px`, filter: `blur(${sampled.motion.copy.blur}px)` } as CSSProperties}><span>{copy.eyebrow}</span><strong>{copy.headline}</strong></div>}
    </div></div>
    <div className="studio-preview__transport"><button disabled={free} onClick={() => { if (progress >= 1) seek(0); setPlaying(!playing); }}>{playing && !free ? 'Pause' : 'Play'}</button><output>{progress.toFixed(3)}</output><input aria-label="Live preview progress" type="range" min={0} max={1} step={.001} value={progress} onChange={e => { setPlaying(false); seek(Number(e.target.value)); }} /></div>
    <div className="studio-preview__scenes" role="list" aria-label="Preview scenes">{experience.scenes.map((s,i) => <button role="listitem" key={s.id} className={active === i ? 'is-active' : ''} onClick={() => { setPlaying(false); setActive(i); seek(midpoint(s.range)); }}><small>{String(i+1).padStart(2,'0')}</small>{s.label}</button>)}</div>
  </section>;
}
function midpoint(range: [number, number]) { return (range[0] + range[1]) / 2; }
