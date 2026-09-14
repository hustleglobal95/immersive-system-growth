'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import heliotRaw from '@/src/experiences/heliot/experience.json';
import nocterraRaw from '@/clients/nocterra-residences/experience.json';
import manifest from '@/config/asset-manifest.json';
import { StudioIcon } from './pro/StudioIcon';
import { StudioDialog } from './pro/StudioDialog';
import { StudioNumberInput, StudioTextInput } from './pro/EditableFields';
import { cameraTrackWarning, capturePose, cloneAsset, newScene, removeScene, readSnapshots, writeSnapshot, shotNames, shotPreset, type Snapshot } from './pro/authoring';
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
type Inspector = 'camera' | 'object' | 'environment' | 'material' | 'performance' | 'story';
const paths: CameraDefinition['path'][] = ['linear','dolly','arc','orbit','crane','threshold','flyby','swoop','macro','pullback','subject-orbit'];
const storageKey = (name: string) => `forge-workspace-project:${name}`;

export function StudioWorkspace({ experience, setExperience, active, setActive, undo, redo, canUndo, canRedo, onProjectLoad }: {
  experience: ExperienceConfig; setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number; setActive: (index: number) => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; onProjectLoad?: (key: keyof typeof presets) => void;
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
  const [outline, setOutline] = useState<'scenes'|'objects'|'library'>('scenes');
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAssetDelete, setConfirmAssetDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const snapshotKey = `forge-studio-history:${working.meta.name}`;
  const query = search.trim().toLowerCase();
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
  const selectObject = (target: string) => { end(); setSelected(target); setInspector('object'); setOutline('objects'); };
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
  const placeModel = (url: string, assetName?: string) => {
    try {
      const position: Vec3 = [sample.camera.target[0] + 2, sample.camera.target[1], sample.camera.target[2]];
      const next = parseExperience(addModel(live.current, index, url.trim(), position));
      if(assetName){const stem=assetName.replace(/\.glb$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'model';let id=stem,n=2;while(next.assets.some(a=>a.id===id))id=`${stem}-${n++}`;next.assets[next.assets.length-1].id=id;}
      setExperience(next); live.current = next; selectObject(`asset:${next.assets[next.assets.length - 1].id}`);
      setNotice('Model added near the camera focus. Move it with the gizmo or object inspector.');
      return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Model could not be added.'); return false; }
  };
  const loadProject = (key: keyof typeof presets) => {
    end();
    try {
      const current = live.current;
      localStorage.setItem(storageKey(current.meta.name), JSON.stringify(current));
      const source = presets[key], saved = localStorage.getItem(storageKey(source.meta.name));
      const next = saved ? parseExperience(JSON.parse(saved)) : structuredClone(source);
      useExperienceStore.getState().setFreeCamera(false);
      setExperience(next); live.current = next; setActive(0); setProgress((next.scenes[0].range[0] + next.scenes[0].range[1]) / 2); setSelected(''); setPointIndex(0);
      onProjectLoad?.(key); setNotice(`${key} loaded. Previous experience draft preserved.`);
    } catch (error) { setNotice(`Project not switched: ${error instanceof Error ? error.message : 'storage unavailable'}. Export your current draft first.`); }
  };
  const save = () => {
    end();
    try {
      const current = parseExperience(live.current);
      localStorage.setItem(storageKey(current.meta.name), JSON.stringify(current));
      const versions = writeSnapshot(localStorage,snapshotKey,current,snapshotName || `Version ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      setSnapshots(versions); setSnapshotName('');
      setNotice('Snapshot saved in this browser. Export JSON for a portable backup.');
    } catch { setNotice('Snapshot could not be saved. Storage may be full or history unreadable. Export JSON to keep your work.'); }
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

  const capture = (which: 'from'|'to') => {
    if (!free) { setNotice('Enter Orbit / edit view, compose your shot, then capture its start or end.'); return; }
    end(); updateCamera(c=>capturePose(c,which,useExperienceStore.getState().cameraTelemetry));
    setNotice(`${which === 'from' ? 'Start' : 'End'} framing captured. Return to film camera to preview the move.`);
  };
  const frameSelection = () => {
    const state=useExperienceStore.getState();
    const position=object ? (selected==='hero' ? sample.hero.position : object.position) : sample.camera.target;
    state.setFreeCamera(true);
    window.setTimeout(()=>window.dispatchEvent(new CustomEvent('forge:frame-selection',{detail:{position,radius:Math.max(.5,object?.scale ?? 2)}})),0);
  };
  const addScene = (duplicate: boolean) => {
    end();
    try { const next=newScene(live.current,index,duplicate); live.current=next; setExperience(next); setActive(index+1); setProgress((next.scenes[index+1].range[0]+next.scenes[index+1].range[1])/2); setPointIndex(0); setNotice(duplicate?'Scene duplicated. Shared assets remain linked.':'New scene added from the previous ending pose. Capture its next camera view.'); }
    catch(e){setNotice(e instanceof Error?e.message:'Scene could not be added.');}
  };
  const deleteScene = () => {
    end(); mutate(c=>removeScene(c,index)); setConfirmDelete(false); setSelected(''); setPointIndex(0);
    setNotice('Scene removed and adjacent timing repaired. Undo restores it.');
  };
  const openHistory = () => {
    try { setSnapshots(readSnapshots(localStorage,snapshotKey)); setHistoryOpen(true); }
    catch { setNotice('Snapshot history could not be opened. It has not been overwritten. Export your current draft.'); }
  };
  const uploadModel = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb') || file.size>20*1024*1024) {setNotice('Choose a self-contained .glb file smaller than 20 MB.'); return;}
    const uploadRevision = live.current;
    setUploading(true);
    try {
      const response=await fetch('/api/studio/assets',{method:'POST',headers:{'Content-Type':'model/gltf-binary'},body:file});
      const result=await response.json(); if(!response.ok) throw new Error(result.error || 'Upload failed.');
      if (live.current !== uploadRevision) { setNotice(`Model uploaded but not placed because the draft changed. Add this hosted path when ready: ${result.url}`); return; }
      if (placeModel(result.url,file.name)) setNotice('Model uploaded to this local project and added to the scene. Keep data/studio-assets with your project.');
    } catch(e){setNotice(e instanceof Error?e.message:'Upload failed. Your scene is unchanged.');}
    finally{setUploading(false);if(uploadRef.current)uploadRef.current.value='';}
  };
  useEffect(()=>{
    const seekScene=(event: Event)=>{const i=(event as CustomEvent<number>).detail;if(Number.isInteger(i)&&i>=0&&i<working.scenes.length)chooseScene(i);};
    window.addEventListener('forge:seek-scene',seekScene);return()=>window.removeEventListener('forge:seek-scene',seekScene);
  });
  useEffect(()=>{
    const key=(e: KeyboardEvent)=>{
      const target=e.target as HTMLElement;
      if(document.querySelector('dialog[open]'))return;
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();return;}
      if(target.closest('input,textarea,select,[contenteditable=true],dialog'))return;
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();end(); if(e.shiftKey)redo();else undo();return;}
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.key.toLowerCase()==='f'){e.preventDefault();frameSelection();}
      if(e.key==='Escape')setFocusMode(false);
      if(e.key==='1')setInspector('camera');if(e.key==='2')setInspector('object');if(e.key==='3')setInspector('environment');
      if(e.key.toLowerCase()==='w')setMode('translate');if(e.key.toLowerCase()==='e')setMode('rotate');if(e.key.toLowerCase()==='r')setMode('scale');
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });

  return <section className={`forge-workspace builder-workspace${focusMode?' pro-focus':''}`} aria-label="Cinematic scene builder">
    <div className="forge-workspace__bar">
      <div className="forge-workspace__project"><span className="pro-project-dot" /><div><span className="pro-kicker">CURRENT EXPERIENCE</span><strong>{working.meta.name}</strong></div>
        <select aria-label="Studio project" value="" onChange={e => loadProject(e.target.value as keyof typeof presets)}><option value="" disabled>Switch project</option><option value="HELIOT">HELIOT / Observatory</option><option value="NOCTERRA">NOCTERRA / Residences</option></select>
      </div>
      <div className="forge-workspace__commands">
        <button aria-label="Undo" title="Undo (Ctrl/Cmd Z)" disabled={!canUndo || !!staged} onClick={undo}><StudioIcon name="undo" /></button><button aria-label="Redo" title="Redo (Ctrl/Cmd Shift Z)" disabled={!canRedo || !!staged} onClick={redo}><StudioIcon name="redo" /></button>
        <button aria-pressed={sequence} onClick={() => { end(); setSequence(!sequence); }}><StudioIcon name="key" />{sequence ? 'Back to workspace' : 'Keyframe sequencer'}</button>
        <button aria-label="Version history" title="Version history" onClick={openHistory}><StudioIcon name="clock" /></button><button onClick={save}><StudioIcon name="save" />Save snapshot</button><button className="forge-workspace__primary" onClick={exportVersion}><StudioIcon name="export" />Export JSON</button>
      </div>
    </div>
    <p className="builder-notice" role="status"><StudioIcon name="check" />{notice}</p>
    {sequence ? <SequencerEditor experience={working} setExperience={update => mutate(c => typeof update === 'function' ? update(c) : update)} active={index} setActive={chooseScene} beginGroup={begin} endGroup={end} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} /> : <>
    <div className="forge-workspace__body">
      <aside className="forge-scenes" aria-label="Scene outline">
        <div className="pro-outline-tabs" role="tablist" aria-label="Outline view">{(['scenes','objects','library'] as const).map(tab=><button key={tab} role="tab" aria-selected={outline===tab} onClick={()=>setOutline(tab)}>{tab}</button>)}</div>
        <label className="pro-search"><StudioIcon name="search" /><input aria-label="Search outline" value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Find ${outline}...`} /></label>
        {outline==='scenes'&&<>
          <div className="forge-panel-label"><span>SCENES <b>{working.scenes.length.toString().padStart(2,'0')}</b></span><button aria-label="Add scene" title="Add scene" disabled={working.scenes.length>=30} onClick={()=>addScene(false)}><StudioIcon name="plus" /></button></div>
          <div className="forge-scenes__list">{working.scenes.map((s,i)=>({s,i})).filter(({s})=>`${s.label} ${s.id}`.toLowerCase().includes(query)).map(({s,i})=><button key={s.id} className={i===index?'is-active':''} onClick={()=>chooseScene(i)}><span className="pro-scene-art" style={{background:`linear-gradient(135deg,${s.world.background},${s.world.rimColor}60)`}} aria-hidden="true"><StudioIcon name="camera" /></span><span><strong>{s.label}</strong><em>{String(i+1).padStart(2,'0')} / {s.camera.path.replaceAll('-',' ')}</em></span><small>{Math.round((s.range[1]-s.range[0])*100)}%</small></button>)}</div>
          <div className="pro-outline-bottom"><button disabled={working.scenes.length>=30} onClick={()=>addScene(true)}><StudioIcon name="copy" />Duplicate scene</button><button aria-label="Delete selected scene" disabled={working.scenes.length<=1} onClick={()=>setConfirmDelete(true)}><StudioIcon name="trash" /></button></div>
          <p className="pro-small-note">Scene edits preserve your world. Use the inspector to compose each shot.</p>
        </>}
        {outline==='objects'&&<>
          <div className="forge-panel-label"><span>IN THIS SCENE</span><button aria-label="Open asset library" onClick={()=>setOutline('library')}><StudioIcon name="plus" /></button></div>
          <div className="builder-objects">{working.heroVisible&&'hero assembly'.includes(query)&&<button aria-pressed={selected==='hero'} onClick={()=>selectObject('hero')}><StudioIcon name="cube" /><span>Hero assembly<small>Scene start / end pose</small></span></button>}{working.assets.filter(a=>(a.persist||!a.scenes||a.scenes.includes(scene.id))&&a.id.toLowerCase().includes(query)).map(a=><button key={a.id} aria-pressed={selected===`asset:${a.id}`} onClick={()=>selectObject(`asset:${a.id}`)}><StudioIcon name="cube" /><span>{a.id}<small>{a.kind} / {a.persist?'all scenes':'scoped'}</small></span></button>)}</div>
          {!working.heroVisible&&!working.assets.length&&<div className="pro-empty"><StudioIcon name="cube" /><strong>Your set starts here.</strong><p>Add a model from the library or upload a GLB.</p><button onClick={()=>setOutline('library')}>Open library</button></div>}
          <p className="pro-small-note">Select an object here or click it in the viewport. Fixed environment geometry is not an editable asset.</p>
        </>}
        {outline==='library'&&<div className="builder-library">
          <div className="pro-upload"><StudioIcon name="import" /><strong>Bring your world in.</strong><span>Self-contained GLB / up to 20 MB</span><input ref={uploadRef} hidden type="file" accept=".glb" onChange={e=>void uploadModel(e.target.files?.[0])} /><button disabled={uploading} onClick={()=>uploadRef.current?.click()}>{uploading?'Uploading...':'Upload a model'}</button></div>
          <div className="pro-library-grid">{manifest.models.filter(m=>!m.path.includes('-low')&&m.path.toLowerCase().includes(query)).map(m=><button key={m.path} className="pro-asset-card" draggable onDragStart={e=>{e.dataTransfer.setData('application/x-forge-model',m.path);e.dataTransfer.effectAllowed='copy';}} aria-label={`Add ${m.path.split('/').pop()}`} onClick={()=>placeModel(m.path)}><div><StudioIcon name="cube" /></div><strong>{m.path.split('/').pop()?.replace('.glb','')}</strong><span>Reference / {(m.bytes/1024).toFixed(0)} KB</span></button>)}</div>
          <details><summary>Add an existing model URL</summary><label>Hosted GLB path<input value={modelUrl} onChange={e=>setModelUrl(e.target.value)} placeholder="/models/your-model.glb" /></label><button onClick={()=>placeModel(modelUrl)}>Add model URL</button></details>
        </div>}
      </aside>
      <div className="forge-stage" onDragOver={e => { if (e.dataTransfer.types.includes('application/x-forge-model') || e.dataTransfer.types.includes('Files')) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const url = e.dataTransfer.getData('application/x-forge-model'); if (url) placeModel(url); else if(e.dataTransfer.files[0]) void uploadModel(e.dataTransfer.files[0]); }}>
        <div className="forge-stage__meta"><div><span>VIEWPORT</span><strong>{scene.label}</strong></div><button aria-pressed={free} onClick={navigate}><StudioIcon name={free?'camera':'orbit'} />{free ? 'Return to film camera' : 'Orbit / edit view'}</button><button aria-label="Frame selected object" title="Frame selected object (F)" onClick={frameSelection}><StudioIcon name="focus" /></button><button aria-label={focusMode?'Exit focus view':'Focus view'} title="Expand viewport" onClick={()=>setFocusMode(!focusMode)}><StudioIcon name="fullscreen" /></button><label className="builder-snap">Snap<select aria-label="Transform snap" value={snap} onChange={e => setSnap(Number(e.target.value))}><option value={0}>Off</option><option value={.1}>0.1</option><option value={.5}>0.5</option><option value={1}>1</option></select></label></div>
        <StudioLivePreview experience={working} active={index} setActive={setActive} progress={progress} onProgressChange={setProgress} gizmo={gizmo} viewport={device} onViewportChange={setDevice}>
          <StudioViewportTools onSelect={selectObject} points={free && inspector === 'camera' ? points : []} selectedPoint={selectedPoint} onPointSelect={selectPoint} />
        </StudioLivePreview>
        <p className="pro-viewport-hint"><span><kbd>F</kbd> Frame selection</span><span><kbd>W E R</kbd> Transform</span><span><kbd>Space</kbd> Play / pause</span><span>{free?'Drag to orbit / right-drag to pan':'Film camera / scroll-authored movement'}</span></p>
      </div>
      <aside className="forge-inspector">
        <div className="forge-inspector__tabs">{(['camera','object','environment','material','story','performance'] as const).map(tab => <button key={tab} title={tab} aria-label={tab} aria-pressed={inspector === tab} onClick={() => setInspector(tab)}><StudioIcon name={tab==='environment'?'light':tab==='material'?'surface':tab==='object'?'cube':tab==='story'?'text':tab==='performance'?'graph':'camera'} /><span>{tab==='environment'?'Light':tab==='performance'?'Budget':tab}</span></button>)}</div>
        <div className="forge-inspector__content">
          {inspector === 'story' && <>
            <Title kicker="STORY" title="Give the scene a voice." />
            <label className="forge-field">Scene name<StudioTextInput key={scene.id} label="Scene name" value={scene.label} maxLength={80} required onValueChange={label=>updateScene(s=>({...s,label}))} /></label>
            <label className="forge-field">Eyebrow<StudioTextInput key={scene.id} label="Scene eyebrow" value={scene.copy.eyebrow??''} maxLength={100} onValueChange={eyebrow=>updateScene(s=>({...s,copy:{...s.copy,eyebrow}}))} /></label>
            <label className="forge-field">Headline<StudioTextInput key={scene.id} label="Scene headline" value={scene.copy.headline} maxLength={120} rows={3} required onValueChange={headline=>updateScene(s=>({...s,copy:{...s.copy,headline}}))} /></label>
            <label className="forge-field">Body<StudioTextInput key={scene.id} label="Scene body" value={scene.copy.body} maxLength={800} rows={5} required onValueChange={body=>updateScene(s=>({...s,copy:{...s.copy,body}}))} /></label>
            <label className="forge-field">Alignment<select value={scene.copy.align??'left'} onChange={e=>updateScene(s=>({...s,copy:{...s.copy,align:e.target.value as 'left'|'right'|'center'}}))}><option>left</option><option>center</option><option>right</option></select></label>
            <label className="forge-field">Scene easing<select value={scene.easing} onChange={e=>updateScene(s=>({...s,easing:e.target.value as SceneDefinition['easing']}))}><option value="cinematic">Cinematic</option><option value="smooth">Smooth</option><option value="linear">Linear</option></select></label>
            <p className="pro-small-note">Line breaks are preserved. Preview copy follows the authored motion of this scene.</p>
          </>}
          {inspector === 'camera' && <>
            <Title kicker="CAMERA" title={device === 'mobile' ? 'Mobile framing' : 'Compose the shot.'} />
            <div className="pro-capture-grid"><button onClick={()=>capture('from')} disabled={!free}><StudioIcon name="camera" /><strong>Capture start</strong><small>Use current view</small></button><button onClick={()=>capture('to')} disabled={!free}><StudioIcon name="camera" /><strong>Capture end</strong><small>Use current view</small></button></div>
            <p className="pro-small-note">{free?'Compose in the viewport, then capture a pose.':'Switch to Orbit / edit view to frame shots visually.'}</p>
            {cameraTrackWarning(scene,device==='mobile')&&<div className="pro-inline-warning">Keyframes override this camera. Edit or mute the camera tracks in the sequencer.</div>}
            <details className="pro-details"><summary>Quick shot presets</summary><div className="pro-shot-grid">{shotNames.map(name=><button key={name} onClick={()=>{updateCamera(c=>shotPreset(c,name));setNotice(`${name} applied to the base camera. Undo restores its prior path.`);}}><StudioIcon name="camera" />{name}</button>)}</div><p className="pro-small-note">Replaces the base path and waypoints. Review clearance before using a preset inside architecture.</p></details>
            <label className="forge-field">Edit camera<select value={device === 'mobile' ? 'mobile' : 'desktop'} onChange={e => setDevice(e.target.value as 'desktop' | 'mobile')}><option value="desktop">Desktop</option><option value="mobile">Mobile override</option></select></label>
            {device === 'mobile' && !scene.mobileCamera && <p className="builder-hint">Inherits desktop; your first edit creates a mobile override.</p>}{device==='mobile'&&scene.mobileCamera&&<button className="pro-text-button" onClick={()=>updateScene(s=>{const next={...s};delete next.mobileCamera;return next;})}>Reset to desktop inheritance</button>}
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
              <p className="builder-hint">Asset transforms apply to every scene using that asset. Hero edits affect the selected endpoint of this scene. Rotation snap uses radians.</p>
              {asset&&<div className="builder-buttons"><button onClick={()=>mutate(c=>cloneAsset(c,asset.id))}><StudioIcon name="copy" />Duplicate object</button><button onClick={()=>setConfirmAssetDelete(true)}><StudioIcon name="trash" />Delete object</button></div>}
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
    <StudioDialog open={historyOpen} title="Version history" onClose={()=>setHistoryOpen(false)}>
      <p className="pro-dialog-intro">Eight recent snapshots for this experience, saved on this browser. Export JSON for a backup outside this device.</p>
      <div className="pro-snapshot-create"><input aria-label="Snapshot name" value={snapshotName} onChange={e=>setSnapshotName(e.target.value)} placeholder="Name this version..." maxLength={80} /><button onClick={save}>Save version</button></div>
      <div className="pro-version-list">{snapshots.length?snapshots.map(v=><article key={v.id}><StudioIcon name="clock" /><div><strong>{v.name}</strong><small>{new Date(v.created).toLocaleString()} / {v.experience.scenes.length} scenes</small></div><button onClick={()=>{end();setExperience(parseExperience(v.experience));setHistoryOpen(false);setSelected('');setNotice('Snapshot restored. Undo returns to the previous draft.');}}>Restore</button><button aria-label={`Export ${v.name}`} onClick={()=>downloadJson('forge-version.json',v.experience)}><StudioIcon name="export" /></button></article>):<div className="pro-empty"><StudioIcon name="save" /><strong>No snapshots yet.</strong><p>Save a version before trying a new direction.</p></div>}</div>
    </StudioDialog>
    <StudioDialog open={confirmDelete} title="Delete this scene?" onClose={()=>setConfirmDelete(false)}><p className="pro-dialog-intro">{scene.label} will be removed. Timing will close the gap, and scoped assets used only by this scene will be removed from the configuration. Uploaded files are retained. Undo restores the scene.</p><div className="pro-dialog-actions"><button onClick={()=>setConfirmDelete(false)}>Keep scene</button><button className="pro-danger" onClick={deleteScene}>Delete scene</button></div></StudioDialog>
    <StudioDialog open={confirmAssetDelete} title="Delete this object?" onClose={()=>setConfirmAssetDelete(false)}><p className="pro-dialog-intro">Remove {asset?.id} from this experience. The uploaded model file stays available. Undo restores the object.</p><div className="pro-dialog-actions"><button onClick={()=>setConfirmAssetDelete(false)}>Keep object</button><button className="pro-danger" onClick={()=>{mutate(c=>({...c,assets:c.assets.filter(a=>a.id!==asset?.id)}));setSelected('');setConfirmAssetDelete(false);}}>Delete object</button></div></StudioDialog>
  </section>;
}
function Title({ kicker, title }: { kicker: string; title: string }) { return <div className="forge-section-title"><span>{kicker}</span><h3>{title}</h3></div>; }
function Vector({ label, value, onChange }: { label: string; value: Vec3; onChange: (v: Vec3) => void }) { return <fieldset className="forge-vector"><legend>{label}</legend>{['X','Y','Z'].map((axis,i) => <label key={axis}><span>{axis}</span><StudioNumberInput label={`${label} ${axis}`} value={value[i]} onValueChange={n=>{const v:Vec3=[...value];v[i]=n;onChange(v);}} /></label>)}</fieldset>; }
function Range({ label, value, min, max, step, onChange, begin, end }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; begin: () => void; end: () => void }) { return <div className="forge-range" role="group" aria-label={label+' controls'}><span>{label}<StudioNumberInput label={`${label} value`} className="pro-range-number" min={min} max={max} step={step} value={Number(value.toFixed(4))} onValueChange={onChange} /></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onBlur={end} onChange={e => onChange(Number(e.target.value))} /></div>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { const expanded = value.length === 4 ? '#' + [...value.slice(1)].map(c => c+c).join('') : value; return <label className="forge-color"><span>{label}</span><input type="color" value={expanded} onChange={e => onChange(e.target.value)} /><code>{value}</code></label>; }
