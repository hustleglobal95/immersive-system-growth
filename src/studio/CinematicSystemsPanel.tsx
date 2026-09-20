"use client";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { parseCinematicSystems, type CinematicSceneConfig, type CinematicSystemsManifest } from "@/src/lib/cinematic/schema";
import { cinematicPresets } from "@/src/lib/cinematic/presets";
import { cinematicSystems as productionCinematicSystems } from "@/src/lib/cinematic/config";
import { downloadJson } from "@/src/studio/useStudioDraft";
import type { ExperienceConfig } from "@/src/types/experience";

export function CinematicSystemsPanel({
  manifest,
  setManifest,
  experience,
  activeScene=0,
  onSelectScene,
}:{
  manifest:CinematicSystemsManifest;
  setManifest:Dispatch<SetStateAction<CinematicSystemsManifest>>;
  experience:ExperienceConfig;
  activeScene?:number;
  onSelectScene?:(index:number)=>void;
}){
  const sceneIds=experience.scenes.map((scene)=>scene.id);
  const activeId=experience.scenes[activeScene]?.id??sceneIds[0]??"";
  const [localSelected,setLocalSelected]=useState(activeId);
  const [validationMessage,setValidationMessage]=useState("");
  const selected=onSelectScene ? activeId : (sceneIds.includes(localSelected)?localSelected:sceneIds[0]??"");
  const scene=useMemo(()=>manifest.scenes.find(item=>item.id===selected)??null,[manifest,selected]);
  const update=(next:CinematicSceneConfig)=>setManifest(current=>{
    const candidate={...current,scenes:[...current.scenes.filter(item=>item.id!==selected),next]};
    const parsed=parseCinematicSystemsSafe(candidate);
    if(!parsed.ok){
      setValidationMessage(parsed.message);
      return current;
    }
    setValidationMessage("");
    return parsed.value;
  });
  const ensure=()=>scene??({id:selected,procedural:[],occlusion:[]} as CinematicSceneConfig);
  const apply=(name:"threshold"|"technical"|"editorial"|"material"|"cursor"|"warp"|"refract"|"transition"|"physics")=>{
    if(name==="threshold")return update(cinematicPresets.architecturalThreshold(selected));
    if(name==="technical")return update(cinematicPresets.technicalReveal(selected));
    if(name==="editorial")return update(cinematicPresets.editorialTransition(selected));
    if(name==="cursor")return update(cinematicPresets.cursorReveal(selected));
    if(name==="warp")return update(cinematicPresets.warpSurface(selected));
    if(name==="refract")return update(cinematicPresets.refractiveSurface(selected));
    if(name==="transition")return update(cinematicPresets.shaderTransition(selected));
    if(name==="physics")return update(cinematicPresets.visualPhysics(selected));
    return update(cinematicPresets.luxuryMaterial(selected));
  };
  return <section className="studio-card visual-system-editor" aria-labelledby="cinematic-systems-heading">
    <header className="studio-card__head"><div><span>CINEMATIC AUTHORING · LIVE DRAFT</span><h2 id="cinematic-systems-heading">Visual Effects</h2></div><div className="visual-system-editor__actions"><output data-status="live">LIVE</output><button type="button" onClick={()=>downloadJson("cinematic-systems.json",manifest)}>Download backup</button><button type="button" onClick={()=>{const base=productionCinematicSystems.scenes.find((item)=>item.id===selected);setManifest((current)=>parseCinematicSystems({...current,scenes:[...current.scenes.filter((item)=>item.id!==selected),...(base?[base]:[])]}));}}>Reset scene</button></div></header>
    <p>Every change below writes directly to the current Studio draft and the live production compositor. Download is only an optional backup.</p>
    <div className="visual-system-editor__fields">
      <label>Scene<select aria-label="Visual Effects scene" value={selected} onChange={event=>{const id=event.target.value;const index=experience.scenes.findIndex((item)=>item.id===id);if(onSelectScene&&index>=0)onSelectScene(index);else setLocalSelected(id);}}>{experience.scenes.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Preset<select defaultValue="" onChange={event=>{const value=event.target.value as "threshold"|"technical"|"editorial"|"material"|"cursor"|"warp"|"refract"|"transition"|"physics"|"";if(value)apply(value);event.currentTarget.value="";}}><option value="">Apply preset…</option><option value="threshold">Architectural Threshold</option><option value="technical">Technical Reveal</option><option value="editorial">Editorial Transition</option><option value="material">Luxury Material</option><option value="cursor">Cursor Reveal</option><option value="warp">Warp Surface</option><option value="refract">Refractive Surface</option><option value="transition">Shader Transition</option><option value="physics">Visual Physics Stack</option></select></label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.stack} onChange={event=>{const next=ensure();update({...next,stack:event.target.checked?(next.stack??{enabled:true,scaleTo:.9,darkenTo:.55,depth:80,overlap:.22,pin:true}):undefined});}}/> Stack engine</label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.reveal} onChange={event=>{const next=ensure();update({...next,reveal:event.target.checked?(next.reveal??{effect:"liquid",direction:"right",softness:.14,intensity:1,pointerInfluence:.5,trailInfluence:.5,edgeColor:"#f97316",edgeWidth:.01,seed:47,range:[0,1]}):undefined});}}/> Reveal engine</label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.cursorReveal} onChange={event=>{const next=ensure();update({...next,cursorReveal:event.target.checked?(next.cursorReveal??cinematicPresets.cursorReveal(selected).cursorReveal):undefined});}}/> Cursor reveal</label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.warp} onChange={event=>{const next=ensure();update({...next,warp:event.target.checked?(next.warp??cinematicPresets.warpSurface(selected).warp):undefined});}}/> Warp surface</label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.refraction} onChange={event=>{const next=ensure();update({...next,refraction:event.target.checked?(next.refraction??cinematicPresets.refractiveSurface(selected).refraction):undefined});}}/> Refractive surface</label>
      <label className="studio-check"><input type="checkbox" checked={!!scene?.sceneTransition} onChange={event=>{const next=ensure();update({...next,sceneTransition:event.target.checked?(next.sceneTransition??cinematicPresets.shaderTransition(selected).sceneTransition):undefined});}}/> Scene transition</label>
    </div>
    {scene?.stack&&<div className="visual-system-editor__fields"><label>Scale to<input type="number" min="0.65" max="1" step="0.01" value={scene.stack.scaleTo} onChange={event=>update({...scene,stack:{...scene.stack!,scaleTo:Number(event.target.value)}})}/></label><label>Darken<input type="number" min="0" max="0.9" step="0.01" value={scene.stack.darkenTo} onChange={event=>update({...scene,stack:{...scene.stack!,darkenTo:Number(event.target.value)}})}/></label><label>Depth<input type="number" min="0" max="240" step="1" value={scene.stack.depth} onChange={event=>update({...scene,stack:{...scene.stack!,depth:Number(event.target.value)}})}/></label></div>}
    {scene?.reveal&&<div className="visual-system-editor__fields"><label>Reveal<select value={scene.reveal.effect} onChange={event=>update({...scene,reveal:{...scene.reveal!,effect:event.target.value as NonNullable<CinematicSceneConfig["reveal"]>["effect"]}})}>{["liquid","contour","burn","radial","directional","particle","wireframe"].map(value=><option key={value}>{value}</option>)}</select></label><label>Pointer response<input type="number" min="0" max="2" step="0.05" value={scene.reveal.pointerInfluence} onChange={event=>update({...scene,reveal:{...scene.reveal!,pointerInfluence:Number(event.target.value)}})}/></label><label>Trail response<input type="number" min="0" max="2" step="0.05" value={scene.reveal.trailInfluence} onChange={event=>update({...scene,reveal:{...scene.reveal!,trailInfluence:Number(event.target.value)}})}/></label></div>}{scene?.cursorReveal&&<div className="visual-system-editor__fields"><label>Cursor mode<select value={scene.cursorReveal.mode} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,mode:event.target.value as NonNullable<CinematicSceneConfig["cursorReveal"]>["mode"]}})}>{["lens","trail","fluid"].map(value=><option key={value}>{value}</option>)}</select></label><label>Reveal media<input type="text" value={scene.cursorReveal.src} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,src:event.target.value}})}/></label><label>Brush<input type="number" min="0.01" max="0.5" step="0.01" value={scene.cursorReveal.brushSize} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,brushSize:Number(event.target.value)}})}/></label><label>Linger ms<input type="number" min="0" max="10000" step="20" value={scene.cursorReveal.lingerMs} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,lingerMs:Number(event.target.value)}})}/></label><label>Fade seconds<input type="number" min="0.05" max="20" step="0.05" value={scene.cursorReveal.fadeSeconds} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,fadeSeconds:Number(event.target.value)}})}/></label><label>Touch<select value={scene.cursorReveal.touch} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,touch:event.target.value as NonNullable<CinematicSceneConfig["cursorReveal"]>["touch"]}})}>{["disabled","drag","always"].map(value=><option key={value}>{value}</option>)}</select></label><label>Renderer<select value={scene.cursorReveal.renderer} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,renderer:event.target.value as NonNullable<CinematicSceneConfig["cursorReveal"]>["renderer"]}})}>{["auto","gpu","canvas"].map(value=><option key={value}>{value}</option>)}</select></label>{scene.cursorReveal.mode==="fluid"&&<><label>Fluid resolution<input type="number" min="64" max="512" step="16" value={scene.cursorReveal.fluidResolution} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,fluidResolution:Number(event.target.value)}})}/></label><label>Curl<input type="number" min="0" max="50" step="1" value={scene.cursorReveal.curl} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,curl:Number(event.target.value)}})}/></label><label>Splat force<input type="number" min="0" max="12" step="0.25" value={scene.cursorReveal.splatForce} onChange={event=>update({...scene,cursorReveal:{...scene.cursorReveal!,splatForce:Number(event.target.value)}})}/></label></>}</div>}
    {scene?.warp&&<div className="visual-system-editor__fields"><label>Warp mode<select value={scene.warp.mode} onChange={event=>update({...scene,warp:{...scene.warp!,mode:event.target.value as NonNullable<CinematicSceneConfig["warp"]>["mode"]}})}>{["elastic","cloth","water","heat","shockwave"].map(value=><option key={value}>{value}</option>)}</select></label><label>Warp strength<input type="number" min="0" max="2.5" step="0.02" value={scene.warp.strength} onChange={event=>update({...scene,warp:{...scene.warp!,strength:Number(event.target.value)}})}/></label><label>Warp radius<input type="number" min="0.02" max="1" step="0.02" value={scene.warp.radius} onChange={event=>update({...scene,warp:{...scene.warp!,radius:Number(event.target.value)}})}/></label><label>Velocity response<input type="number" min="0" max="3" step="0.05" value={scene.warp.velocityInfluence} onChange={event=>update({...scene,warp:{...scene.warp!,velocityInfluence:Number(event.target.value)}})}/></label></div>}
    {scene?.refraction&&<div className="visual-system-editor__fields"><label>Refraction mode<select value={scene.refraction.mode} onChange={event=>update({...scene,refraction:{...scene.refraction!,mode:event.target.value as NonNullable<CinematicSceneConfig["refraction"]>["mode"]}})}>{["lens","panel","liquid"].map(value=><option key={value}>{value}</option>)}</select></label><label>Refraction strength<input type="number" min="0" max="2" step="0.02" value={scene.refraction.strength} onChange={event=>update({...scene,refraction:{...scene.refraction!,strength:Number(event.target.value)}})}/></label><label>Dispersion<input type="number" min="0" max="0.08" step="0.001" value={scene.refraction.dispersion} onChange={event=>update({...scene,refraction:{...scene.refraction!,dispersion:Number(event.target.value)}})}/></label><label>Sheen<input type="number" min="0" max="2" step="0.02" value={scene.refraction.sheen} onChange={event=>update({...scene,refraction:{...scene.refraction!,sheen:Number(event.target.value)}})}/></label></div>}
    {scene?.sceneTransition&&<div className="visual-system-editor__fields"><label>Transition effect<select value={scene.sceneTransition.effect} onChange={event=>update({...scene,sceneTransition:{...scene.sceneTransition!,effect:event.target.value as NonNullable<CinematicSceneConfig["sceneTransition"]>["effect"]}})}>{["ripple","liquid","noise","pixel","chromatic","directional","iris","slats","grain","depth"].map(value=><option key={value}>{value}</option>)}</select></label><label>Transition target<input type="text" placeholder="Next image scene" value={scene.sceneTransition.src??""} onChange={event=>update({...scene,sceneTransition:{...scene.sceneTransition!,src:event.target.value||undefined}})}/></label><label>Transition start<input type="number" min="0" max="0.99" step="0.01" value={scene.sceneTransition.range[0]} onChange={event=>update({...scene,sceneTransition:{...scene.sceneTransition!,range:[Number(event.target.value),scene.sceneTransition!.range[1]]}})}/></label><label>Transition displacement<input type="number" min="0" max="0.25" step="0.005" value={scene.sceneTransition.displacement} onChange={event=>update({...scene,sceneTransition:{...scene.sceneTransition!,displacement:Number(event.target.value)}})}/></label><label>Transition chromatic<input type="number" min="0" max="0.08" step="0.001" value={scene.sceneTransition.chromaticAberration} onChange={event=>update({...scene,sceneTransition:{...scene.sceneTransition!,chromaticAberration:Number(event.target.value)}})}/></label></div>}
    {validationMessage&&<p className="studio-warning" role="alert">{validationMessage}</p>}
    <div className="studio-message"><strong>{scene?.id??selected}</strong> · {scene?[scene.stack&&"Stack",scene.spring&&"Spring",scene.reveal&&"Reveal",scene.cursorReveal&&`Cursor ${scene.cursorReveal.mode}`,scene.warp&&`Warp ${scene.warp.mode}`,scene.refraction&&`Refract ${scene.refraction.mode}`,scene.sceneTransition&&`Transition ${scene.sceneTransition.effect}`,scene.spatial&&"Spatial",scene.procedural.length&&`${scene.procedural.length} procedural`,scene.occlusion.length&&`${scene.occlusion.length} occlusion`,scene.diagram&&"Diagram"].filter(Boolean).join(" · ")||"No cinematic systems":"No cinematic config yet"}</div>
  </section>;
}


function parseCinematicSystemsSafe(input:unknown):{ok:true;value:CinematicSystemsManifest}|{ok:false;message:string}{
  try{
    return {ok:true,value:parseCinematicSystems(input)};
  }catch(error){
    if(error && typeof error==="object" && "issues" in error){
      const issues=(error as {issues?:Array<{path?:PropertyKey[];message?:string}>}).issues??[];
      return {ok:false,message:issues.slice(0,3).map((issue)=>`${issue.path?.join(".")||"visual effect"}: ${issue.message||"Invalid value"}`).join(" · ")||"Visual effect value is invalid."};
    }
    return {ok:false,message:error instanceof Error?error.message:"Visual effect value is invalid."};
  }
}
