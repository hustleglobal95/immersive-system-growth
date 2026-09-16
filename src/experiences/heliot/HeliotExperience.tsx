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
import { useLightLab } from './lightLab';
import { generateContourPaths } from '@/src/lib/cinematic/procedural';
import { AmbientSound } from './AmbientSound';

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
  const aperture = useLightLab(s => s.aperture);
  const setAperture = useLightLab(s => s.setAperture);
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
      element.dataset.chapter = String(Math.min(9, Math.floor(p * 10)));
      element.style.setProperty('--chapter-progress', String((p * 10) % 1));
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
    const file = { project: 'HELIOT Observatory / Field study 001', type: 'fictional architectural light study', finish: finishes[finish].name, aperture, relativeLightPercent: relativeLight(aperture) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'heliot-01-your-edition.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setSaved(true);
  }
  function saveFieldSheet() {
    const radius = 150 * 1.4 / aperture;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#e9e4d9"/><g fill="#292b25" font-family="Arial,sans-serif"><text x="90" y="130" font-size="34" letter-spacing="12">HELIOT</text><text x="90" y="205" font-size="13" letter-spacing="3">OBSERVATORY FOR THE UNSEEN / FIELD STUDY 001</text><path d="M90 245H1110" stroke="#777b6e"/><text x="90" y="350" font-size="75">The shape of</text><text x="90" y="440" font-size="90" font-family="Georgia,serif" font-style="italic">your light.</text><circle cx="600" cy="825" r="290" fill="#292b25"/><circle cx="600" cy="825" r="270" fill="none" stroke="#b39363" stroke-width="2"/>${Array.from({length:72},(_,i)=>{const a=i*Math.PI/36;return `<path d="M${600+Math.cos(a)*225} ${825+Math.sin(a)*225}L${600+Math.cos(a)*260} ${825+Math.sin(a)*260}" stroke="#b39363" stroke-width="2"/>`;}).join('')}<circle cx="600" cy="825" r="${radius}" fill="#e9e4d9"/><path d="M90 1210H1110" stroke="#777b6e"/><text x="90" y="1270" font-size="15" letter-spacing="3">MATERIAL</text><text x="90" y="1320" font-size="32">${finishes[finish].name}</text><text x="510" y="1270" font-size="15" letter-spacing="3">APERTURE</text><text x="510" y="1320" font-size="32">f/${aperture.toFixed(1)}</text><text x="870" y="1270" font-size="15" letter-spacing="3">RELATIVE LIGHT</text><text x="870" y="1320" font-size="32">${relativeLight(aperture)}%</text><text x="90" y="1470" font-size="14">An imagined architecture. A record of the way you chose to see.</text><text x="90" y="1510" font-size="11" letter-spacing="2">HELIOT / ORIGINAL INTERACTIVE STUDY / 2026</text></g></svg>`;
    const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}));
    const link=document.createElement('a');link.href=url;link.download='heliot-field-study.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setSaved(true);
  }
  return <ExperienceConfigProvider value={config}>
    <div ref={root} className="heliot" data-enhanced={profileReady && !reducedMotion && !fallback} data-motion={reducedMotion ? 'reduced' : 'full'} data-fallback={fallback}>
      <SystemProfile /><ScrollController /><PointerController cinematic={false} /><KeyboardController />
      <a className="heliot-skip" href="#heliot-story">Skip to the story</a>
      <div className="heliot-viewport"><StaticLens />{profileReady && !fallback && <WebGLBoundary><Stage /></WebGLBoundary>}</div>
      <div className="heliot-vignette" aria-hidden="true" />
      <div className="heliot-grain" aria-hidden="true" />
      <div className="heliot-terrain" aria-hidden="true"><svg viewBox="0 0 1000 600" preserveAspectRatio="none">{generateContourPaths({id:'observatory-field',blendMode:'normal',interactive:false,kind:'contours',count:60,amplitude:1.8,frequency:1.6,seed:47,opacity:1,range:[0,1],color:'#a08f6a'},1000,600).map((d,i)=><path key={i} d={d} fill="none" stroke="currentColor" strokeWidth=".5" pathLength="1" />)}</svg><span>TOPOGRAPHIC FIELD / CONCEPTUAL TERRAIN</span></div>
      <div className="heliot-crosshair" aria-hidden="true"><i/><i/><i/><i/><span>AXIS Z / FIELD ASSEMBLY</span></div>
      <header className="heliot-header">
        <a href="#first-light" className="heliot-wordmark" aria-label="HELIOT, return to first light">HELIOT<span>®</span></a>
        <span className="heliot-header-caption">AN OBSERVATORY<br/>FOR THE UNSEEN</span>
        <div className="heliot-header-actions"><AmbientSound /><a href="#aperture" className="heliot-inspect-link">Enter the light lab <span aria-hidden="true">↗</span></a><button id="heliot-menu-toggle" className="heliot-menu-toggle" aria-expanded={menuOpen} aria-controls="heliot-chapters" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close −' : 'Index +'}</button></div>
      </header>
      {menuOpen && <nav id="heliot-chapters" className="heliot-menu" aria-label="All ten chapters">{config.scenes.map((scene, i) => <a key={scene.id} href={`#${scene.id}`} onClick={() => setMenuOpen(false)}><span>{String(i + 1).padStart(2, '0')}</span>{scene.label}<span aria-hidden="true">↗</span></a>)}</nav>}
      <aside className="heliot-side-note" aria-hidden="true">SCROLL TO DIRECT THE LIGHT — EST. 2026</aside>
      <main id="heliot-story" className="heliot-story">
        {config.scenes.map((scene, i) => <section className={`story-section heliot-act heliot-act-${i}`} id={scene.id} key={scene.id} aria-labelledby={`heliot-title-${i}`}>
          <div className="heliot-panel">
            <p className="heliot-eyebrow"><span className="heliot-index-mark" />{scene.copy.eyebrow}</p>
            {i === 0 ? <h1 id={`heliot-title-${i}`}><span>Observatory</span><em>for the unseen.</em></h1> : <h2 id={`heliot-title-${i}`}>{scene.copy.headline.split('\n').map((line, index) => <span key={line} className={index ? 'heliot-title-secondary' : ''}>{line}</span>)}</h2>}
            <p className="heliot-body">{scene.copy.body}</p>
            {i === 0 && <a className="heliot-start" href="#form"><span aria-hidden="true">↓</span>SCROLL TO ENTER <span className="heliot-start-duration">10 CHAPTERS / AN OPEN EXPLORATION</span></a>}
            {i === 1 && <div className="heliot-threshold-note">LANDSCAPE → ARCHITECTURE → LIGHT</div>}
            {i === 2 && <dl className="heliot-materials"><div><dt>01</dt><dd>Patinated bronze shell</dd></div><div><dt>02</dt><dd>Radial reflection fins</dd></div><div><dt>03</dt><dd>Machined aperture assembly</dd></div></dl>}
            {i === 3 && <div className="heliot-anatomy-label">08 COMPONENT GROUPS <span>01 / ENVELOPE &nbsp; 02 / RADIAL FIELD<br/>03 / DIAPHRAGM &nbsp; 04 / STRUCTURAL RINGS</span></div>}
            {i === 4 && <OpticalDiagram aperture={aperture} />}
            {i === 5 && <div className="heliot-controls"><label htmlFor="heliot-aperture">Aperture <output>f/{aperture.toFixed(1)}</output></label><input id="heliot-aperture" aria-label="Aperture" type="range" min="0" max="5" step="1" value={apertures.indexOf(aperture as typeof apertures[number])} onChange={e => setAperture(apertures[Number(e.target.value)])} aria-valuetext={`f/${aperture}`} /><div className="heliot-aperture-value"><span>{relativeLight(aperture)}<small>%</small></span><p>Relative light<br />compared with f/1.4</p></div><OpticalDiagram aperture={aperture} /></div>}
            {i === 6 && <div className="heliot-controls"><fieldset className="heliot-finishes"><legend>Choose a finish</legend>{finishes.map((item, index) => <button key={item.id} type="button" aria-pressed={finish === index} onClick={() => setFinish(index)}><span style={{ background: item.color }} />{item.name}</button>)}</fieldset><div className="heliot-orbit" role="group" aria-label="Rotate the instrument"><button aria-label="Rotate left" onClick={() => rotate(-80)}>←</button><button aria-label="Rotate right" onClick={() => rotate(80)}>→</button><button onClick={() => useExperienceStore.getState().resetOrbit()}>Reset view</button></div><div className="heliot-drag" role="slider" tabIndex={0} aria-label="Instrument rotation" aria-valuemin={-180} aria-valuemax={180} aria-valuenow={Math.round(((yaw * 180 / Math.PI + 180) % 360 + 360) % 360 - 180)} aria-valuetext="Use arrow keys or drag to rotate" onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); rotate(e.key === 'ArrowLeft' ? -45 : e.key === 'ArrowRight' ? 45 : 0, e.key === 'ArrowUp' ? -30 : e.key === 'ArrowDown' ? 30 : 0); } }} onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!drag.current) return; rotate(e.clientX - drag.current.x, e.clientY - drag.current.y); drag.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>↔ Drag here to inspect <span>or use arrow keys</span></div></div>}
            {i === 8 && <p className="heliot-signature">○<span>THE WORLD IS STILL THERE.</span></p>}
            {i === 9 && <div className="heliot-final"><p className="heliot-edition">YOUR FIELD STUDY <span>{finishes[finish].name} / f/{aperture.toFixed(1)}</span></p><button className="heliot-save" onClick={saveFieldSheet}>Download field sheet <span aria-hidden="true">↗</span></button><button className="heliot-export-data" onClick={saveEdition}>Save your edition <span>JSON ↗</span></button><p role="status" className="heliot-save-status">{saved ? 'Your field study is downloaded.' : 'A designed SVG print. Yours to keep.'}</p><a className="heliot-replay" href="#first-light" onClick={() => useExperienceStore.getState().resetOrbit()}>↺ Return to the observatory</a><p className="heliot-disclaimer">An original imagined architecture. A conceptual light study, not a construction specification.</p></div>}
          </div>
          {i === 0 && <div className="heliot-hero-spec" aria-hidden="true"><span>001</span><p>A PLACE BETWEEN<br/>THE EARTH AND THE SUN.</p></div>}
        </section>)}
      </main>
      <footer className="heliot-footer"><Readiness /><div className="heliot-progress" aria-label={`Chapter ${Math.min(activeScene + 1, 10)} of 10`}><span>{String(Math.min(activeScene + 1, 10)).padStart(2, '0')}</span><i><b /></i><span>10</span></div><button className="heliot-motion" aria-pressed={reducedMotion} onClick={() => useExperienceStore.getState().setReducedMotion(!reducedMotion)}>{reducedMotion ? 'Motion off' : 'Motion on'} <span aria-hidden="true">{reducedMotion ? '○' : '●'}</span></button></footer>
    </div>
  </ExperienceConfigProvider>;
}
