'use client';
import dynamic from 'next/dynamic';
import { StudioIcon } from './pro/StudioIcon';
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
  const [showCopy,setShowCopy]=useState(true);
  const [showGuides,setShowGuides]=useState(false);
  const [rate,setRate]=useState(1);
  const [loop,setLoop]=useState(false);
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
    let preferred=saved.quality;
    try{const value=localStorage.getItem('forge-preview-quality');if(value&&['auto','low','medium','high'].includes(value))preferred=value as QualityMode;}catch{}
    store.resetRuntimeOverrides(); store.setProfile('high', preferred); store.setReducedMotion(false); store.setDebug(true); store.setFreeCamera(false); store.setWebglStatus('loading');
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
      const next = Math.min(1, progressRef.current + Math.min(now - prior, 100) * rate / 30000);
      prior = now; progressRef.current = next;
      if (changeRef.current) changeRef.current(next); else setInternalProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick); else if(loop){progressRef.current=0;if(changeRef.current)changeRef.current(0);else setInternalProgress(0);frame=requestAnimationFrame(tick);}else setPlaying(false);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [playing, free, rate, loop]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.code==='Space'&&!free&&!(e.target as HTMLElement).closest('input,textarea,select,button,[contenteditable=true]')&&!document.querySelector('dialog[open]')){e.preventDefault();if(progressRef.current>=1){progressRef.current=0;if(changeRef.current)changeRef.current(0);else setInternalProgress(0);}setPlaying(p=>!p);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[free]);
  const seek = (value: number) => { const next = Math.max(0, Math.min(1, value)); progressRef.current = next; if (changeRef.current) changeRef.current(next); else setInternalProgress(next); };
  const aspect = viewport === 'mobile' ? 9 / 16 : viewport === 'tablet' ? 4 / 3 : 16 / 9;
  const sampled = sampleExperience(progress, false, experience, aspect);
  const copy = sampled.scene.copy;
  return <section className="studio-card studio-preview" aria-labelledby="live-preview-title" data-runtime={heliot ? 'heliot' : 'forge'}>
    <div className="studio-card__head"><div><span>{heliot ? 'HELIOT PRODUCTION WORLD' : 'PRODUCTION RUNTIME'}</span><h2 id="live-preview-title">Live experience preview</h2></div><output data-status={webgl}>{webgl}</output></div>
    <div className="studio-preview__toolbar">
      <div role="group" aria-label="Preview viewport">{(['desktop','tablet','mobile'] as const).map(size => <button key={size} aria-pressed={viewport === size} onClick={() => { setInternalViewport(size); onViewportChange?.(size); }}><StudioIcon name={size} /><span>{size}</span></button>)}</div>
      <label>Quality<select aria-label="Preview quality" value={quality} onChange={e => {const quality=e.target.value as QualityMode;useExperienceStore.getState().setQuality(quality);try{localStorage.setItem('forge-preview-quality',quality);}catch{}}}><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <button aria-label="Toggle composition guides" title="Rule-of-thirds guides" aria-pressed={showGuides} onClick={()=>setShowGuides(!showGuides)}><StudioIcon name="grid" /></button><button aria-label="Toggle story overlay" title="Show or hide story text" aria-pressed={showCopy} onClick={()=>setShowCopy(!showCopy)}><StudioIcon name="text" /></button><span className="pro-render-budget" data-testid="studio-render-stats" data-calls={stats.calls} data-triangles={stats.triangles}>{stats.calls > 0 ? `${stats.calls} calls / ${stats.triangles.toLocaleString()} triangles` : 'Measuring scene...'}</span>
    </div>
    <div className="studio-preview__viewport" data-viewport={viewport}><div className="studio-preview__canvas">
      <ExperienceConfigProvider value={experience}><StudioEditorProvider value={gizmo}>
        <WebGLBoundary>{heliot ? <HeliotStage>{children}</HeliotStage> : <SceneCanvas>{children}</SceneCanvas>}</WebGLBoundary>
        <CinematicMedia /><CinematicTransitionLayers />
      </StudioEditorProvider></ExperienceConfigProvider>
      {showGuides&&<div className="pro-composition-grid" aria-hidden="true" />}
      {showCopy && !free && <div className="studio-preview__copy" data-align={copy.align ?? 'left'} style={{ pointerEvents: 'none', opacity: sampled.motion.copy.opacity, translate: `0 ${sampled.motion.copy.y}px`, filter: `blur(${sampled.motion.copy.blur}px)` } as CSSProperties}><span>{copy.eyebrow}</span><strong>{copy.headline}</strong><p>{copy.body}</p></div>}
    </div></div>
    <div className="studio-preview__transport"><button aria-label="Go to scene start" title="Go to scene start" disabled={free} onClick={()=>{setPlaying(false);seek(experience.scenes[active].range[0]);}}><StudioIcon name="rewind" /></button><button className="pro-play-button" disabled={free} aria-label={playing&&!free?'Pause':'Play'} onClick={()=>{if(progress>=1)seek(0);setPlaying(!playing);}}><StudioIcon name={playing&&!free?'pause':'play'} /><span>{playing&&!free?'Pause':'Play'}</span></button><output title="Normalized progress">{progress.toFixed(3)}</output><input aria-label="Live preview progress" type="range" min={0} max={1} step={.001} value={progress} onChange={e=>{setPlaying(false);seek(Number(e.target.value));}} /><select aria-label="Playback speed" value={rate} onChange={e=>setRate(Number(e.target.value))}><option value={.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option></select><button aria-label="Loop playback" title="Loop playback" aria-pressed={loop} onClick={()=>setLoop(!loop)}><StudioIcon name="rotate" /></button></div>
    <div className="studio-preview__scenes" role="list" aria-label="Preview scenes">{experience.scenes.map((s,i) => <button role="listitem" key={s.id} className={active === i ? 'is-active' : ''} onClick={() => { setPlaying(false); setActive(i); seek(midpoint(s.range)); }}><small>{String(i+1).padStart(2,'0')}</small>{s.label}</button>)}</div>
  </section>;
}
function midpoint(range: [number, number]) { return (range[0] + range[1]) / 2; }
