"use client";
import { useState } from "react";
import type { CreativeDirection } from "@/src/platform/creativeDirectionSchema";

export function CreativeDirectionPanel({ direction, setDirection }: { direction: CreativeDirection; setDirection: (value: CreativeDirection) => void }) {
  const [draft, setDraft] = useState(JSON.stringify(direction, null, 2));
  const apply = () => { try { const next = JSON.parse(draft) as CreativeDirection; setDirection(next); } catch { /* keep invalid draft visible */ } };
  return <section className="studio-panel"><header><span>CREATIVE DIRECTION</span><h2>{direction.concept}</h2></header><p>Brief, narrative, visual language and scene intent govern the runtime.</p><textarea aria-label="Creative direction JSON" value={draft} onChange={e=>setDraft(e.target.value)} rows={22} /><button type="button" onClick={apply}>Apply direction</button><div className="studio-grid">{direction.scenes.map(scene=><article key={scene.id}><strong>{scene.id}</strong><p>{scene.purpose}</p><small>{scene.transitionIn} → {scene.transitionOut}</small></article>)}</div></section>;
}
