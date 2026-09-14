'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExperienceConfigProvider } from '@/src/components/runtime/ExperienceConfigContext';
import { WebGLBoundary } from '@/src/components/runtime/WebGLBoundary';
import { ScrollController } from '@/src/runtime/ScrollController';
import { KeyboardController } from '@/src/runtime/KeyboardController';
import { SystemProfile } from '@/src/runtime/SystemProfile';
import { PointerController } from '@/src/runtime/PointerController';
import { useExperienceStore } from '@/src/store/experienceStore';
import { cinematicProgress } from '@/src/lib/cinematicProgress';
import { heliotExperience, finishes, apertures, relativeLight } from './config';

const Stage = dynamic(() => import('./HeliotStage').then(m => m.HeliotStage), { ssr: false });
const Readiness = dynamic(() => import('./HeliotStage').then(m => m.HeliotLoadingStatus), { ssr: false });

function OpticalDiagram({ aperture }: { aperture: number }) {
  const r = 64 * 1.4 / aperture;
  return <figure className="heliot-diagram">
    <svg viewBox="0 0 460 170" role="img" aria-label={`Conceptual light path at f/${aperture}; ${relativeLight(aperture)} percent relative light compared with f/1.4`}>
      <defs><linearGradient id="optical-cone"><stop stopColor="#e3ab77" stopOpacity=".3" /><stop offset="1" stopColor="#e3ab77" stopOpacity="0" /></linearGradient></defs>
      <path className="optical-axis" d="M15 85H445" />
      <path d={`M25 ${85-r}L140 ${85-r}L355 85L140 ${85+r}L25 ${85+r}Z`} fill="url(#optical-cone)" />
      {[-1, 0, 1].map(n => <path key={n} className="optical-ray" pathLength="1" d={`M25 ${85+n*r}H140L355 85H430`} />)}
      {[140, 200, 260].map((x, i) => <ellipse key={x} cx={x} cy="85" rx={i === 1 ? 8 : 12} ry={i === 1 ? 53 : 67} fill="#172c30" fillOpacity=".55" stroke="#829ca0" strokeWidth="1" />)}
      <path d="M355 22V148" stroke="#e96645" />
      <text x="25" y="162">INCOMING FIELD</text><text x="176" y="162">OPTICAL GROUPS</text><text x="328" y="162">IMAGE PLANE</text>
    </svg>
    <figcaption>Optical principle · schematic, not a ray-traced prescription</figcaption>
  </figure>;
}

function StaticLens() {
  return <svg className="heliot-static-lens" viewBox="0 0 600 600" role="img" aria-label="Front elevation of the HELIOT optical instrument">
    <defs><radialGradient id="static-glass"><stop stopColor="#071014" /><stop offset=".6" stopColor="#183d44" /><stop offset=".82" stopColor="#52666b" /><stop offset="1" stopColor="#101619" /></radialGradient></defs>
    <circle cx="300" cy="300" r="240" fill="#23272b" stroke="#a5957d" strokeWidth="3" />
    {[230, 222, 209, 197, 185].map(r => <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#505655" />)}
    <circle cx="300" cy="300" r="178" fill="url(#static-glass)" stroke="#687d7a" />
    <circle cx="300" cy="300" r="83" fill="#080f11" stroke="#47534f" />
    <circle cx="300" cy="69" r="5" fill="#e85c3d" />
    <text x="300" y="124" textAnchor="middle" fill="#e5ddcf" fontSize="15" letterSpacing="8">HELIOT / 01</text>
  </svg>;
}

export function HeliotExperience() {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [finish, setFinish] = useState(0);
  const [aperture, setAperture] = useState<number>(1.4);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const profileReady = useExperienceStore(s => s.profileReady);
  const reducedMotion = useExperienceStore(s => s.reducedMotion);
  const webglStatus = useExperienceStore(s => s.webglStatus);
  const activeScene = useExperienceStore(s => s.activeScene);
  const yaw = useExperienceStore(s => s.orbit.yaw);
  const config = useMemo(() => ({ ...heliotExperience, scenes: heliotExperience.scenes.map(scene => ({ ...scene, material: { ...scene.material, tint: finishes[finish].tint, tintStrength: finishes[finish].strength } })) }), [finish]);
  const fallback = webglStatus === 'failed' || webglStatus === 'lost';
  useEffect(() => {
    const state = useExperienceStore.getState();
    state.resetRuntimeOverrides(); state.setWebglStatus('loading');
    // Canvas fallback children mount even when WebGL works. Probe capability explicitly,
    // and release this temporary context before the persistent canvas takes ownership.
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) state.setWebglStatus('failed');
      else probe.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { state.setWebglStatus('failed'); }
    const unsubscribe = cinematicProgress.subscribe(p => {
      const element = root.current;
      if (!element) return;
      element.style.setProperty('--film-progress', String(p));
      element.querySelectorAll<HTMLElement>('.heliot-panel').forEach((panel, i) => {
        panel.closest<HTMLElement>('.heliot-act')!.dataset.active = String(i === Math.min(9, Math.floor(p * 10)));
        const local = p * 10 - i;
        const exit = Math.max(0, Math.min(1, (local - .70) / .30));
        panel.style.setProperty('--exit', reducedMotion ? '0' : String(exit));
      });
    });
    return () => { unsubscribe(); useExperienceStore.getState().resetRuntimeOverrides(); };
  }, [reducedMotion]);
  useEffect(() => {
    // Inspection is deliberately confined to one shot. Entering other acts restores authored framing.
    const state = useExperienceStore.getState();
    state.resetOrbit(); state.setOrbitControl(activeScene === 6 ? 'hero' : null);
  }, [activeScene]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); document.getElementById('heliot-menu-toggle')?.focus(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  function rotate(dx: number, dy = 0) {
    const state = useExperienceStore.getState(); state.setOrbitControl('hero'); state.adjustOrbit('hero', dx, dy);
  }
  function saveEdition() {
    const file = { project: 'HELIOT 01', type: 'fictional optical concept', finish: finishes[finish].name, aperture, relativeLightPercent: relativeLight(aperture) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'heliot-01-your-edition.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setSaved(true);
  }
  return <ExperienceConfigProvider value={config}>
    <div ref={root} className="heliot" data-enhanced={profileReady && !reducedMotion && !fallback} data-motion={reducedMotion ? 'reduced' : 'full'} data-fallback={fallback}>
      <SystemProfile /><ScrollController /><PointerController cinematic={false} /><KeyboardController />
      <a className="heliot-skip" href="#heliot-story">Skip to the story</a>
      <div className="heliot-viewport"><StaticLens />{profileReady && !fallback && <WebGLBoundary><Stage /></WebGLBoundary>}</div>
      <div className="heliot-vignette" aria-hidden="true" />
      <header className="heliot-header">
        <a href="#first-light" className="heliot-wordmark" aria-label="HELIOT, return to first light">HELIOT<span>®</span></a>
        <span className="heliot-header-caption">INSTRUMENTS FOR SEEING</span>
        <div className="heliot-header-actions"><a href="#perspective" className="heliot-inspect-link">Explore 01 <span aria-hidden="true">↗</span></a><button id="heliot-menu-toggle" className="heliot-menu-toggle" aria-expanded={menuOpen} aria-controls="heliot-chapters" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close −' : 'Index +'}</button></div>
      </header>
      {menuOpen && <nav id="heliot-chapters" className="heliot-menu" aria-label="All ten chapters">{config.scenes.map((scene, i) => <a key={scene.id} href={`#${scene.id}`} onClick={() => setMenuOpen(false)}><span>{String(i + 1).padStart(2, '0')}</span>{scene.label}<span aria-hidden="true">↗</span></a>)}</nav>}
      <aside className="heliot-side-note" aria-hidden="true">SCROLL TO DIRECT THE LIGHT — EST. 2026</aside>
      <main id="heliot-story" className="heliot-story">
        {config.scenes.map((scene, i) => <section className={`story-section heliot-act heliot-act-${i}`} id={scene.id} key={scene.id} aria-labelledby={`heliot-title-${i}`}>
          <div className="heliot-panel">
            <p className="heliot-eyebrow"><span className="heliot-index-mark" />{scene.copy.eyebrow}</p>
            {i === 0 ? <h1 id={`heliot-title-${i}`}>Light.<br /><em>Held still.</em></h1> : <h2 id={`heliot-title-${i}`}>{scene.copy.headline.split('\n').map((line, index) => <span key={line} className={index ? 'heliot-title-secondary' : ''}>{line}</span>)}</h2>}
            <p className="heliot-body">{scene.copy.body}</p>
            {i === 0 && <a className="heliot-start" href="#form"><span aria-hidden="true">↓</span>BEGIN THE STUDY <span className="heliot-start-duration">10 ACTS / YOUR PACE</span></a>}
            {i === 2 && <dl className="heliot-materials"><div><dt>01</dt><dd>Fine-cut aluminum</dd></div><div><dt>02</dt><dd>Titanium index ring</dd></div><div><dt>03</dt><dd>Petrol optical coating</dd></div></dl>}
            {i === 3 && <div className="heliot-anatomy-label">08 COMPONENT GROUPS <span>ONE OPTICAL AXIS</span></div>}
            {i === 4 && <OpticalDiagram aperture={aperture} />}
            {i === 5 && <div className="heliot-controls"><label htmlFor="heliot-aperture">Aperture <output>f/{aperture.toFixed(1)}</output></label><input id="heliot-aperture" aria-label="Aperture" type="range" min="0" max="5" step="1" value={apertures.indexOf(aperture as typeof apertures[number])} onChange={e => setAperture(apertures[Number(e.target.value)])} aria-valuetext={`f/${aperture}`} /><div className="heliot-aperture-value"><span>{relativeLight(aperture)}<small>%</small></span><p>Relative light<br />compared with f/1.4</p></div><OpticalDiagram aperture={aperture} /></div>}
            {i === 6 && <div className="heliot-controls"><fieldset className="heliot-finishes"><legend>Choose a finish</legend>{finishes.map((item, index) => <button key={item.id} type="button" aria-pressed={finish === index} onClick={() => setFinish(index)}><span style={{ background: item.color }} />{item.name}</button>)}</fieldset><div className="heliot-orbit" role="group" aria-label="Rotate the instrument"><button aria-label="Rotate left" onClick={() => rotate(-80)}>←</button><button aria-label="Rotate right" onClick={() => rotate(80)}>→</button><button onClick={() => useExperienceStore.getState().resetOrbit()}>Reset view</button></div><div className="heliot-drag" role="slider" tabIndex={0} aria-label="Instrument rotation" aria-valuemin={-180} aria-valuemax={180} aria-valuenow={Math.round(((yaw * 180 / Math.PI + 180) % 360 + 360) % 360 - 180)} aria-valuetext="Use arrow keys or drag to rotate" onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); rotate(e.key === 'ArrowLeft' ? -45 : e.key === 'ArrowRight' ? 45 : 0, e.key === 'ArrowUp' ? -30 : e.key === 'ArrowDown' ? 30 : 0); } }} onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!drag.current) return; rotate(e.clientX - drag.current.x, e.clientY - drag.current.y); drag.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>↔ Drag here to inspect <span>or use arrow keys</span></div></div>}
            {i === 8 && <p className="heliot-signature">H<span>01</span></p>}
            {i === 9 && <div className="heliot-final"><p className="heliot-edition">YOUR EDITION <span>{finishes[finish].name} / f/{aperture.toFixed(1)}</span></p><button className="heliot-save" onClick={saveEdition}>Save your edition <span aria-hidden="true">↗</span></button><p role="status" className="heliot-save-status">{saved ? 'Configuration downloaded. Yours to keep.' : 'A small configuration file. No account required.'}</p><a className="heliot-replay" href="#first-light" onClick={() => useExperienceStore.getState().resetOrbit()}>↺ Replay the study</a><p className="heliot-disclaimer">An original fictional instrument. An interactive study, not a product for sale.</p></div>}
          </div>
          {i === 0 && <div className="heliot-hero-spec" aria-hidden="true"><span>01</span><p>FORM / OPTICS / PERSPECTIVE<br />AN ORIGINAL OPTICAL STUDY</p></div>}
        </section>)}
      </main>
      <footer className="heliot-footer"><Readiness /><div className="heliot-progress" aria-label={`Chapter ${Math.min(activeScene + 1, 10)} of 10`}><span>{String(Math.min(activeScene + 1, 10)).padStart(2, '0')}</span><i><b /></i><span>10</span></div><button className="heliot-motion" aria-pressed={reducedMotion} onClick={() => useExperienceStore.getState().setReducedMotion(!reducedMotion)}>{reducedMotion ? 'Motion off' : 'Motion on'} <span aria-hidden="true">{reducedMotion ? '○' : '●'}</span></button></footer>
    </div>
  </ExperienceConfigProvider>;
}
