"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createMotionArchetype, motionArchetypeCatalog, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { createTrackForTarget, motionTargetOptions, type MotionTargetOption } from "@/src/platform/motionPresets";
import type { ExperienceConfig, MotionEasing, MotionTrack, MotionViewport, Vec3 } from "@/src/types/experience";

type KeyValue = number | boolean | string | Vec3;
type AnyKey = {
  id: string;
  at: number;
  value: KeyValue;
  easing: MotionEasing;
  curve?: [number, number, number, number];
};

export function AnimatePanel({
  experience,
  setExperience,
  active,
  previewProgress,
  onPreviewProgress,
  beginGroup,
  endGroup,
  undo,
  redo,
  canUndo,
  canRedo,
  onOpenSequencer,
  onClose,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  previewProgress: number;
  onPreviewProgress: (value: number) => void;
  beginGroup: () => void;
  endGroup: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSequencer: () => void;
  onClose: () => void;
}) {
  const scene = experience.scenes[active];
  const options = useMemo(() => motionTargetOptions(experience, scene), [experience, scene]);
  const [archetype, setArchetype] = useState<MotionArchetypeName>("editorial-reveal");
  const [target, setTarget] = useState<string>("camera.position");
  const [viewport, setViewport] = useState<MotionViewport>("all");
  const [selectedTrackId, setSelectedTrackId] = useState(scene.motionTracks[0]?.id ?? "");
  const [notice, setNotice] = useState("");

  const selectedTrack = scene.motionTracks.find((track) => track.id === selectedTrackId) ?? scene.motionTracks[0] ?? null;
  const selectedKeys = selectedTrack ? keysOf(selectedTrack) : [];
  const startKey = selectedKeys[0];
  const endKey = selectedKeys[selectedKeys.length - 1];

  const commitTracks = (tracks: MotionTrack[], message?: string) => {
    beginGroup();
    setExperience((current) => ({
      ...current,
      scenes: current.scenes.map((item, index) => index === active ? { ...item, motionTracks: tracks } : item),
    }));
    endGroup();
    if (message) setNotice(message);
  };

  const applyArchetype = () => {
    const incoming = createMotionArchetype(archetype, experience, active);
    if (!incoming.length) {
      setNotice("This motion recipe has no applicable tracks for the current scene.");
      return;
    }
    const replaced = new Set(incoming.map((track) => trackKey(track)));
    const preserved = scene.motionTracks.filter((track) => !replaced.has(trackKey(track)));
    const next: MotionTrack[] = [...preserved];
    for (const track of incoming) next.push(uniqueTrack(next, track));
    commitTracks(next, `${motionArchetypeCatalog.find((item) => item.id === archetype)?.label ?? archetype} applied · ${incoming.length} track${incoming.length === 1 ? "" : "s"}`);
    setSelectedTrackId(next[preserved.length]?.id ?? next[0]?.id ?? "");
  };

  const addPropertyTrack = () => {
    const option = options.find((item) => item.target === target);
    if (!option) return;
    const existing = scene.motionTracks.find((track) => track.target === option.target && track.viewport === viewport);
    if (existing) {
      setSelectedTrackId(existing.id);
      setNotice("That property already has a track. I selected it below.");
      return;
    }
    const created = createTrackForTarget(experience, active, option, viewport);
    const track = uniqueTrack(scene.motionTracks, created);
    commitTracks([...scene.motionTracks, track], `${track.label} added. Edit its start and end states below.`);
    setSelectedTrackId(track.id);
  };

  const updateSelectedTrack = (next: MotionTrack, message?: string) => {
    commitTracks(scene.motionTracks.map((track) => track.id === next.id ? next : track), message);
  };

  const updateEndpoint = (which: "start" | "end", changes: Partial<AnyKey>) => {
    if (!selectedTrack || !selectedKeys.length) return;
    const endpoint = which === "start" ? startKey : endKey;
    if (!endpoint) return;
    const nextKeys = selectedKeys.map((key) => key.id === endpoint.id ? { ...key, ...changes } : key);
    updateSelectedTrack(withKeys(selectedTrack, nextKeys));
  };

  const updateEndpointTime = (which: "start" | "end", value: number) => {
    if (!selectedTrack || !startKey || !endKey) return;
    const keys = selectedKeys;
    if (which === "start") {
      const ceiling = keys[1]?.at ?? endKey.at;
      updateEndpoint("start", { at: clamp(value, 0, Math.max(0, ceiling - 0.001)) });
    } else {
      const floor = keys[keys.length - 2]?.at ?? startKey.at;
      updateEndpoint("end", { at: clamp(value, Math.min(1, floor + 0.001), 1) });
    }
  };

  const removeSelectedTrack = () => {
    if (!selectedTrack) return;
    const next = scene.motionTracks.filter((track) => track.id !== selectedTrack.id);
    commitTracks(next, `${selectedTrack.label} removed.`);
    setSelectedTrackId(next[0]?.id ?? "");
  };

  return <section className="production-animate-panel" aria-labelledby="animate-panel-title">
    <header className="production-animate-panel__head">
      <div><span>ANIMATE</span><h2 id="animate-panel-title">Make something move.</h2><p>Choose a motion recipe or animate one property directly. Scrub the live preview while you edit.</p></div>
      <button type="button" aria-label="Close Animate" onClick={onClose}>×</button>
    </header>

    <div className="production-animate-panel__grid">
      <section className="production-animate-card">
        <div className="production-animate-card__head"><span>01</span><strong>Scene motion</strong></div>
        <label>Motion recipe
          <select aria-label="Animate motion recipe" value={archetype} onChange={(event) => setArchetype(event.target.value as MotionArchetypeName)}>
            {motionArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <p>{motionArchetypeCatalog.find((item) => item.id === archetype)?.description}</p>
        <button type="button" className="primary" onClick={applyArchetype}>Apply to scene</button>
      </section>

      <section className="production-animate-card">
        <div className="production-animate-card__head"><span>02</span><strong>Animate a property</strong></div>
        <label>What moves?
          <select aria-label="Animate target" value={target} onChange={(event) => setTarget(event.target.value)}>
            {groupedOptions(options)}
          </select>
        </label>
        <label>Viewport
          <select aria-label="Animate viewport" value={viewport} onChange={(event) => setViewport(event.target.value as MotionViewport)}>
            <option value="all">All viewports</option>
            <option value="desktop">Desktop only</option>
            <option value="mobile">Mobile only</option>
          </select>
        </label>
        <button type="button" onClick={addPropertyTrack}>Add property track</button>
      </section>

      <section className="production-animate-card production-animate-card--preview">
        <div className="production-animate-card__head"><span>03</span><strong>Preview</strong><output>{Math.round(previewProgress * 100)}%</output></div>
        <input aria-label="Animate preview progress" type="range" min="0" max="1" step="0.001" value={previewProgress} onChange={(event) => onPreviewProgress(Number(event.target.value))} />
        <div className="production-animate-preview-points"><button type="button" onClick={() => onPreviewProgress(0)}>Start</button><button type="button" onClick={() => onPreviewProgress(.5)}>Middle</button><button type="button" onClick={() => onPreviewProgress(1)}>End</button></div>
      </section>
    </div>

    <div className="production-animate-editor">
      <aside className="production-animate-tracks" aria-label="Animated properties">
        <div className="production-animate-card__head"><span>TRACKS</span><strong>{scene.motionTracks.length}</strong></div>
        {scene.motionTracks.length ? scene.motionTracks.map((track) => <button type="button" key={track.id} className={selectedTrack?.id === track.id ? "active" : ""} onClick={() => setSelectedTrackId(track.id)}><strong>{track.label}</strong><small>{track.target} · {track.viewport}</small></button>) : <p>No motion yet. Apply a recipe or add a property.</p>}
      </aside>

      <section className="production-animate-inspector" aria-label="Simple motion inspector">
        {selectedTrack && startKey && endKey ? <>
          <div className="production-animate-card__head"><span>EDIT</span><strong>{selectedTrack.label}</strong><small>{selectedTrack.type}</small></div>
          {selectedKeys.length > 2 && <p className="production-animate-note">This track has {selectedKeys.length} keys. Simple Animate edits the first and last states; use the Sequencer for intermediate beats.</p>}
          <div className="production-animate-time-row">
            <label>Start time<input aria-label="Animate start time" type="number" min="0" max="1" step="0.01" value={Number(startKey.at.toFixed(3))} onChange={(event) => updateEndpointTime("start", Number(event.target.value))} /></label>
            <label>End time<input aria-label="Animate end time" type="number" min="0" max="1" step="0.01" value={Number(endKey.at.toFixed(3))} onChange={(event) => updateEndpointTime("end", Number(event.target.value))} /></label>
            <label>Easing<select aria-label="Animate easing" value={startKey.easing} onChange={(event) => updateEndpoint("start", { easing: event.target.value as MotionEasing })}>{["hold","linear","smooth","ease-in","ease-out","ease-in-out","cubic"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <div className="production-animate-values">
            <EndpointEditor label="Start" track={selectedTrack} value={startKey.value} onChange={(value) => updateEndpoint("start", { value })} />
            <EndpointEditor label="End" track={selectedTrack} value={endKey.value} onChange={(value) => updateEndpoint("end", { value })} />
          </div>
          <div className="production-animate-actions">
            <button type="button" onClick={undo} disabled={!canUndo}>Undo</button>
            <button type="button" onClick={redo} disabled={!canRedo}>Redo</button>
            <button type="button" onClick={removeSelectedTrack}>Remove track</button>
            <button type="button" className="primary" onClick={onOpenSequencer}>Open full Sequencer</button>
          </div>
        </> : <div className="production-animate-empty"><strong>Choose something to animate.</strong><p>Add a property track or apply a scene motion recipe. The controls will appear here immediately.</p></div>}
      </section>
    </div>

    {notice && <p className="production-animate-notice" role="status">{notice}</p>}
  </section>;
}

function EndpointEditor({ label, track, value, onChange }: { label: string; track: MotionTrack; value: KeyValue; onChange: (value: KeyValue) => void }) {
  if (track.type === "vector") {
    const vector = value as Vec3;
    return <fieldset><legend>{label}</legend>{(["X","Y","Z"] as const).map((axis, index) => <label key={axis}>{axis}<input aria-label={`Animate ${label} ${axis}`} type="number" step="0.01" value={vector[index]} onChange={(event) => { const next = [...vector] as Vec3; next[index] = Number(event.target.value); onChange(next); }} /></label>)}</fieldset>;
  }
  if (track.type === "color") return <label>{label}<input aria-label={`Animate ${label} color`} type="color" value={String(value)} onChange={(event) => onChange(event.target.value)} /></label>;
  if (track.type === "boolean") return <label className="studio-check"><input aria-label={`Animate ${label} visibility`} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{label} visible</label>;
  return <label>{label}<input aria-label={`Animate ${label} value`} type="number" step="0.01" value={Number(value)} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function groupedOptions(options: MotionTargetOption[]) {
  return (["Camera","Object","Lighting","Material","DOM","Media","Model"] as const).map((group) => <optgroup key={group} label={group}>{options.filter((item) => item.group === group).map((item) => <option key={item.target} value={item.target}>{item.label}</option>)}</optgroup>);
}

function keysOf(track: MotionTrack): AnyKey[] {
  return track.keyframes as unknown as AnyKey[];
}

function withKeys(track: MotionTrack, keys: AnyKey[]): MotionTrack {
  return { ...track, keyframes: [...keys].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)) } as MotionTrack;
}

function trackKey(track: MotionTrack) {
  return `${track.viewport}:${track.target}`;
}

function uniqueTrack(existing: readonly MotionTrack[], input: MotionTrack): MotionTrack {
  if (!existing.some((track) => track.id === input.id)) return input;
  let index = 2;
  let id = `${input.id}-${index}`;
  while (existing.some((track) => track.id === id)) id = `${input.id}-${++index}`;
  return { ...input, id, keyframes: keysOf(input).map((key, keyIndex) => ({ ...key, id: `${id}-key-${keyIndex + 1}` })) } as MotionTrack;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
