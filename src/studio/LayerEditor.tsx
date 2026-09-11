"use client";

import type { Dispatch, SetStateAction } from "react";
import { createMaskReveal } from "@/src/lib/maskReveal";
import { replaceScene } from "@/src/platform/studioPresets";
import type { ExperienceConfig, TransitionLayerDefinition } from "@/src/types/experience";

const referenceMedia = "/textures/reference/reveal-field.svg";

export function LayerEditor({ experience, setExperience, active, setActive }: { experience: ExperienceConfig; setExperience: Dispatch<SetStateAction<ExperienceConfig>>; active: number; setActive: (index: number) => void }) {
  const scene = experience.scenes[active];
  const layers = scene.media?.layers ?? [];
  const updateLayers = (next: TransitionLayerDefinition[]) => setExperience((current) => {
    const target = current.scenes[active];
    if (!target.media) return current;
    return replaceScene(current, active, { ...target, media: { ...target.media, layers: next } });
  });
  const addMedia = () => setExperience((current) => {
    const target = current.scenes[active];
    const mask = createMaskReveal("linear-soft");
    return replaceScene(current, active, { ...target, media: { kind: "image", src: referenceMedia, alt: "Forge transition composition", transition: "mask", blendColor: "#090909", maskSoftness: mask.softness, mask, layers: [], position: [50, 50], mobilePosition: [50, 50], overlap: .25, direction: "up", zoom: 1.04, textEnd: .28 } });
  });
  const addLayer = (kind: TransitionLayerDefinition["kind"]) => {
    const id = availableId(layers.map((layer) => layer.id));
    const base = { id, blendMode: "screen" as const, opacity: .55, range: [.15, .7] as [number, number], motion: "scale" as const };
    updateLayers([...layers, kind === "color" ? { ...base, kind, color: "#f97316" } : { ...base, kind, src: referenceMedia, position: [50, 50] }]);
  };
  const updateLayer = (index: number, changes: Partial<TransitionLayerDefinition>) => updateLayers(layers.map((layer, position) => position === index ? { ...layer, ...changes } as TransitionLayerDefinition : layer));

  return <div className="studio-grid studio-grid--layers">
    <section className="studio-card">
      <div className="studio-card__head"><div><span>TRANSITION STACK</span><h2>Image and color layers</h2></div><output>{layers.length} / 6</output></div>
      <label>Scene<select value={active} onChange={(event) => setActive(Number(event.target.value))}>{experience.scenes.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} / {item.label}</option>)}</select></label>
      {!scene.media ? <div className="layer-empty"><p>This scene needs a base media layer before overlays can be composed.</p><button type="button" className="studio-primary" onClick={addMedia}>Add reference media</button></div> : <>
        <div className="studio-actions"><button type="button" disabled={layers.length >= 6} onClick={() => addLayer("color")}>Add color flash</button><button type="button" disabled={layers.length >= 6} onClick={() => addLayer("image")}>Add image overlay</button></div>
        <ol className="layer-stack">{layers.map((layer, index) => <li key={layer.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{layer.id}</strong><small>{layer.kind} / {layer.blendMode}</small><button type="button" onClick={() => updateLayers(layers.filter((_, position) => position !== index))}>Remove</button></li>)}</ol>
      </>}
    </section>
    <section className="studio-card">
      <div className="studio-card__head"><div><span>LAYER INSPECTOR</span><h2>Timing and blend</h2></div><code>scene local 0 to 1</code></div>
      {!layers.length ? <p className="studio-muted">Add a layer to control its local timing envelope, blend mode and movement.</p> : layers.map((layer, index) => <details className="layer-inspector" key={layer.id} open={index === layers.length - 1}>
        <summary>{String(index + 1).padStart(2, "0")} / {layer.id}</summary>
        <label>Layer ID<input value={layer.id} onChange={(event) => updateLayer(index, { id: slug(event.target.value) })} /></label>
        {layer.kind === "color" ? <label>Color<input type="color" value={layer.color} onChange={(event) => updateLayer(index, { color: event.target.value })} /></label> : <><label>Image path<input value={layer.src} onChange={(event) => updateLayer(index, { src: event.target.value })} /></label><div className="studio-field-row"><label>Position X<input type="number" min="0" max="100" value={layer.position[0]} onChange={(event) => updateLayer(index, { position: [Number(event.target.value), layer.position[1]] })} /></label><label>Position Y<input type="number" min="0" max="100" value={layer.position[1]} onChange={(event) => updateLayer(index, { position: [layer.position[0], Number(event.target.value)] })} /></label></div></>}
        <div className="studio-field-row"><label>Blend mode<select value={layer.blendMode} onChange={(event) => updateLayer(index, { blendMode: event.target.value as TransitionLayerDefinition["blendMode"] })}><option>normal</option><option>multiply</option><option>screen</option><option>overlay</option></select></label><label>Motion<select value={layer.motion} onChange={(event) => updateLayer(index, { motion: event.target.value as TransitionLayerDefinition["motion"] })}><option>none</option><option>parallax-up</option><option>parallax-down</option><option>scale</option></select></label></div>
        <LayerRange label="Opacity" value={layer.opacity} min={0} max={1} step={.01} onChange={(opacity) => updateLayer(index, { opacity })} />
        <LayerRange label="Start" value={layer.range[0]} min={0} max={Math.max(0, layer.range[1] - .01)} step={.01} onChange={(start) => updateLayer(index, { range: [start, layer.range[1]] })} />
        <LayerRange label="End" value={layer.range[1]} min={Math.min(1, layer.range[0] + .01)} max={1} step={.01} onChange={(end) => updateLayer(index, { range: [layer.range[0], end] })} />
      </details>)}
    </section>
  </div>;
}

function LayerRange({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="layer-range"><span>{label}<output>{value.toFixed(2)}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function availableId(ids: string[]) {
  let number = ids.length + 1;
  while (ids.includes(`layer-${number}`)) number += 1;
  return `layer-${number}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "layer";
}
