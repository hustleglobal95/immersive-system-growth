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
import { StudioDialog, StudioIcon, StudioNumber, StudioText, isTextEntry, type IconName } from './ui/StudioControls';
import { StudioCommandMenu, type StudioCommand } from './ui/StudioCommandMenu';
import { captureCamera, duplicateAsset, makeShot, readSnapshots, shotPresets, writeSnapshot, type Snapshot } from './studioAuthoring';
import { MAX_STUDIO_GLB_BYTES, validateStudioGlb } from './studioAssetUpload';
import { addModel, cameraPoints, changeCameraPoint, clamp, insertWaypoint, lightPresets, moveBoundary, removeWaypoint, sceneAt } from './workspaceOperations';
import type { CameraDefinition, ExperienceConfig, SceneDefinition, Vec3 } from '@/src/types/experience';

const presets = { HELIOT: parseExperience(heliotRaw), NOCTERRA: parseExperience(nocterraRaw) };
type Inspector = 'camera' | 'object' | 'environment' | 'material' | 'story' | 'performance';
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
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(30);
  const [focusMode, setFocusMode] = useState(false);
  const [guides, setGuides] = useState(false);
  const [copyVisible, setCopyVisible] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [dialog, setDialog] = useState<'assets' | 'history' | 'export' | 'help' | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [importing, setImporting] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const free = useExperienceStore(s => s.freeCamera);
  const webglReady = useExperienceStore(s => s.webglStatus === 'ready');
  const index = sceneAt(working, progress);
  const scene = working.scenes[index];
  const cameraTracks = scene.motionTracks.some(t => t.target.startsWith('camera.'));
  const inspectorIcons: Record<Inspector, IconName> = { camera: 'camera', object: 'cube', environment: 'sun', material: 'layers', story: 'film', performance: 'settings' };
  const camera = device === 'mobile' ? scene.mobileCamera ?? scene.camera : scene.camera;
  const points = cameraPoints(camera, targetPath);
  const selectedPoint = Math.min(pointIndex, points.length - 1);
  const sample = useMemo(() => sampleExperience(progress, false, working, device === 'mobile' ? 9 / 16 : device === 'tablet' ? 4 / 3 : 16 / 9), [working, progress, device]);
  const asset = working.assets.find(a => `asset:${a.id}` === selected);
  const object = selected === 'hero' ? scene.hero[endpoint] : asset;
  useEffect(() => { if (active !== index) setActive(index); }, [active, index, setActive]);

  const begin = useCallback(() => { dragging.current = true; setPlaying(false); }, []);
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
  const chooseScene = (i: number) => { end(); setPlaying(false); setActive(i); setPointIndex(0); const r = working.scenes[i].range; setProgress((r[0] + r[1]) / 2); };
  const selectObject = (target: string) => { end(); setPlaying(false); setSelected(target); setInspector('object'); };
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
    end(); setPlaying(false); setFocusMode(false);
    try {
      const current = live.current;
      localStorage.setItem(storageKey(current.meta.name), JSON.stringify(current));
      const source = presets[key], saved = localStorage.getItem(storageKey(source.meta.name));
      const next = saved ? parseExperience(JSON.parse(saved)) : structuredClone(source);
      useExperienceStore.getState().setFreeCamera(false);
      setExperience(next); live.current = next; setActive(0); setProgress((next.scenes[0].range[0] + next.scenes[0].range[1]) / 2); setSelected(''); setPointIndex(0);
      setNotice(`${key} loaded. Previous experience draft preserved. Project metadata remains in the Project tab.`);
    } catch (error) { setNotice(`Project not switched: ${error instanceof Error ? error.message : 'storage unavailable'}. Export your current draft first.`); }
  };
  const save = () => {
    end();
    try { const current = parseExperience(live.current); const history = writeSnapshot(localStorage, current); localStorage.setItem(storageKey(current.meta.name), JSON.stringify(current)); setSnapshots(history); setNotice('Version saved in this browser. Use Version history to restore it, or Export for a portable backup.'); }
    catch { setNotice('Browser storage unavailable or full. Export JSON now to keep a copy.'); }
  };
  const exportVersion = () => {
    end();
    try { downloadJson(`experience-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, parseExperience(working)); setNotice('Validated experience exported. Existing assets must accompany the JSON.'); }
    catch { setNotice('Export blocked: repair the validation errors first.'); }
  };
  const navigate = () => {
    const state = useExperienceStore.getState();
    if (!webglReady) { setNotice('A WebGL-capable browser is required for orbit editing.'); return; }
    setPlaying(false); state.setCameraTelemetry(sample.camera); state.setFreeCamera(!free);
  };

  const openHistory = () => {
    try { setSnapshots(readSnapshots(localStorage, working.meta.name)); setDialog('history'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'History is unavailable. Export the current draft.'); }
  };
  const captureView = (which: 'from' | 'to') => {
    if (!free || cameraTracks) return;
    updateCamera(c => captureCamera(c, useExperienceStore.getState().cameraTelemetry, which));
    setNotice(`${which === 'from' ? 'Start' : 'End'} camera framing captured. Return to film camera to preview.`);
  };
  const importModel = async (file: File | undefined) => {
    if (!file || importing) return;
    setImporting(true);
    try {
      if (!file.name.toLowerCase().endsWith('.glb') || file.size > MAX_STUDIO_GLB_BYTES) throw new Error('Choose a self-contained .glb file smaller than 25 MB.');
      const buffer = await file.arrayBuffer(); validateStudioGlb(new Uint8Array(buffer));
      const response = await fetch('/api/studio/assets', { method: 'POST', headers: { 'content-type': 'model/gltf-binary', 'x-forge-studio': 'local-asset-import' }, body: buffer });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import failed. Use a hosted model URL instead.');
      placeModel(result.url); setDialog(null);
      setNotice(`Imported ${file.name}. Model saved in public/models/studio; include this file with your project delivery.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Import failed.'); }
    finally { setImporting(false); if (uploadRef.current) uploadRef.current.value = ''; }
  };
  const duplicateSelected = () => {
    if (!asset) return;
    try { const next = duplicateAsset(live.current, asset.id); mutate(() => next); selectObject(`asset:${next.assets.at(-1)!.id}`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Could not duplicate this object.'); }
  };
  const commands: StudioCommand[] = [
    { id: 'save', label: 'Save a version', detail: 'Keep a restorable snapshot in this browser', icon: 'save', shortcut: 'Ctrl / Cmd S', run: save },
    { id: 'export', label: 'Review and export', detail: 'Validate your experience and export JSON', icon: 'export', run: () => setDialog('export') },
    { id: 'objects', label: 'Add a 3D object', detail: 'Import a GLB or browse the model library', icon: 'cube', run: () => setDialog('assets') },
    { id: 'view', label: free ? 'Return to film camera' : 'Orbit / edit view', detail: 'Switch between composing and the authored camera', icon: 'camera', run: navigate, disabled: !webglReady },
    { id: 'history', label: 'Version history', detail: 'Restore an earlier saved scene configuration', icon: 'layers', run: openHistory },
    { id: 'focus', label: focusMode ? 'Leave focus mode' : 'Focus mode', detail: 'Give the preview more room', icon: 'expand', run: () => setFocusMode(v => !v) },
    ...working.scenes.map((s, i): StudioCommand => ({ id: s.id, label: s.label, detail: `Jump to chapter ${i + 1}`, icon: 'film', run: () => chooseScene(i) })),
  ];
  const actionsRef = useRef({ save, undo, redo, navigate, canUndo, canRedo, sequence, selected });
  useEffect(() => { actionsRef.current = { save, undo, redo, navigate, canUndo, canRedo, sequence, selected }; });
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const a = actionsRef.current, mod = event.metaKey || event.ctrlKey;
      if (document.querySelector('dialog[open]')) return;
      if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); return; }
      if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); a.save(); return; }
      if (isTextEntry(event.target) || a.sequence) return;
      if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey ? a.canRedo : a.canUndo) (event.shiftKey ? a.redo : a.undo)(); }
      else if (event.key === 'Escape') { setFocusMode(false); setPlaying(false); }
      else if (event.key.toLowerCase() === 'f') setFocusMode(v => !v);
      else if (event.key.toLowerCase() === 'o') a.navigate();
      else if (event.code === 'Space' && !(event.target instanceof HTMLElement && event.target.closest('button, summary'))) { event.preventDefault(); setPlaying(v => !v); }
      else if (a.selected && ['w','e','r'].includes(event.key.toLowerCase())) { setInspector('object'); setMode(event.key.toLowerCase() === 'w' ? 'translate' : event.key.toLowerCase() === 'e' ? 'rotate' : 'scale'); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, []);

  return <section className="forge-workspace builder-workspace pro-workspace" data-focus={focusMode} aria-label="Cinematic scene builder">
    <div className="forge-workspace__bar">
      <div className="forge-workspace__project"><div className="pro-project-mark"><StudioIcon name="film" size={20}/></div><div><span className="pro-eyebrow">EXPERIENCE</span><strong title={working.meta.name}>{working.meta.name}</strong></div>
        <select aria-label="Studio project" disabled={importing} value="" onChange={e => loadProject(e.target.value as keyof typeof presets)}><option value="" disabled>Switch project</option><option value="HELIOT">HELIOT / Observatory</option><option value="NOCTERRA">NOCTERRA / Residences</option></select>
      </div>
      <div className="forge-workspace__commands">
        <button className="pro-icon-button" aria-label="Undo" title="Undo (Ctrl / Cmd Z)" disabled={!canUndo || !!staged} onClick={undo}><StudioIcon name="undo"/></button><button className="pro-icon-button" aria-label="Redo" title="Redo (Ctrl / Cmd Shift Z)" disabled={!canRedo || !!staged} onClick={redo}><StudioIcon name="redo"/></button>
        <button aria-label="Quick actions" title="Quick actions (Ctrl / Cmd K)" onClick={() => setCommandOpen(true)}><StudioIcon name="search"/><span className="pro-action-label">Actions</span><kbd>K</kbd></button>
        <button aria-pressed={sequence} onClick={() => { end(); setPlaying(false); setSequence(!sequence); }}><StudioIcon name="film"/>{sequence ? 'Back to workspace' : 'Keyframe sequencer'}</button>
        <button onClick={save}><StudioIcon name="save"/>Save snapshot</button><button className="forge-workspace__primary" onClick={() => setDialog('export')}><StudioIcon name="export"/>Review &amp; export</button>
      </div>
    </div>
    <div className="pro-status-row"><p className="builder-notice" role="status">{notice}</p><button type="button" onClick={openHistory}>Version history</button><button type="button" aria-label="Studio quick guide" onClick={() => setDialog('help')}><StudioIcon name="help"/></button></div>
    {sequence ? <SequencerEditor experience={working} setExperience={update => mutate(c => typeof update === 'function' ? update(c) : update)} active={index} setActive={chooseScene} beginGroup={begin} endGroup={end} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} /> : <>
    <div className="forge-workspace__body">
      <aside className="forge-scenes">
        <div className="forge-panel-label"><span>SCENE OUTLINE</span><b>{working.scenes.length}</b></div>
        <div className="pro-outline-search"><StudioIcon name="search" size={14}/><input aria-label="Find chapter" placeholder="Find a chapter..." value={query} onChange={e => setQuery(e.target.value)}/></div>
        <div className="forge-scenes__list">{working.scenes.map((s, i) => (!query || s.label.toLowerCase().includes(query.toLowerCase())) && <button title={s.label} key={s.id} className={i === index ? 'is-active' : ''} onClick={() => chooseScene(i)}><small>{String(i + 1).padStart(2, '0')}</small><span><strong>{s.label}</strong><em>{s.camera.path}</em></span></button>)}</div>
        <div className="forge-panel-label"><span>SCENE OBJECTS</span><button className="pro-icon-button" aria-label="Add object" onClick={() => setDialog('assets')}><StudioIcon name="plus" size={14}/></button></div>
        <div className="builder-objects">{working.heroVisible && <button aria-pressed={selected === 'hero'} onClick={() => selectObject('hero')}>Hero assembly</button>}{working.assets.filter(a => a.persist || !a.scenes || a.scenes.includes(scene.id)).map(a => <button key={a.id} aria-pressed={selected === `asset:${a.id}`} onClick={() => selectObject(`asset:${a.id}`)}>{a.id}<small>{a.kind}</small></button>)}</div>
        <details className="builder-library"><summary>MODEL LIBRARY</summary><p>Drag into the preview, or click Add.</p>{manifest.models.filter(m => !m.path.includes('-low')).map(m => <div key={m.path} draggable onDragStart={e => { e.dataTransfer.setData('application/x-forge-model', m.path); e.dataTransfer.effectAllowed = 'copy'; }}><span>{m.path.split('/').pop()}</span><button aria-label={`Add ${m.path.split('/').pop()}`} onClick={() => placeModel(m.path)}>Add</button></div>)}
          <label>Hosted GLB path<input value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="/models/your-model.glb" /></label><button onClick={() => placeModel(modelUrl)}>Add model URL</button>
        </details>
      </aside>
      <div className="forge-stage" onDragOver={e => { if (e.dataTransfer.types.includes('application/x-forge-model') || e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const url = e.dataTransfer.getData('application/x-forge-model'); if (url) placeModel(url); else if (e.dataTransfer.files[0]) void importModel(e.dataTransfer.files[0]); }}>
        <div className="forge-stage__meta"><div><span>SHOT {String(index + 1).padStart(2, '0')}</span><strong>{scene.label}</strong></div><div className="pro-view-actions"><button disabled={!webglReady} aria-pressed={free} onClick={navigate}><StudioIcon name="camera"/>{free ? 'Return to film camera' : 'Orbit / edit view'}</button><button className="pro-icon-button" aria-label={focusMode ? 'Exit focus mode' : 'Focus mode'} title="Focus mode (F)" aria-pressed={focusMode} onClick={() => setFocusMode(!focusMode)}><StudioIcon name="expand"/></button></div></div>
        <StudioLivePreview experience={working} active={index} setActive={setActive} progress={progress} onProgressChange={setProgress} gizmo={gizmo} viewport={device} onViewportChange={setDevice} compact playing={playing} onPlayingChange={setPlaying} duration={duration} guides={guides} showCopy={copyVisible}>
          <StudioViewportTools onSelect={selectObject} points={free && inspector === 'camera' ? points : []} selectedPoint={selectedPoint} onPointSelect={selectPoint} />
        </StudioLivePreview>
        <div className="pro-view-footer"><span><i/> {free ? 'Orbit to compose. Capture a view to author it.' : 'Film camera / scroll-driven preview'}</span><button aria-pressed={guides} onClick={() => setGuides(!guides)}>Guides</button><button aria-pressed={copyVisible} onClick={() => setCopyVisible(!copyVisible)}>Text</button><label className="builder-snap">Snap<select aria-label="Transform snap" value={snap} onChange={e => setSnap(Number(e.target.value))}><option value={0}>Off</option><option value={.1}>0.1</option><option value={.5}>0.5</option><option value={1}>1</option></select></label></div>
      </div>
      <aside className="forge-inspector">
        <div className="forge-inspector__tabs">{(['camera','object','environment','material','story','performance'] as const).map(tab => <button key={tab} aria-pressed={inspector === tab} title={tab} aria-label={tab} onClick={() => { setInspector(tab); inspectorRef.current?.scrollTo(0, 0); }}><StudioIcon name={inspectorIcons[tab]} size={17}/><span>{tab === 'environment' ? 'Light' : tab === 'performance' ? 'Budget' : tab}</span></button>)}</div>
        <div className="forge-inspector__content" ref={inspectorRef}>
          {inspector === 'camera' && <>
            <Title kicker="CAMERA" title={device === 'mobile' ? 'Mobile framing' : 'Direct this shot'} />
            <div className="pro-preset-grid">{shotPresets.map(p => <button key={p.id} disabled={cameraTracks} title={p.detail} onClick={() => { updateCamera(c => makeShot(c, p.id)); setPointIndex(0); setNotice(`${p.name} applied to this shot. Check the path for intersections before delivery.`); }}><span className={`pro-shot-illustration pro-shot-illustration--${p.id}`}><i/><b/></span><strong>{p.name}</strong></button>)}</div>
            {cameraTracks && <p className="pro-info">Camera keyframes control this shot. <button onClick={() => setSequence(true)}>Edit keyframes</button> to change its motion.</p>}
            <div className="pro-capture-actions"><button disabled={!free || cameraTracks} onClick={() => captureView('from')}><StudioIcon name="target"/>Set start from view</button><button disabled={!free || cameraTracks} onClick={() => captureView('to')}><StudioIcon name="target"/>Set end from view</button></div>
            {!free && <p className="builder-hint">Switch to Orbit / edit view, compose your frame, then capture the start or end.</p>}
            <label className="forge-field">Edit camera<select value={device === 'mobile' ? 'mobile' : 'desktop'} onChange={e => setDevice(e.target.value as 'desktop' | 'mobile')}><option value="desktop">Desktop</option><option value="mobile">Mobile override</option></select></label>
            {device === 'mobile' && !scene.mobileCamera && <p className="builder-hint">Inherits desktop; your first edit creates a mobile override.</p>}
            <Range label="Start FOV" value={camera.from.fov} min={15} max={90} step={1} onChange={fov => updateCamera(c => ({ ...c, from: { ...c.from, fov } }))} begin={begin} end={end} />
            <Range label="End FOV" value={camera.to.fov} min={15} max={90} step={1} onChange={fov => updateCamera(c => ({ ...c, to: { ...c.to, fov } }))} begin={begin} end={end} />
            <details className="pro-advanced-camera"><summary>Fine-tune camera path <span>{points.length} control points</span></summary>
            <label className="forge-field">Path<select value={camera.path} onChange={e => updateCamera(c => ({ ...c, path: e.target.value as CameraDefinition['path'] }))}>{paths.map(p => <option key={p}>{p}</option>)}</select></label>
            <label className="forge-field">Handles<select value={targetPath ? 'target' : 'position'} onChange={e => { setTargetPath(e.target.value === 'target'); setPointIndex(0); }}><option value="position">Camera position</option><option value="target">Look-at target</option></select></label>
            <CameraPathEditor points={points} selected={selectedPoint} onSelect={selectPoint} onChange={(i, value) => updateCamera(c => changeCameraPoint(c, i, value, targetPath))} onBegin={begin} onEnd={end} />
            <label className="forge-field">Selected point<select value={selectedPoint} onChange={e => setPointIndex(Number(e.target.value))}>{points.map((_, i) => <option key={i} value={i}>{i === 0 ? 'Start' : i === points.length - 1 ? 'End' : `Waypoint ${i}`}</option>)}</select></label>
            <Vector label="Point position" value={points[selectedPoint]} onChange={v => updateCamera(c => changeCameraPoint(c, selectedPoint, v, targetPath))} />
            <div className="builder-buttons"><button disabled={points.length >= 34} onClick={() => updateCamera(c => insertWaypoint(c, selectedPoint, targetPath))}>Add waypoint</button><button disabled={selectedPoint === 0 || selectedPoint === points.length - 1} onClick={() => { updateCamera(c => removeWaypoint(c, selectedPoint, targetPath)); setPointIndex(Math.max(0, selectedPoint - 1)); }}>Remove point</button></div>
            </details>
            <p className="builder-hint">Paths show control polygons, not the exact spline. Motion tracks can override base camera values; edit those in Keyframe sequencer.</p>
          </>}
          {inspector === 'object' && <>
            <Title kicker="OBJECT" title={selected === 'hero' ? 'Hero assembly' : asset?.id || 'Compose your scene'} />
            {!object && <div className="pro-empty-state"><StudioIcon name="cube" size={34}/><p>Select a visible object in the preview or add one from the library.</p><button onClick={() => setDialog('assets')}><StudioIcon name="plus"/>Add a 3D object</button></div>}
            {asset && <button onClick={duplicateSelected}><StudioIcon name="copy"/>Duplicate object</button>}
            {object ? <>
              {selected === 'hero' && <label className="forge-field">Hero pose<select value={endpoint} onChange={e => { const next = e.target.value as 'from' | 'to'; setEndpoint(next); setProgress(next === 'from' ? scene.range[0] : scene.range[1] - .000001); }}><option value="from">Start pose</option><option value="to">End pose</option></select></label>}
              <div className="builder-buttons">{(['translate','rotate','scale'] as const).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>)}</div>
              <Vector label="Position" value={object.position} onChange={v => changeObject('position', v)} /><Vector label="Rotation (radians)" value={object.rotation} onChange={v => changeObject('rotation', v)} />
              <Range label="Uniform scale" min={.01} max={10} step={.01} value={object.scale} onChange={s => changeObject('scale', [s,s,s])} begin={begin} end={end} />
              <p className="builder-hint">Asset transforms apply to every scene using that asset. Hero edits affect the selected endpoint of this scene. Rotation snap uses radians.</p>
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
            <Title kicker="SURFACE" title="Hero material" />
            <div className="pro-material-presets">{[{ name: 'Brushed metal', color: '#b5aaa0', metalness: .9, roughness: .35 }, { name: 'Warm ceramic', color: '#d3be9f', metalness: 0, roughness: .65 }, { name: 'Obsidian', color: '#292c2e', metalness: .3, roughness: .18 }].map(p => <button key={p.name} onClick={() => updateScene(s => ({ ...s, material: { ...s.material, tint: p.color, tintStrength: .7, metalness: p.metalness, roughness: p.roughness } }))}><i style={{ background: `radial-gradient(circle at 30% 25%, #fff9, ${p.color} 50%, #000)` }}/><span>{p.name}</span></button>)}</div><ColorField label="Tint" value={scene.material.tint} onChange={tint => updateScene(s => ({ ...s, material: { ...s.material, tint } }))} />
            <Range label="Tint strength" value={scene.material.tintStrength} min={0} max={1} step={.01} onChange={tintStrength => updateScene(s => ({ ...s, material: { ...s.material, tintStrength } }))} begin={begin} end={end} />
            {(['metalness','roughness','clearcoat'] as const).map(key => <div key={key}><label className="builder-check"><input type="checkbox" checked={scene.material[key] !== null} onChange={e => updateScene(s => ({ ...s, material: { ...s.material, [key]: e.target.checked ? .5 : null } }))} />Override {key}</label>{scene.material[key] !== null && <Range label={key} value={scene.material[key]!} min={0} max={1} step={.01} onChange={v => updateScene(s => ({ ...s, material: { ...s.material, [key]: v } }))} begin={begin} end={end} />}</div>)}
          </>}
          {inspector === 'story' && <><Title kicker="NARRATIVE" title="Make the scene yours"/><StudioText label="Chapter name" value={scene.label} maxLength={80} onChange={label => updateScene(s => ({ ...s, label }))}/><StudioText label="Eyebrow" value={scene.copy.eyebrow ?? ''} maxLength={100} onChange={eyebrow => updateScene(s => ({ ...s, copy: { ...s.copy, eyebrow } }))}/><StudioText label="Headline" value={scene.copy.headline} onChange={headline => updateScene(s => ({ ...s, copy: { ...s.copy, headline } }))}/><StudioText label="Body copy" value={scene.copy.body} multiline maxLength={800} onChange={body => updateScene(s => ({ ...s, copy: { ...s.copy, body } }))}/><p className="builder-hint">Preview shows the headline and eyebrow. Body copy is saved for your public experience layout.</p></>}
          {inspector === 'performance' && <><Title kicker="RUNTIME" title="Project budgets" /><p className="builder-hint">Preview quality can be lowered while composing without changing the exported experience.</p>{Object.entries({ 'Minimum DPR': working.runtime.minDpr, 'Maximum DPR': working.runtime.maxDpr, 'Pixel budget': working.runtime.maxPixels, 'Preload MB': working.runtime.preloadMb }).map(([key,value]) => <div key={key} className="forge-readout"><span>{key}</span><strong>{value.toLocaleString()}</strong></div>)}<p className="builder-hint">Observed calls and triangles appear above the preview. These limits are not a performance certification.</p></>}
        </div>
      </aside>
    </div>
    <div className="forge-timeline">
      <div className="pro-timeline-transport"><div><StudioIcon name="film"/><strong>Sequence</strong><span>{working.scenes.length} chapters</span></div><div><button aria-label="Previous chapter" disabled={index === 0} onClick={() => chooseScene(index - 1)}>Prev</button><button className="pro-play" disabled={free} aria-label={playing ? 'Pause' : 'Play'} onClick={() => { if (progress >= 1) setProgress(0); setPlaying(!playing); }}><StudioIcon name={playing ? 'pause' : 'play'}/>{playing ? 'Pause' : 'Play'}</button><button aria-label="Next chapter" disabled={index === working.scenes.length - 1} onClick={() => chooseScene(index + 1)}>Next</button></div><div><output>{(progress * duration).toFixed(1)}<small> / {duration}s</small></output><label>Preview pace<select aria-label="Preview duration" value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label></div></div>
      <div className="forge-timeline__head"><span>SCROLL POSITION</span><output>{progress.toFixed(3)}</output><input aria-label="Global cinematic progress" type="range" min={0} max={1} step={.001} value={progress} onChange={e => { setPlaying(false); setProgress(Number(e.target.value)); }} /></div>
      <div className="forge-timeline__track">{working.scenes.map((s,i) => <button key={s.id} className={i === index ? 'is-active' : ''} style={{ left: `${s.range[0]*100}%`, width: `${(s.range[1]-s.range[0])*100}%` }} onClick={() => chooseScene(i)}><span>{String(i+1).padStart(2,'0')}</span>{s.label}</button>)}<i className="forge-timeline__playhead" style={{ left: `${progress*100}%` }} /></div>
      <details className="pro-timing-details"><summary>Adjust chapter timing <span>Scroll ranges, not video duration</span></summary>{index < working.scenes.length - 1 && <Range label={`End of ${scene.label}`} value={scene.range[1]} min={scene.range[0]+.005} max={working.scenes[index+1].range[1]-.005} step={.001} onChange={v => mutate(c => moveBoundary(c,index,v))} begin={begin} end={end} />}</details>
    </div>
    </>}
    {commandOpen && <StudioCommandMenu commands={commands} onClose={() => setCommandOpen(false)}/>}
    {dialog === 'help' && <StudioDialog title="From a scene to a cinematic experience" description="A simple workflow with precise controls when you need them." onClose={() => setDialog(null)}>
      <div className="pro-guide-steps">{[['01','Compose','Load HELIOT or NOCTERRA. Add a GLB, then select and move it in the viewport.'],['02','Direct','Orbit to compose a frame. Capture the start and end, or choose a shot preset. Use waypoints for a more detailed path.'],['03','Light','Start with a lighting preset, refine the atmosphere, then finish the hero material.'],['04','Preview and export','Scrub the sequence and check mobile framing. Save a version, then export the validated JSON.']].map(([n,title,text]) => <section key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></section>)}</div>
      <div className="pro-shortcuts"><span><kbd>Ctrl / Cmd K</kbd> Quick actions</span><span><kbd>Ctrl / Cmd S</kbd> Save snapshot</span><span><kbd>W / E / R</kbd> Move / rotate / scale</span><span><kbd>O</kbd> Orbit view</span><span><kbd>F</kbd> Focus mode</span><span><kbd>Space</kbd> Play / pause</span></div>
      <p className="pro-info">Built-in terrain and architecture stay code-authored. Imported models can be placed and transformed; this editor is not a polygon-modeling tool.</p>
    </StudioDialog>}
    {dialog === 'assets' && <StudioDialog title="Add to your scene" description="Import your own GLB, use a model URL, or choose a bundled reference." onClose={() => setDialog(null)} wide>
      <input ref={uploadRef} type="file" hidden accept=".glb,model/gltf-binary" onChange={e => void importModel(e.target.files?.[0])}/>
      <button className="pro-upload-zone" disabled={importing} onClick={() => uploadRef.current?.click()}><StudioIcon name="upload" size={26}/><strong>{importing ? 'Importing model...' : 'Choose a GLB from your computer'}</strong><span>Self-contained textures / up to 25 MB / local development Studio</span></button>
      <div className="pro-asset-url"><label>Hosted model URL<input aria-label="Model URL" value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="/models/your-model.glb or https://..."/></label><button onClick={() => { placeModel(modelUrl); }}><StudioIcon name="plus"/>Add model</button></div>
      <div className="pro-outline-search"><StudioIcon name="search"/><input aria-label="Search model library" value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)} placeholder="Search the bundled library..."/></div>
      <div className="pro-asset-grid">{manifest.models.filter(m => !m.path.includes('-low') && m.path.toLowerCase().includes(libraryQuery.toLowerCase())).map(m => <button key={m.path} draggable onDragStart={e => { e.dataTransfer.setData('application/x-forge-model', m.path); setDialog(null); }} onClick={() => { placeModel(m.path); setDialog(null); }}><div><StudioIcon name="cube" size={32}/></div><strong>{m.path.split('/').pop()?.replace('.glb', '').replace(/-/g, ' ')}</strong><span>{Math.round(m.bytes / 1024)} KB / GLB<StudioIcon name="plus" size={14}/></span></button>)}</div>
      <p className="pro-info" role="status">{notice}</p>
    </StudioDialog>}
    {dialog === 'history' && <StudioDialog title="Version history" description="The last 12 saved versions of this experience, stored in this browser." onClose={() => setDialog(null)}>
      <div className="pro-history">{snapshots.length ? snapshots.map((item, i) => <div key={item.id}><StudioIcon name="save"/><span><strong>{item.label}{i === 0 ? ' / latest saved' : ''}</strong><small>{new Date(item.savedAt).toLocaleString()} / {item.experience.scenes.length} chapters</small></span><button onClick={() => { end(); mutate(() => item.experience); setSelected(''); setPlaying(false); setProgress(0); setDialog(null); setNotice('Saved version restored. Undo restores your previous in-memory draft.'); }}>Restore</button><button className="pro-icon-button" aria-label={`Export ${item.label}`} onClick={() => downloadJson(`${item.id}.json`, item.experience)}><StudioIcon name="export"/></button></div>) : <div className="pro-empty-state"><StudioIcon name="save" size={32}/><h3>No saved versions yet</h3><p>Your draft autosaves separately. Save a snapshot to mark a version you can come back to.</p><button onClick={save}>Save snapshot</button></div>}</div>
    </StudioDialog>}
    {dialog === 'export' && <StudioDialog title="Ready for the next stage" description="Export the actual experience configuration used by the production renderer." onClose={() => setDialog(null)}>
      <div className="pro-export-summary"><StudioIcon name="check" size={22}/><div><strong>Experience schema valid</strong><p>{working.scenes.length} chapters / {working.assets.length} scene assets / {working.scenes.reduce((n,s) => n+s.motionTracks.length,0)} motion tracks</p></div></div>
      <div className="pro-export-list"><p><strong>Included</strong><span>Camera paths, mobile overrides, lighting, hero materials, scene copy, asset references and keyframes.</span></p><p><strong>Keep with your project</strong><span>GLBs, textures, licenses, interactions and deployment settings are separate. JSON export does not bundle assets or publish the site.</span></p><p><strong>Before client delivery</strong><span>Inspect every chapter, check mobile framing and test the highest quality on your target devices.</span></p></div>
      <div className="pro-dialog-footer"><button onClick={() => { setDialog(null); setDevice('mobile'); }}>Check mobile</button><button className="forge-workspace__primary" onClick={exportVersion}><StudioIcon name="export"/>Export JSON</button></div>
    </StudioDialog>}
  </section>;
}
function Title({ kicker, title }: { kicker: string; title: string }) { return <div className="forge-section-title"><span>{kicker}</span><h3>{title}</h3></div>; }
function Vector({ label, value, onChange }: { label: string; value: Vec3; onChange: (v: Vec3) => void }) { return <fieldset className="forge-vector"><legend>{label}</legend>{['X','Y','Z'].map((axis,i) => <label key={axis}><span>{axis}</span><StudioNumber label={`${label} ${axis}`} value={value[i]} onChange={n => { const v: Vec3 = [...value]; v[i] = n; onChange(v); }}/></label>)}</fieldset>; }
function Range({ label, value, min, max, step, onChange, begin, end }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; begin: () => void; end: () => void }) { return <label className="forge-range"><span>{label}<output>{value.toFixed(step < .1 ? 3 : 1)}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onBlur={end} onChange={e => onChange(Number(e.target.value))} /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { const expanded = value.length === 4 ? '#' + [...value.slice(1)].map(c => c+c).join('') : value; return <label className="forge-color"><span>{label}</span><input type="color" value={expanded} onChange={e => onChange(e.target.value)} /><code>{value}</code></label>; }
