"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import { sampleMotionTrack } from "@/src/lib/motionSequencer";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { advancePlayhead, curvePresets } from "@/src/lib/sequencerTransport";
import { retimeSelection, type RetimeOperation } from "@/src/lib/keyframeOperations";
import {
  createMotionPreset,
  createTrackForTarget,
  motionPresetCatalog,
  motionTargetOptions,
  type MotionPresetName,
  type MotionTargetOption,
} from "@/src/platform/motionPresets";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import type { StudioGizmoState } from "@/src/components/runtime/StudioEditorContext";
import type { ExperienceConfig, MotionEasing, MotionTrack, MotionViewport, Vec3 } from "@/src/types/experience";

type AnyKey = {
  id: string;
  at: number;
  value: number | boolean | string | Vec3;
  easing: MotionEasing;
  curve?: [number, number, number, number];
};
interface Selection { trackId: string; keyId: string }
interface DragState { startX: number; width: number; selection: Selection[]; base: ExperienceConfig }

export function SequencerEditor({
  experience,
  setExperience,
  active,
  setActive,
  beginGroup,
  endGroup,
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  setActive: (index: number) => void;
  beginGroup: () => void;
  endGroup: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const scene = experience.scenes[active];
  const [playhead, setPlayhead] = useState(0);
  const playheadRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(5);
  const [playbackRange, setPlaybackRange] = useState<[number, number]>([0, 1]);
  const [trackFilter, setTrackFilter] = useState("");
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(0.05);
  const [viewport, setViewport] = useState<MotionViewport>("all");
  const [target, setTarget] = useState("camera.position");
  const [selectedTrackId, setSelectedTrackId] = useState(scene.motionTracks[0]?.id ?? "");
  const [selection, setSelection] = useState<Selection[]>([]);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState("");
  const clipboard = useRef<Array<{ trackId: string; key: AnyKey }>>([]);
  const [clipboardSize, setClipboardSize] = useState(0);
  const drag = useRef<DragState | null>(null);
  const options = useMemo(() => motionTargetOptions(experience, scene), [experience, scene]);
  const visibleTracks = useMemo(() => {
    const query = trackFilter.trim().toLowerCase();
    return query ? scene.motionTracks.filter((track) => `${track.label} ${track.target} ${track.viewport}`.toLowerCase().includes(query)) : scene.motionTracks;
  }, [scene.motionTracks, trackFilter]);
  const selectedTrack = scene.motionTracks.find((track) => track.id === selectedTrackId) ?? scene.motionTracks[0];
  const selectedKey = selectedTrack ? keysOf(selectedTrack).find((key) => selection.some((item) => item.trackId === selectedTrack.id && item.keyId === key.id)) : undefined;
  const globalProgress = scene.range[0] + (scene.range[1] - scene.range[0]) * playhead;

  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => {
    if (!playing) return;
    let request = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const result = advancePlayhead(playheadRef.current, Math.min(0.1, (now - previous) / 1000), {
        playing: true,
        loop,
        rate: playbackRate,
        range: playbackRange,
        duration,
      });
      previous = now;
      playheadRef.current = result.playhead;
      setPlayhead(result.playhead);
      if (result.ended) { setPlaying(false); return; }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [duration, loop, playbackRange, playbackRate, playing]);

  const commitTracks = (tracks: MotionTrack[]) => setExperience((current) => replaceTracks(current, active, tracks));
  const chooseScene = (index: number) => {
    setPlaying(false);
    setActive(index);
    setPlayhead(0);
    setSelection([]);
    setSelectedTrackId(experience.scenes[index].motionTracks[0]?.id ?? "");
  };
  const addTrack = () => {
    const option = options.find((item) => item.target === target);
    if (!option) return;
    if (scene.motionTracks.some((track) => track.target === option.target && track.viewport === viewport)) {
      setNotice("That target already has a track for this viewport.");
      return;
    }
    const track = createTrackForTarget(experience, active, option, viewport);
    commitTracks([...scene.motionTracks, track]);
    setSelectedTrackId(track.id);
    setSelection([{ trackId: track.id, keyId: keysOf(track)[0].id }]);
    setNotice(`${track.label} track added.`);
  };
  const applyPreset = (name: MotionPresetName) => {
    const created = createMotionPreset(name, experience, active);
    const additions = created
      .filter((track) => !track.target.startsWith("media.") || Boolean(scene.media))
      .filter((track) => !scene.motionTracks.some((current) => current.target === track.target && current.viewport === track.viewport))
      .map((track) => uniqueTrack(scene.motionTracks, track));
    if (!additions.length) {
      setNotice("This preset's targets already exist in the current scene.");
      return;
    }
    commitTracks([...scene.motionTracks, ...additions]);
    setSelectedTrackId(additions[0].id);
    setSelection([{ trackId: additions[0].id, keyId: keysOf(additions[0])[0].id }]);
    setNotice(`${additions.length} preset track${additions.length === 1 ? "" : "s"} added.`);
  };
  const addKey = () => {
    if (!selectedTrack || selectedTrack.locked) return;
    const at = snapTime(playhead, snap);
    const existing = keysOf(selectedTrack).find((key) => Math.abs(key.at - at) < 0.000001);
    if (existing) {
      setSelection([{ trackId: selectedTrack.id, keyId: existing.id }]);
      setNotice("Selected the key already at the playhead.");
      return;
    }
    const key: AnyKey = { id: nextKeyId(selectedTrack), at, value: sampleMotionTrack(selectedTrack, at) as AnyKey["value"], easing: "smooth" };
    const track = withKeys(selectedTrack, [...keysOf(selectedTrack), key]);
    commitTracks(scene.motionTracks.map((item) => item.id === track.id ? track : item));
    setSelection([{ trackId: track.id, keyId: key.id }]);
    setNotice("Keyframe recorded at the playhead.");
  };
  const updateTrack = (changes: Partial<MotionTrack>) => {
    if (!selectedTrack) return;
    if (changes.viewport && scene.motionTracks.some((track) => track.id !== selectedTrack.id && track.target === selectedTrack.target && track.viewport === changes.viewport)) {
      setNotice("That target already has a track for this viewport.");
      return;
    }
    commitTracks(scene.motionTracks.map((track) => track.id === selectedTrack.id ? { ...track, ...changes } as MotionTrack : track));
  };
  const updateKey = (changes: Partial<AnyKey>) => {
    if (!selectedTrack || !selectedKey || selectedTrack.locked) return;
    const changed = { ...selectedKey, ...changes };
    const track = withKeys(selectedTrack, keysOf(selectedTrack).filter((key) => key.id === selectedKey.id || Math.abs(key.at - changed.at) > 0.000001).map((key) => key.id === selectedKey.id ? changed : key));
    commitTracks(scene.motionTracks.map((item) => item.id === track.id ? track : item));
  };
  const deleteTrack = () => {
    if (!selectedTrack) return;
    const tracks = scene.motionTracks.filter((track) => track.id !== selectedTrack.id);
    commitTracks(tracks);
    setSelectedTrackId(tracks[0]?.id ?? "");
    setSelection([]);
  };
  const deleteKeys = () => {
    if (!selection.length) return;
    const tokens = selectionTokens(selection);
    const tracks = scene.motionTracks.map((track) => withKeys(track, keysOf(track).filter((key) => !tokens.has(`${track.id}:${key.id}`))));
    commitTracks(tracks);
    setSelection([]);
  };
  const copyKeys = () => {
    const tokens = selectionTokens(selection);
    clipboard.current = scene.motionTracks.flatMap((track) => keysOf(track).filter((key) => tokens.has(`${track.id}:${key.id}`)).map((key) => ({ trackId: track.id, key: structuredClone(key) })));
    setClipboardSize(clipboard.current.length);
    setNotice(`${clipboard.current.length} keyframe${clipboard.current.length === 1 ? "" : "s"} copied.`);
  };
  const pasteKeys = () => {
    if (!clipboard.current.length) return;
    const earliest = Math.min(...clipboard.current.map((item) => item.key.at));
    const nextSelection: Selection[] = [];
    const tracks = scene.motionTracks.map((track) => {
      const additions = clipboard.current.filter((item) => item.trackId === track.id);
      if (!additions.length || track.locked) return track;
      let current = keysOf(track);
      for (const item of additions) {
        const id = nextKeyId({ ...track, keyframes: current } as MotionTrack);
        const at = snapTime(playhead + item.key.at - earliest, snap);
        const key = { ...structuredClone(item.key), id, at };
        current = [...current.filter((candidate) => Math.abs(candidate.at - at) > 0.000001), key];
        nextSelection.push({ trackId: track.id, keyId: id });
      }
      return withKeys(track, current);
    });
    commitTracks(tracks);
    setSelection(nextSelection);
    setNotice(`${nextSelection.length} keyframe${nextSelection.length === 1 ? "" : "s"} pasted.`);
  };
  const nudge = (direction: -1 | 1) => moveSelection(experience, selection, direction * snap);
  const retime = (operation: RetimeOperation) => {
    if (selection.length < 2) return;
    const tokens = selectionTokens(selection);
    const values = scene.motionTracks.flatMap((track) => keysOf(track)
      .filter((key) => tokens.has(`${track.id}:${key.id}`))
      .map((key) => ({ token: `${track.id}:${key.id}`, at: key.at })));
    const times = retimeSelection(values, operation);
    beginGroup();
    const tracks = scene.motionTracks.map((track) => {
      const moved = keysOf(track).map((key) => {
        const at = times[`${track.id}:${key.id}`];
        return at === undefined ? key : { ...key, at: snapTime(at, snap) };
      });
      const occupied = new Set(moved.filter((key) => tokens.has(`${track.id}:${key.id}`)).map((key) => key.at.toFixed(6)));
      return withKeys(track, moved.filter((key) => tokens.has(`${track.id}:${key.id}`) || !occupied.has(key.at.toFixed(6))));
    });
    commitTracks(tracks);
    endGroup();
    setNotice(operation === "reverse" ? "Selected timing reversed." : "Selected keys distributed evenly.");
  };
  const moveSelection = (base: ExperienceConfig, selected: Selection[], delta: number) => {
    if (!selected.length) return;
    const tokens = selectionTokens(selected);
    const selectedTimes = base.scenes[active].motionTracks.flatMap((track) => keysOf(track).filter((key) => tokens.has(`${track.id}:${key.id}`)).map((key) => key.at));
    const boundedDelta = Math.max(-Math.min(...selectedTimes), Math.min(1 - Math.max(...selectedTimes), delta));
    const tracks = base.scenes[active].motionTracks.map((track) => {
      if (track.locked) return track;
      const moved = keysOf(track).map((key) => tokens.has(`${track.id}:${key.id}`) ? { ...key, at: snapTime(key.at + boundedDelta, snap) } : key);
      const occupied = new Set(moved.filter((key) => tokens.has(`${track.id}:${key.id}`)).map((key) => key.at.toFixed(6)));
      return withKeys(track, moved.filter((key) => tokens.has(`${track.id}:${key.id}`) || !occupied.has(key.at.toFixed(6))));
    });
    setExperience(replaceTracks(base, active, tracks));
  };
  const pointerDown = (event: PointerEvent<HTMLButtonElement>, track: MotionTrack, key: AnyKey) => {
    event.preventDefault();
    if (track.locked) return;
    const item = { trackId: track.id, keyId: key.id };
    let nextSelection = selection;
    if (event.shiftKey) nextSelection = containsSelection(selection, item) ? selection.filter((candidate) => !sameSelection(candidate, item)) : [...selection, item];
    else if (!containsSelection(selection, item)) nextSelection = [item];
    setSelection(nextSelection);
    setSelectedTrackId(track.id);
    const rail = event.currentTarget.parentElement;
    if (!rail) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginGroup();
    drag.current = { startX: event.clientX, width: rail.getBoundingClientRect().width, selection: nextSelection, base: experience };
  };
  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    moveSelection(drag.current.base, drag.current.selection, (event.clientX - drag.current.startX) / Math.max(1, drag.current.width));
  };
  const pointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    endGroup();
  };

  const gizmo: StudioGizmoState | null = (() => {
    if (!recording || !selectedTrack || !selectedKey || selectedTrack.type !== "vector") return null;
    const targetName = selectedTrack.target;
    const mode = targetName.endsWith("rotation") ? "rotate" : targetName.endsWith("scale") ? "scale" : "translate";
    const sampled = sampleExperience(globalProgress, false, experience);
    const anchor = targetName === "hero.rotation" || targetName.startsWith("rig:") ? sampled.hero.position : [0, 0, 0];
    return {
      target: targetName,
      mode,
      value: selectedKey.value as Vec3,
      anchor: anchor as Vec3,
      display: targetName === "camera.position" ? sampled.camera.target : undefined,
      snap: mode === "rotate" ? Math.PI / 12 : mode === "scale" ? 0.05 : 0.1,
      onChange: (value) => updateKey({ value }),
      onBegin: beginGroup,
      onEnd: endGroup,
    };
  })();

  return (
    <div className="sequencer-workspace">
      <section className="studio-card sequencer" aria-labelledby="sequencer-title">
        <div className="studio-card__head">
          <div><span>FRAME-ACCURATE AUTHORING</span><h2 id="sequencer-title">Motion sequencer</h2></div>
          <output>{scene.motionTracks.length} tracks / {scene.motionTracks.reduce((count, track) => count + track.keyframes.length, 0)} keys</output>
        </div>
        <div className="sequencer-scenes" role="list" aria-label="Sequencer scenes">
          {experience.scenes.map((item, index) => <button role="listitem" type="button" key={item.id} className={active === index ? "is-active" : ""} onClick={() => chooseScene(index)}>{String(index + 1).padStart(2, "0")} {item.label}</button>)}
        </div>
        <div className="sequencer-toolbar">
          <button type="button" className={playing ? "is-playing" : ""} aria-label={playing ? "Pause sequencer" : "Play sequencer"} aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button>
          <button type="button" onClick={() => { setPlaying(false); setPlayhead(playbackRange[0]); }}>Stop</button>
          <label className="studio-check"><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} />Loop</label>
          <label>Rate<select aria-label="Playback rate" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
          <label>Seconds<input aria-label="Scene playback duration" className="sequencer-number" type="number" min="1" max="30" step="0.5" value={duration} onChange={(event) => setDuration(Math.max(1, Math.min(30, Number(event.target.value))))} /></label>
          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo motion edit">Undo</button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo motion edit">Redo</button>
          <button type="button" onClick={copyKeys} disabled={!selection.length}>Copy</button>
          <button type="button" onClick={pasteKeys} disabled={!clipboardSize}>Paste</button>
          <button type="button" onClick={deleteKeys} disabled={!selection.length}>Delete keys</button>
          <button type="button" onClick={() => nudge(-1)} disabled={!selection.length} aria-label="Nudge keys backward">− snap</button>
          <button type="button" onClick={() => nudge(1)} disabled={!selection.length} aria-label="Nudge keys forward">+ snap</button>
          <button type="button" onClick={() => retime("distribute")} disabled={selection.length < 3}>Distribute</button>
          <button type="button" onClick={() => retime("reverse")} disabled={selection.length < 2}>Reverse timing</button>
          <label>Snap<select aria-label="Timeline snap" value={snap} onChange={(event) => setSnap(Number(event.target.value))}><option value="0">Off</option><option value="0.01">1%</option><option value="0.025">2.5%</option><option value="0.05">5%</option><option value="0.1">10%</option></select></label>
          <label>Zoom<input aria-label="Timeline zoom" type="range" min="0.75" max="3" step="0.25" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          <label>Filter<input aria-label="Filter motion tracks" className="sequencer-filter" type="search" value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)} placeholder="camera, mobile…" /></label>
        </div>
        <div className="sequencer-range" aria-label="Playback range">
          <span>Preview range</span>
          <label>In<input aria-label="Playback range start" type="number" min="0" max={playbackRange[1] - 0.01} step="0.01" value={playbackRange[0]} onChange={(event) => setPlaybackRange([Math.max(0, Math.min(playbackRange[1] - 0.01, Number(event.target.value))), playbackRange[1]])} /></label>
          <label>Out<input aria-label="Playback range end" type="number" min={playbackRange[0] + 0.01} max="1" step="0.01" value={playbackRange[1]} onChange={(event) => setPlaybackRange([playbackRange[0], Math.min(1, Math.max(playbackRange[0] + 0.01, Number(event.target.value)))])} /></label>
          <button type="button" onClick={() => setPlaybackRange([0, 1])}>Full scene</button>
        </div>
        <div className="sequencer-add">
          <select aria-label="Motion target" value={target} onChange={(event) => setTarget(event.target.value)}>{groupedOptions(options)}</select>
          <select aria-label="Motion viewport" value={viewport} onChange={(event) => setViewport(event.target.value as MotionViewport)}><option value="all">All viewports</option><option value="desktop">Desktop only</option><option value="mobile">Mobile only</option></select>
          <button type="button" className="studio-primary" onClick={addTrack}>Add track</button>
          <select aria-label="Motion preset" defaultValue="" onChange={(event) => { if (event.target.value) applyPreset(event.target.value as MotionPresetName); event.target.value = ""; }}><option value="">Apply preset…</option>{motionPresetCatalog.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
          <button type="button" onClick={addKey} disabled={!selectedTrack || selectedTrack.locked}>Record key</button>
          <button type="button" aria-pressed={recording} className={recording ? "is-recording" : ""} onClick={() => setRecording((value) => !value)} disabled={!selectedKey || selectedTrack?.type !== "vector"}>{recording ? "Recording gizmo" : "Enable gizmo"}</button>
        </div>
        {notice && <p className="sequencer-notice" role="status">{notice}</p>}
        <div className="sequencer-sheet" style={{ "--sequence-width": `${Math.round(720 * zoom)}px` } as CSSProperties}>
          <div className="sequencer-ruler">
            <strong>TRACK / TARGET</strong>
            <div onPointerDown={(event) => setPlayhead(timeFromPointer(event.clientX, event.currentTarget))}>{[0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1].map((tick) => <span key={tick} style={{ left: `${tick * 100}%` }}>{Math.round(tick * 100)}</span>)}<i style={{ left: `${playhead * 100}%` }} /></div>
          </div>
          {visibleTracks.map((track) => <div className="sequencer-row" key={track.id} data-selected={selectedTrack?.id === track.id} data-muted={track.muted}>
            <button type="button" className="sequencer-row__label" onClick={() => { setSelectedTrackId(track.id); setSelection([]); }}><span>{track.label}</span><small>{track.viewport} / {track.type}</small></button>
            <div className="sequencer-rail" onPointerDown={(event) => { if (event.target === event.currentTarget) setPlayhead(timeFromPointer(event.clientX, event.currentTarget)); }}>
              <i className="sequencer-playhead" style={{ left: `${playhead * 100}%` }} />
              {keysOf(track).map((key) => <button key={key.id} type="button" className="sequencer-key" aria-label={`${track.label} key at ${Math.round(key.at * 100)} percent`} aria-pressed={selection.some((item) => item.trackId === track.id && item.keyId === key.id)} style={{ left: `${key.at * 100}%` }} onDoubleClick={() => setPlayhead(key.at)} onPointerDown={(event) => pointerDown(event, track, key)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><span /></button>)}
            </div>
          </div>)}
          {!visibleTracks.length && <div className="sequencer-empty"><strong>{scene.motionTracks.length ? "No matching tracks" : `No tracks in ${scene.label}`}</strong><span>{scene.motionTracks.length ? "Clear or change the track filter." : "Add a typed target or apply a motion preset."}</span></div>}
        </div>
      </section>

      <aside className="studio-card sequencer-inspector" aria-label="Motion inspector">
        <div className="studio-card__head"><div><span>SELECTION</span><h2>{selectedTrack?.label ?? "No track selected"}</h2></div><output>{Math.round(playhead * 100)}%</output></div>
        {selectedTrack && <>
          <label>Track label<input aria-label="Track label" value={selectedTrack.label} onChange={(event) => updateTrack({ label: event.target.value })} /></label>
          <div className="studio-field-row"><label>Viewport<select aria-label="Track viewport" value={selectedTrack.viewport} onChange={(event) => updateTrack({ viewport: event.target.value as MotionViewport })}><option value="all">All</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label><label>Target<input readOnly value={selectedTrack.target} /></label></div>
          <div className="sequencer-toggles"><label className="studio-check"><input type="checkbox" checked={selectedTrack.muted} onChange={(event) => updateTrack({ muted: event.target.checked })} />Muted</label><label className="studio-check"><input type="checkbox" checked={selectedTrack.locked} onChange={(event) => updateTrack({ locked: event.target.checked })} />Locked</label><button type="button" onClick={deleteTrack}>Delete track</button></div>
          {selectedKey ? <KeyInspector track={selectedTrack} value={selectedKey} onChange={updateKey} /> : <p className="studio-muted">Select a diamond keyframe to edit its time, value and outgoing curve.</p>}
        </>}
      </aside>

      <StudioLivePreview experience={experience} active={active} setActive={setActive} progress={globalProgress} onProgressChange={(progress) => setPlayhead(localFromGlobal(progress, scene.range))} gizmo={gizmo} />
    </div>
  );
}

function KeyInspector({ track, value, onChange }: { track: MotionTrack; value: AnyKey; onChange: (changes: Partial<AnyKey>) => void }) {
  const curve = value.curve ?? [0.33, 0, 0.67, 1];
  return <div className="key-inspector">
    <h3>Keyframe / {value.id}</h3>
    <label>Time<input aria-label="Keyframe time" type="number" min="0" max="1" step="0.001" value={value.at} onChange={(event) => onChange({ at: Math.max(0, Math.min(1, Number(event.target.value))) })} /></label>
    <label>Outgoing easing<select aria-label="Keyframe easing" value={value.easing} onChange={(event) => onChange({ easing: event.target.value as MotionEasing })}>{["hold", "linear", "smooth", "ease-in", "ease-out", "ease-in-out", "cubic"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <ValueEditor track={track} value={value.value} onChange={(next) => onChange({ value: next })} />
    {value.easing === "cubic" && <CurveEditor value={curve} onChange={(next) => onChange({ curve: next })} />}
  </div>;
}

function ValueEditor({ track, value, onChange }: { track: MotionTrack; value: AnyKey["value"]; onChange: (value: AnyKey["value"]) => void }) {
  if (track.type === "vector") return <fieldset className="vector-control"><legend>Value</legend>{(["X", "Y", "Z"] as const).map((axis, index) => <label key={axis}>{axis}<input aria-label={`Keyframe ${axis}`} type="number" step="0.01" value={(value as Vec3)[index]} onChange={(event) => { const next = [...value as Vec3] as Vec3; next[index] = Number(event.target.value); onChange(next); }} /></label>)}</fieldset>;
  if (track.type === "color") return <label>Value<input aria-label="Keyframe color" type="color" value={value as string} onChange={(event) => onChange(event.target.value)} /></label>;
  if (track.type === "boolean") return <label className="studio-check"><input aria-label="Keyframe visibility" type="checkbox" checked={value as boolean} onChange={(event) => onChange(event.target.checked)} />Visible</label>;
  return <label>Value<input aria-label="Keyframe value" type="number" step="0.01" value={value as number} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function CurveEditor({ value, onChange }: { value: [number, number, number, number]; onChange: (value: [number, number, number, number]) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const handle = useRef<0 | 1 | null>(null);
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (handle.current === null || !svg.current) return;
    const rect = svg.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
    const next = [...value] as [number, number, number, number];
    if (handle.current === 0) { next[0] = x; next[1] = y; }
    else { next[2] = x; next[3] = y; }
    onChange(next);
  };
  return <div className="curve-editor">
    <span>Cubic Bezier handles</span>
    <div className="curve-presets">{curvePresets.map((preset) => <button type="button" key={preset.id} onClick={() => onChange([...preset.value])}>{preset.label}</button>)}</div>
    <svg ref={svg} viewBox="0 0 240 140" role="img" aria-label="Cubic Bezier curve editor" onPointerMove={move} onPointerUp={() => { handle.current = null; }} onPointerLeave={() => { handle.current = null; }}>
      <path className="curve-grid" d="M0 35H240M0 70H240M0 105H240M60 0V140M120 0V140M180 0V140" />
      <path className="curve-handles" d={`M0 140L${value[0] * 240} ${(1 - value[1]) * 140}M240 0L${value[2] * 240} ${(1 - value[3]) * 140}`} />
      <path className="curve-line" d={`M0 140 C${value[0] * 240} ${(1 - value[1]) * 140}, ${value[2] * 240} ${(1 - value[3]) * 140}, 240 0`} />
      <circle cx={value[0] * 240} cy={(1 - value[1]) * 140} r="7" onPointerDown={(event) => { handle.current = 0; event.currentTarget.setPointerCapture(event.pointerId); }} />
      <circle cx={value[2] * 240} cy={(1 - value[3]) * 140} r="7" onPointerDown={(event) => { handle.current = 1; event.currentTarget.setPointerCapture(event.pointerId); }} />
    </svg>
    <div className="curve-values">{value.map((item, index) => <label key={index}>{["x1", "y1", "x2", "y2"][index]}<input aria-label={`Curve ${["x1", "y1", "x2", "y2"][index]}`} type="number" min={index % 2 ? -2 : 0} max={index % 2 ? 3 : 1} step="0.01" value={Number(item.toFixed(3))} onChange={(event) => { const next = [...value] as [number, number, number, number]; next[index] = Number(event.target.value); onChange(next); }} /></label>)}</div>
  </div>;
}

function groupedOptions(options: MotionTargetOption[]) {
  return (["Camera", "Object", "Lighting", "Material", "DOM", "Media", "Model"] as const).map((group) => <optgroup key={group} label={group}>{options.filter((item) => item.group === group).map((item) => <option key={item.target} value={item.target}>{item.label}</option>)}</optgroup>);
}

function keysOf(track: MotionTrack) { return track.keyframes as AnyKey[]; }
function withKeys(track: MotionTrack, keys: AnyKey[]): MotionTrack { return { ...track, keyframes: [...keys].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)) } as MotionTrack; }
function replaceTracks(config: ExperienceConfig, sceneIndex: number, tracks: MotionTrack[]): ExperienceConfig { return { ...config, scenes: config.scenes.map((scene, index) => index === sceneIndex ? { ...scene, motionTracks: tracks } : scene) }; }
function selectionTokens(selection: Selection[]) { return new Set(selection.map((item) => `${item.trackId}:${item.keyId}`)); }
function sameSelection(a: Selection, b: Selection) { return a.trackId === b.trackId && a.keyId === b.keyId; }
function containsSelection(selection: Selection[], item: Selection) { return selection.some((candidate) => sameSelection(candidate, item)); }
function snapTime(value: number, snap: number) { const clamped = Math.max(0, Math.min(1, value)); return snap ? Number((Math.round(clamped / snap) * snap).toFixed(6)) : Number(clamped.toFixed(6)); }
function timeFromPointer(clientX: number, element: HTMLElement) { const rect = element.getBoundingClientRect(); return Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))); }
function localFromGlobal(progress: number, range: [number, number]) { return Math.max(0, Math.min(1, (progress - range[0]) / Math.max(0.000001, range[1] - range[0]))); }
function nextKeyId(track: MotionTrack) { let index = track.keyframes.length + 1; let id = `${track.id}-key-${index}`; const ids = new Set(keysOf(track).map((key) => key.id)); while (ids.has(id)) id = `${track.id}-key-${++index}`; return id; }
function uniqueTrack(existing: readonly MotionTrack[], input: MotionTrack) { let id = input.id; let index = 2; while (existing.some((track) => track.id === id)) id = `${input.id}-${index++}`; return { ...input, id, keyframes: keysOf(input).map((key, keyIndex) => ({ ...key, id: `${id}-key-${keyIndex + 1}` })) } as MotionTrack; }
