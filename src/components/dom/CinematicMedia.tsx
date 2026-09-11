"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { getSceneIndex } from "@/src/lib/experience";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { getMediaPanelWindow, sampleMediaPanel } from "@/src/lib/mediaPanels";
import { createCssMaskStyle, createMaskReveal, resolveMaskBackend } from "@/src/lib/maskReveal";
import { useExperienceStore } from "@/src/store/experienceStore";

export function CinematicMedia() {
  const experience = useExperienceConfig();
  const root = useRef<HTMLDivElement>(null);
  const preview = useExperienceStore(s=>s.mediaPreview);
  const reduced = useExperienceStore(s=>s.reducedMotion);
  const quality = useExperienceStore(s=>s.quality);
  const webglStatus = useExperienceStore(s=>s.webglStatus);
  const [active,setActive] = useState(0);
  const progress = useRef(0);
  useEffect(()=>{
    if(reduced) return;
    const update=(p:number)=>{progress.current=p;setActive(getSceneIndex(p,experience));};
    update(useExperienceStore.getState().progress);
    const frame=cinematicProgress.subscribe(update);
    const fallback=useExperienceStore.subscribe(s=>{if(s.webglStatus!=="ready")update(s.progress);});
    return ()=>{frame();fallback();};
  },[experience,reduced]);
  useEffect(()=>{
    const element=root.current;
    if(!element || reduced) return;
    const compact=matchMedia("(max-width: 760px)");
    const panels=Array.from(element.querySelectorAll<HTMLElement>("[data-media-panel]"));
    const tracks=panels.map(panel=>{
      const index=Number(panel.dataset.mediaPanel),scene=experience.scenes[index];
      const image=panel.querySelector<HTMLElement>(".media-panel__inner")!;
      const video=panel.querySelector("video");
      let playing=false;
      const mask=scene.media?.transition==="mask"?createMaskReveal(scene.media.mask?.preset??"linear-soft",scene.media.mask??{softness:scene.media.maskSoftness}):null;
      return {panel,image,video,mask,
        window:getMediaPanelWindow(experience.scenes,index),
        panelY:gsap.quickSetter(panel,"yPercent"),imageY:gsap.quickSetter(image,"yPercent"),scale:gsap.quickSetter(image,"scale"),
        playback(visible:boolean){const play=visible&&!document.hidden;if(!video||play===playing)return;playing=play;if(play)void video.play().catch(()=>{/* Keep poster; don't retry a blocked play every frame. */});else video.pause();},
      };
    });
    const render=(p:number)=>{
      for(const t of tracks){const state=sampleMediaPanel(p,t.window,compact.matches);t.panel.style.visibility=state.visible?"visible":"hidden";t.panel.style.opacity=String(state.opacity);t.panel.style.filter=`blur(${state.blur}px)`;t.panel.style.clipPath=state.transition==="curtain"?`inset(${state.clip/2}% 0 ${state.clip/2}% 0)`:state.transition==="wipe"?`inset(0 ${state.clip}% 0 0)`:"none";if(t.mask){const css=createCssMaskStyle(state.reveal,t.mask);const image=String(css.maskImage??"");const size=String(css.maskSize??"100% 100%");const repeat=String(css.maskRepeat??"no-repeat");const position=String(css.maskPosition??"center");t.image.style.webkitMaskImage=image;t.image.style.maskImage=image;t.image.style.webkitMaskSize=size;t.image.style.maskSize=size;t.image.style.webkitMaskRepeat=repeat;t.image.style.maskRepeat=repeat;t.image.style.webkitMaskPosition=position;t.image.style.maskPosition=position;t.panel.dataset.maskPreset=t.mask.preset;t.panel.style.setProperty("--mask-edge-color",t.mask.edgeColor);t.panel.style.setProperty("--mask-edge-width",`${t.mask.edgeWidth}%`);}else{t.image.style.webkitMaskImage="";t.image.style.maskImage="";delete t.panel.dataset.maskPreset;}t.panelY(state.panelY);t.imageY(state.imageY);t.scale(state.scale);t.playback(state.visible);}
    };
    const refresh=()=>render(progress.current);
    const frame=cinematicProgress.subscribe(render);
    const fallback=useExperienceStore.subscribe(s=>{if(s.webglStatus!=="ready")render(s.progress);});
    compact.addEventListener("change",refresh);document.addEventListener("visibilitychange",refresh);refresh();
    return ()=>{frame();fallback();compact.removeEventListener("change",refresh);document.removeEventListener("visibilitychange",refresh);tracks.forEach(t=>{t.video?.pause();gsap.set(t.panel,{clearProps:"transform,visibility"});gsap.set(t.panel.querySelector(".media-panel__inner"),{clearProps:"transform"});});};
  },[active,experience,preview,reduced,quality,webglStatus]);
  if(reduced) return null;
  return <div ref={root} className="cinematic-media" aria-hidden="true">
    {experience.scenes.map((scene,index)=>{
      if(Math.abs(index-active)>1 || (!scene.media&&!preview))return null;
      const media=scene.media;
      const mask=media?.transition==="mask"?createMaskReveal(media.mask?.preset??"linear-soft",media.mask??{softness:media.maskSoftness}):null;
      if(mask&&resolveMaskBackend(mask,{quality,webglStatus,reducedMotion:reduced})==="webgl")return null;
      return <div key={`${scene.id}-${preview}`} className="media-panel" data-media-panel={index} style={{zIndex:index}}>
        <div className="media-panel__inner" data-transition={media?.transition??"slide"} style={{"--media-position":`${media?.position[0]??50}% ${media?.position[1]??50}%`,"--media-position-mobile":`${media?.mobilePosition[0]??50}% ${media?.mobilePosition[1]??50}%`,"--media-blend":media?.blendColor??"transparent","--media-mask-softness":`${media?.maskSoftness??18}%`} as CSSProperties}>
          {media ? media.kind==="video" ? <video src={media.src} poster={media.poster} muted playsInline loop preload="none" /> : <img src={media.src} alt="" decoding="async" /> : <div className={`media-fixture media-fixture--${index%3}`}><span>MEDIA STUDY / {String(index+1).padStart(2,"0")}</span><i/><b/></div>}
        </div>
        <div className="media-panel__shade"/>
      </div>;
    })}
  </div>;
}
