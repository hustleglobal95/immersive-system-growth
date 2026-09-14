"use client";
import { useMemo, useState } from "react";
import rawCinematic from "@/config/cinematic-systems.json";
import rawExperience from "@/config/experience.json";
import { parseCinematicSystems, type CinematicSceneConfig } from "@/src/lib/cinematic/schema";
import { cinematicPresets } from "@/src/lib/cinematic/presets";
import { parseExperience } from "@/src/lib/configSchema";
import { downloadJson } from "@/src/studio/useStudioDraft";

const defaults=parseCinematicSystems(rawCinematic),sceneIds=parseExperience(rawExperience).scenes.map(scene=>scene.id);
export function CinematicSystemsPanel(){
  const [manifest,setManifest]=useState(defaults),[selected,setSelected]=useState(sceneIds[0]??"");
  const scene=useMemo(()=>manifest.scenes.find(item=>item.id===selected)??null,[manifest,selected]);
  const update=(next:CinematicSceneConfig)=>setManifest(current=>({...current,scenes:[...current.scenes.filter(item=>item.id!==selected),next]}));
  const ensure=()=>scene??({id:selected,procedural:[],occlusion:[]} as CinematicSceneConfig);
  const apply=(name:"threshold"|"technical"|"editorial"|"material")=>update(name==="threshold"?cinematicPresets.architecturalThreshold(selected):name==="technical"?cinematicPresets.technicalReveal(selected):name==="editorial"?cinematicPresets.editorialTransition(selected):cinematicPresets.luxuryMaterial(selected));
  return <section className="studio-card visual-system-editor" aria-labelledby="cinematic-systems-heading">
    <header className="studio-card__head"><div><span>CINEMATIC AUTHORING</span><h2 id="cinematic-systems-heading">Cinematic systems</h2></div><div className="visual-system-editor__actions"><button type="button" onClick={()=>downloadJson("cinematic-systems.json",manifest)}>Export cinematic systems</button><button type="button" onClick={()=>setManifest(defaults)}>Reset defaults</button></div></header>
    <p>Author reusable stack depth, physical motion, reveal fields, spatial imagery, procedural graphics, foreground occlusion and technical diagrams without scene-specific runtime code.</p>
    <div className="visual-system-editor__fields">
      <label>Scene<select value={selected} onChange={event=>setSelected(event.target.value)}>{sceneIds.map(id=><option key={id}>{id}</option>)}</select></label>
      <label>Preset<select defaultValue="" onChange={event=>{const value=event.target.value as "threshold"|"technical"|"editorial"|"material"|"";if(value)apply(value);event.currentTarget.value="";}}><option value="">Apply preset…</option><option value="threshold">Architectural Threshold</option><option value="technical">Technical Reveal</option><option value="editorial">Editorial Transition</option><option value="material">Luxury Material</option></select></label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.stack} onChange={event=>{const next=ensure();update({...next,stack:event.target.checked?(next.stack??{enabled:true,scaleTo:.9,darkenTo:.55,depth:80,overlap:.22,pin:true}):undefined});}}/> Stack engine</label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.reveal} onChange={event=>{const next=ensure();update({...next,reveal:event.target.checked?(next.reveal??{effect:"liquid",direction:"right",softness:.14,intensity:1,pointerInfluence:.5,trailInfluence:.5,edgeColor:"#f97316",edgeWidth:.01,seed:47,range:[0,1]}):undefined});}}/> Reveal engine</label>
    </div>
    {scene?.stack&&<div className="visual-system-editor__fields"><label>Scale to<input type="number" min="0.65" max="1" step="0.01" value={scene.stack.scaleTo} onChange={event=>update({...scene,stack:{...scene.stack!,scaleTo:Number(event.target.value)}})}/></label><label>Darken<input type="number" min="0" max="0.9" step="0.01" value={scene.stack.darkenTo} onChange={event=>update({...scene,stack:{...scene.stack!,darkenTo:Number(event.target.value)}})}/></label><label>Depth<input type="number" min="0" max="240" step="1" value={scene.stack.depth} onChange={event=>update({...scene,stack:{...scene.stack!,depth:Number(event.target.value)}})}/></label></div>}
    {scene?.reveal&&<div className="visual-system-editor__fields"><label>Reveal<select value={scene.reveal.effect} onChange={event=>update({...scene,reveal:{...scene.reveal!,effect:event.target.value as NonNullable<CinematicSceneConfig["reveal"]>["effect"]}})}>{["liquid","contour","burn","radial","directional","particle","wireframe"].map(value=><option key={value}>{value}</option>)}</select></label><label>Pointer response<input type="number" min="0" max="2" step="0.05" value={scene.reveal.pointerInfluence} onChange={event=>update({...scene,reveal:{...scene.reveal!,pointerInfluence:Number(event.target.value)}})}/></label><label>Trail response<input type="number" min="0" max="2" step="0.05" value={scene.reveal.trailInfluence} onChange={event=>update({...scene,reveal:{...scene.reveal!,trailInfluence:Number(event.target.value)}})}/></label></div>}
    <div className="studio-message"><strong>{scene?.id??selected}</strong> · {scene?[scene.stack&&"Stack",scene.spring&&"Spring",scene.reveal&&"Reveal",scene.spatial&&"Spatial",scene.procedural.length&&`${scene.procedural.length} procedural`,scene.occlusion.length&&`${scene.occlusion.length} occlusion`,scene.diagram&&"Diagram"].filter(Boolean).join(" · ")||"No cinematic systems":"No cinematic config yet"}</div>
  </section>;
}
