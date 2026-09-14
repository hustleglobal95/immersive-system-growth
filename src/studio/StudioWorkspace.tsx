'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import heliotRaw from '@/src/experiences/heliot/experience.json';
import nocterraRaw from '@/clients/nocterra-residences/experience.json';
import manifest from '@/config/asset-manifest.json';
import { parseExperience } from '@/src/lib/configSchema';
import { sampleExperience } from '@/src/lib/sampleExperience';
import { useExperienceStore } from '@/src/store/experienceStore';
import type { StudioGizmoState } from '@/src/components/runtime/StudioEditorContext';
import { StudioLivePreview } from './StudioLivePreview';
import { StudioViewportTools } from './StudioViewportTools';
import { CameraPathEditor } from './CameraPathEditor';
import { SequencerEditor } from './SequencerEditor';
import { downloadJson } from './useStudioDraft';
import { addModel, cameraPoints, changeCameraPoint, clamp, insertWaypoint, lightPresets, moveBoundary, removeWaypoint, sceneAt } from './workspaceOperations';
import type { CameraDefinition, ExperienceConfig, SceneDefinition, Vec3 } from '@/src/types/experience';

const presets = { HELIOT: parseExperience(heliotRaw), NOCTERRA: parseExperience(nocterraRaw) };
type Inspector = 'camera' | 'object' | 'environment' | 'material' | 'performance';
const paths: CameraDefinition['path'][] = ['linear','dolly','arc','orbit','crane','threshold','flyby','swoop','macro','pullback','subject-orbit'];
const storageKey = (name: string) => `forge-workspace-project:${name}`;

export function StudioWorkspace({ experience, setExperience, active, setActive, undo, redo, canUndo, canRedo }: {
  experience: ExperienceConfig; setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number; setActive: (index: number) => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean;
}) {
  // A drag is a transaction: live preview every move, one parent-history entry on release.
  const [staged, setStaged] = useState<ExperienceConfig | null>(null);
  const working = staged ?? experience;
  const live = useRef(working);
  const dragging = useRef(false);
  useEffect(() => { live.current = working; }, [working]);
  const [progress, setProgress] = useState(() => { const r = experience.scenes[active].range; return (r[0] + r[1]) / 2; });
  const [inspector, setInspector] = useState<Inspector>('camera');
  const [pointIndex, setPointIndex] = useState(0);
  const [targetPath, setTargetPath] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selected, setSelected] = useState('');
  const [endpoint, setEndpoint] = useState<'from' | 'to'>('from');
  const [mode, setMode] = useState<StudioGizmoState['mode']>('translate');
  const [snap, setSnap] = useState(0);
  const [sequence, setSequence] = useState(false);
  const [notice, setNotice] = useState('Drafts stay in this browser. Export saves a portable config, not a deployment.');
  const [modelUrl, setModelUrl] = useState('');
  const free = useExperienceStore(s => s.freeCamera);
  const index = sceneAt(working, progress);
  const scene = working.scenes[index];
  const camera = device === 'mobile' ? scene.mobileCamera ?? scene.camera : scene.camera;
  const points = cameraPoints(camera, targetPath);
  const selectedPoint = Math.min(pointIndex, points.length - 1);
  const sample = useMemo(() => sampleExperience(progress, false, working, device === 'mobile' ? 9 / 16 : device === 'tablet' ? 4 / 3 : 16 / 9), [working, progress, device]);
  const asset = working.assets.find(a => `asset:${a.id}` === selected);
  const object = selected === 'hero' ? scene.hero[endpoint] : asset;
  useEffect(() => { if (active !== index) setActive(index); }, [active, index, setActive]);

  const begin = useCallback(() => { dragging.current = true; }, []);
  const mutate = useCallback((edit: (current: ExperienceConfig) => ExperienceConfig) => {
    try {
      const next = parseExperience(edit(live.current));
      live.current = next;
      if (dragging.current) setStaged(next); else setExperience(next);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Invalid edit. Previous values preserved.'); }
  }, [setExperience]);
  const end = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setExperience(live.current); setStaged(null);
  }, [setExperience]);
  useEffect(() => {
    window.addEventListener('blur', end); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    return () => { window.removeEventListener('blur', end); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); end(); };
  }, [end]);
  const updateScene = (edit: (s: SceneDefinition) => SceneDefinition) => mutate(current => ({ ...current, scenes: current.scenes.map((s, i) => i === index ? edit(s) : s) }));
  const updateCamera = (edit: (c: CameraDefinition) => CameraDefinition) => updateScene(s => device === 'mobile' ? { ...s, mobileCamera: edit(s.mobileCamera ?? s.camera) } : { ...s, camera: edit(s.camera) });
  const chooseScene = (i: number) => { end(); setActive(i); setPointIndex(0); const r = working.scenes[i].range; setProgress((r[0] + r[1]) / 2); };
  const selectObject = (target: string) => { end(); setSelected(target); setInspector('object'); };
  const selectPoint = (i: number) => { setPointIndex(i); setInspector('camera'); };
  const changeObject = (property: 'position' | 'rotation' | 'scale', value: Vec3) => {
    if (!object) return;
    const nextValue = property === 'scale' ? clamp(value.find(n => Math.abs(n - object.scale) > .00001) ?? value[0], .001, 100) : value;
    if (selected === 'hero') updateScene(s => ({ ...s, hero: { ...s.hero, [endpoint]: { ...s.hero[endpoint], [property]: nextValue } } }));
    else mutate(current => ({ ...current, assets: current.assets.map(a => `asset:${a.id}` === selected ? { ...a, [property]: nextValue } : a) }));
  };
  const property = mode === 'translate' ? 'position' : mode === 'rotate' ? 'rotation' : 'scale';
  const gizmo: StudioGizmoState | null = inspector === 'camera' && free ? {
    target: 'camera-waypoint', mode: 'translate', value: points[selectedPoint], anchor: points[selectedPoint], snap,
    onBegin: begin, onEnd: end, onChange: value => updateCamera(c => changeCameraPoint(c, selectedPoint, value, targetPath)),
  } : inspector === 'object' && object ? {
    target: selected, mode, value: property === 'scale' ? [object.scale, object.scale, object.scale] : object[property],
    anchor: selected === 'hero' ? sample.hero.position : object.position,
    display: mode === 'translate' && selected === 'hero' ? sample.hero.position : undefined, snap,
    onBegin: begin, onEnd: end, onChange: value => changeObject(property, value),
  } : null;
  const placeModel = (url: string) => {
    try {
      const position: Vec3 = [sample.camera.target[0] + 2, sample.camera.target[1], sample.camera.target[2]];
      const next = parseExperience(addModel(live.current, index, url.trim(), position));
      setExperience(next); live.current = next; selectObject(`asset:${next.assets[next.assets.length - 1].id}`);
      setNotice('Model added near the camera focus. Move it with the gizmo or object inspector.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Model could not be added.'); }
  };
  const loadProject = (key: keyof typeof presets) => {
    end();
    try {
      const current = live.current;
      localStorage.setItem(storageKey(current.meta.name), JSON.stringify(current));
      const source = presets[key], saved = localStorage.getItem(storageKey(source.meta.name));
      const next = saved ? parseExperience(JSON.parse(saved)) : structuredClone(source);
      setExperience(next); live.current = next; setActive(0); setProgress((next.scenes[0].range[0] + next.scenes[0].range[1]) / 2); setSelected(''); setPointIndex(0);
      setNotice(`${key} loaded. Previous experience draft preserved. Project metadata remains in the Project tab.`);
    } catch (error) { setNotice(`Project not switched: ${error instanceof Error ? error.message : 'storage unavailable'}. Export your current draft first.`); }
  };
  const save = () => {
    end();
    try { localStorage.setItem(storageKey(working.meta.name), JSON.stringify(parseExperience(working))); setNotice('Snapshot saved in this browser. Export JSON for a backup or source-file handoff.'); }
    catch { setNotice('Browser storage unavailable or full. Export JSON now to keep a copy.'); }
  };
  const exportVersion = () => {
    end();
    try { downloadJson(`experience-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, parseExperience(working)); setNotice('Validated experience exported. Existing assets must accompany the JSON.'); }
    catch { setNotice('Export blocked: repair the validation errors first.'); }
  };
  const navigate = () => {
    const state = useExperienceStore.getState();
    state.setCameraTelemetry(sample.camera); state.setFreeCamera(!free);
  };

  return <section className="forge-workspace builder-workspace" aria-label="Cinematic scene builder">
    <div className="forge-workspace__bar">
      <div className="forge-workspace__project"><span>EXPERIENCE</span><strong>{working.meta.name}</strong>
        <select aria-label="Studio project" value="" onChange={e => loadProject(e.target.value as keyof typeof presets)}><option value="" disabled>Load project</option><option value="HELIOT">HELIOT / Observatory</option><option value="NOCTERRA">NOCTERRA / Residences</option></select>
      </div>
      <div className="forge-workspace__commands">
        <button disabled={!canUndo || !!staged} onClick={undo}>Undo</button><button disabled={!canRedo || !!staged} onClick={redo}>Redo</button>
        <button aria-pressed={sequence} onClick={() => { end(); setSequence(!sequence); }}>{sequence ? 'Back to workspace' : 'Keyframe sequencer'}</button>
        <button onClick={save}>Save snapshot</button><button className="forge-workspace__primary" onClick={exportVersion}>Export JSON</button>
      </div>
    </div>
    <p className="builder-notice" role="status">{notice}</p>
    {sequence ? <SequencerEditor experience={working} setExperience={update => mutate(c => typeof update === 'function' ? update(c) : update)} active={index} setActive={chooseScene} beginGroup={begin} endGroup={end} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} /> : <>
    <div className="forge-workspace__body">
      <aside className="forge-scenes">
        <div className="forge-panel-label"><span>CHAPTERS</span><b>{working.scenes.length}</b></div>
        <div className="forge-scenes__list">{working.scenes.map((s, i) => <button key={s.id} className={i === index ? 'is-active' : ''} onClick={() => chooseScene(i)}><small>{String(i + 1).padStart(2, '0')}</small><span><strong>{s.label}</strong><em>{s.camera.path}</em></span></button>)}</div>
        <div className="forge-panel-label"><span>OBJECTS</span></div>
        <div className="builder-objects">{working.heroVisible && <button aria-pressed={selected === 'hero'} onClick={() => selectObject('hero')}>Hero assembly</button>}{working.assets.filter(a => a.persist || !a.scenes || a.scenes.includes(scene.id)).map(a => <button key={a.id} aria-pressed={selected === `asset:${a.id}`} onClick={() => selectObject(`asset:${a.id}`)}>{a.id}<small>{a.kind}</small></button>)}</div>
        <details className="builder-library"><summary>MODEL LIBRARY</summary><p>Drag into the preview, or click Add.</p>{manifest.models.filter(m => !m.path.includes('-low')).map(m => <div key={m.path} draggable onDragStart={e => { e.dataTransfer.setData('application/x-forge-model', m.path); e.dataTransfer.effectAllowed = 'copy'; }}><span>{m.path.split('/').pop()}</span><button aria-label={`Add ${m.path.split('/').pop()}`} onClick={() => placeModel(m.path)}>Add</button></div>)}
          <label>Hosted GLB path<input value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="/models/your-model.glb" /></label><button onClick={() => placeModel(modelUrl)}>Add model URL</button>
        </details>
      </aside>
      <div className="forge-stage" onDragOver={e => { if (e.dataTransfer.types.includes('application/x-forge-model') || e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const url = e.dataTransfer.getData('application/x-forge-model'); if (url) placeModel(url); else setNotice('Local model files need to be uploaded through asset intake first; then add their hosted /models/...glb path.'); }}>
        <div className="forge-stage__meta"><div><span>LIVE SCENE</span><strong>{scene.label}</strong></div><button aria-pressed={free} onClick={navigate}>{free ? 'Return to film camera' : 'Orbit / edit view'}</button><label className="builder-snap">Snap<select aria-label="Transform snap" value={snap} onChange={e => setSnap(Number(e.target.value))}><option value={0}>Off</option><option value={.1}>0.1</option><option value={.5}>0.5</option><option value={1}>1</option></select></label></div>
        <StudioLivePreview experience={working} active={index} setActive={setActive} progress={progress} onProgressChange={setProgress} gizmo={gizmo} viewport={device} onViewportChange={setDevice}>
          <StudioViewportTools onSelect={selectObject} points={free && inspector === 'camera' ? points : []} selectedPoint={selectedPoint} onPointSelect={selectPoint} />
        </StudioLivePreview>
        <p className="builder-hint">Click a model to select. Orbit view exposes camera handles. Structural HELIOT architecture is still code-authored.</p>
      </div>
      <aside className="forge-inspector">
        <div className="forge-inspector__tabs">{(['camera','object','environment','material','performance'] as const).map(tab => <button key={tab} aria-pressed={inspector === tab} onClick={() => setInspector(tab)}>{tab}</button>)}</div>
        <div className="forge-inspector__content">
          {inspector === 'camera' && <>
            <Title kicker="CAMERA" title={device === 'mobile' ? 'Mobile framing' : 'Shot framing'} />
            <label className="forge-field">Edit camera<select value={device === 'mobile' ? 'mobile' : 'desktop'} onChange={e => setDevice(e.target.value as 'desktop' | 'mobile')}><option value="desktop">Desktop</option><option value="mobile">Mobile override</option></select></label>
            {device === 'mobile' && !scene.mobileCamera && <p className="builder-hint">Inherits desktop; your first edit creates a mobile override.</p>}
            <label className="forge-field">Path<select value={camera.path} onChange={e => updateCamera(c => ({ ...c, path: e.target.value as CameraDefinition['path'] }))}>{paths.map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="forge-field">Handles<select value={targetPath ? 'target' : 'position'} onChange={e => { setTargetPath(e.target.value === 'target'); setPointIndex(0); }}><option value="position">Camera position</option><option value="target">Look-at target</option></select></label>
            <CameraPathEditor points={points} selected={selectedPoint} onSelect={selectPoint} onChange={(i, value) => updateCamera(c => changeCameraPoint(c, i, value, targetPath))} onBegin={begin} onEnd={end} />
            <label className="forge-field">Selected point<select value={selectedPoint} onChange={e => setPointIndex(Number(e.target.value))}>{points.map((_, i) => <option key={i} value={i}>{i === 0 ? 'Start' : i === points.length - 1 ? 'End' : `Waypoint ${i}`}</option>)}</select></label>
            <Vector label="Point position" value={points[selectedPoint]} onChange={v => updateCamera(c => changeCameraPoint(c, selectedPoint, v, targetPath))} />
            <div className="builder-buttons"><button disabled={points.length >= 34} onClick={() => updateCamera(c => insertWaypoint(c, selectedPoint, targetPath))}>Add waypoint</button><button disabled={selectedPoint === 0 || selectedPoint === points.length - 1} onClick={() => { updateCamera(c => removeWaypoint(c, selectedPoint, targetPath)); setPointIndex(Math.max(0, selectedPoint - 1)); }}>Remove point</button></div>
            <Range label="Start FOV" value={camera.from.fov} min={15} max={90} step={1} onChange={fov => updateCamera(c => ({ ...c, from: { ...c.from, fov } }))} begin={begin} end={end} />
            <Range label="End FOV" value={camera.to.fov} min={15} max={90} step={1} onChange={fov => updateCamera(c => ({ ...c, to: { ...c.to, fov } }))} begin={begin} end={end} />
            <p className="builder-hint">Paths show control polygons, not the exact spline. Motion tracks can override base camera values; edit those in Keyframe sequencer.</p>
          </>}
          {inspector === 'object' && <>
            <Title kicker="OBJECT" title={selected || 'Select an object'} />
            {object ? <>
              {selected === 'hero' && <label className="forge-field">Hero pose<select value={endpoint} onChange={e => { const next = e.target.value as 'from' | 'to'; setEndpoint(next); setProgress(next === 'from' ? scene.range[0] : scene.range[1] - .000001); }}><option value="from">Start pose</option><option value="to">End pose</option></select></label>}
              <div className="builder-buttons">{(['translate','rotate','scale'] as const).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>)}</div>
              <Vector label="Position" value={object.position} onChange={v => changeObject('position', v)} /><Vector label="Rotation (radians)" value={object.rotation} onChange={v => changeObject('rotation', v)} />
              <Range label="Uniform scale" min={.01} max={10} step={.01} value={object.scale} onChange={s => changeObject('scale', [s,s,s])} begin={begin} end={end} />
              <p className="builder-hint">Asset transforms apply to every scene using that asset. Hero edits affect this scene's selected endpoint. Rotation snap uses radians.</p>
            </> : <p>Choose the hero or a model from Objects or the preview.</p>}
          </>}
          {inspector === 'environment' && <>
            <Title kicker="LIGHT" title="Atmosphere" />
            <div className="builder-buttons">{Object.entries(lightPresets).map(([name, world]) => <button key={name} onClick={() => updateScene(s => ({ ...s, world: { ...s.world, ...world } }))}>{name}</button>)}</div>
            {(['background','fog','keyColor','rimColor'] as const).map(key => <ColorField key={key} label={key} value={scene.world[key]} onChange={value => updateScene(s => ({ ...s, world: { ...s.world, [key]: value } }))} />)}
            {([['ambient',0,20,.1],['key',0,50,.1],['rim',0,50,.1],['exposure',.25,3,.01],['fogDensity',0,.15,.001]] as const).map(([key,min,max,step]) => <Range key={key} label={key} value={scene.world[key]} min={min} max={max} step={step} onChange={v => updateScene(s => ({ ...s, world: { ...s.world, [key]: v } }))} begin={begin} end={end} />)}
            <p className="builder-hint">Presets change scene lighting, not architecture or fixed practical fixtures.</p>
          </>}
          {inspector === 'material' && <>
            <Title kicker="SURFACE" title="Hero material" /><ColorField label="Tint" value={scene.material.tint} onChange={tint => updateScene(s => ({ ...s, material: { ...s.material, tint } }))} />
            <Range label="Tint strength" value={scene.material.tintStrength} min={0} max={1} step={.01} onChange={tintStrength => updateScene(s => ({ ...s, material: { ...s.material, tintStrength } }))} begin={begin} end={end} />
            {(['metalness','roughness','clearcoat'] as const).map(key => <div key={key}><label className="builder-check"><input type="checkbox" checked={scene.material[key] !== null} onChange={e => updateScene(s => ({ ...s, material: { ...s.material, [key]: e.target.checked ? .5 : null } }))} />Override {key}</label>{scene.material[key] !== null && <Range label={key} value={scene.material[key]!} min={0} max={1} step={.01} onChange={v => updateScene(s => ({ ...s, material: { ...s.material, [key]: v } }))} begin={begin} end={end} />}</div>)}
          </>}
          {inspector === 'performance' && <><Title kicker="RUNTIME" title="Project budgets" />{Object.entries({ 'Minimum DPR': working.runtime.minDpr, 'Maximum DPR': working.runtime.maxDpr, 'Pixel budget': working.runtime.maxPixels, 'Preload MB': working.runtime.preloadMb }).map(([key,value]) => <div key={key} className="forge-readout"><span>{key}</span><strong>{value.toLocaleString()}</strong></div>)}<p className="builder-hint">Observed calls and triangles appear above the preview. These limits are not a performance certification.</p></>}
        </div>
      </aside>
    </div>
    <div className="forge-timeline">
      <div className="forge-timeline__head"><span>CHAPTER TIMELINE</span><output>{progress.toFixed(3)}</output><input aria-label="Global cinematic progress" type="range" min={0} max={1} step={.001} value={progress} onChange={e => setProgress(Number(e.target.value))} /></div>
      <div className="forge-timeline__track">{working.scenes.map((s,i) => <button key={s.id} className={i === index ? 'is-active' : ''} style={{ left: `${s.range[0]*100}%`, width: `${(s.range[1]-s.range[0])*100}%` }} onClick={() => chooseScene(i)}><span>{String(i+1).padStart(2,'0')}</span>{s.label}</button>)}<i className="forge-timeline__playhead" style={{ left: `${progress*100}%` }} /></div>
      {index < working.scenes.length - 1 && <Range label={`End of ${scene.label}`} value={scene.range[1]} min={scene.range[0]+.005} max={working.scenes[index+1].range[1]-.005} step={.001} onChange={v => mutate(c => moveBoundary(c,index,v))} begin={begin} end={end} />}
    </div>
    </>}
  </section>;
}
function Title({ kicker, title }: { kicker: string; title: string }) { return <div className="forge-section-title"><span>{kicker}</span><h3>{title}</h3></div>; }
function Vector({ label, value, onChange }: { label: string; value: Vec3; onChange: (v: Vec3) => void }) { return <fieldset className="forge-vector"><legend>{label}</legend>{['X','Y','Z'].map((axis,i) => <label key={axis}><span>{axis}</span><input aria-label={`${label} ${axis}`} type="number" step={.05} value={value[i]} onChange={e => { const n = e.currentTarget.valueAsNumber; if (!Number.isFinite(n)) return; const v: Vec3 = [...value]; v[i] = n; onChange(v); }} /></label>)}</fieldset>; }
function Range({ label, value, min, max, step, onChange, begin, end }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; begin: () => void; end: () => void }) { return <label className="forge-range"><span>{label}<output>{value.toFixed(step < .1 ? 3 : 1)}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onBlur={end} onChange={e => onChange(Number(e.target.value))} /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { const expanded = value.length === 4 ? '#' + [...value.slice(1)].map(c => c+c).join('') : value; return <label className="forge-color"><span>{label}</span><input type="color" value={expanded} onChange={e => onChange(e.target.value)} /><code>{value}</code></label>; }
