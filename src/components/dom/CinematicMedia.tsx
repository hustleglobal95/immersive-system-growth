"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { experience, getSceneIndex } from "@/src/lib/experience";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { sampleMediaPanel } from "@/src/lib/mediaPanels";
import { useExperienceStore } from "@/src/store/experienceStore";

export function CinematicMedia() {
  const root = useRef<HTMLDivElement>(null);
  const preview = useExperienceStore(s=>s.mediaPreview);
  const reduced = useExperienceStore(s=>s.reducedMotion);
  const [active,setActive] = useState(0);
  const progress = useRef(0);
  useEffect(()=>{
    if(reduced) return;
    const update=(p:number)=>{progress.current=p;setActive(getSceneIndex(p,experience));};
    update(useExperienceStore.getState().progress);
    const frame=cinematicProgress.subscribe(update);
    const fallback=useExperienceStore.subscribe(s=>{if(s.webglStatus!=="ready")update(s.progress);});
    return ()=>{frame();fallback();};
  },[reduced]);
  useEffect(()=>{
    const element=root.current;
    if(!element || reduced) return;
    const compact=matchMedia("(max-width: 760px)");
    const panels=Array.from(element.querySelectorAll<HTMLElement>("[data-media-panel]"));
    const tracks=panels.map(panel=>{
      const index=Number(panel.dataset.mediaPanel),scene=experience.scenes[index],prior=experience.scenes[index-1],next=experience.scenes[index+1];
      const image=panel.querySelector<HTMLElement>(".media-panel__inner")!;
      const video=panel.querySelector("video");
      let playing=false;
      return {panel,video,
        window:{start:scene.range[0],end:scene.range[1],enterStart:prior?scene.range[0]-(prior.range[1]-prior.range[0])*(scene.media?.overlap??.25):0,exitStart:next?scene.range[1]-(scene.range[1]-scene.range[0])*(next.media?.overlap??.25):1,first:index===0,last:index===experience.scenes.length-1,direction:scene.media?.direction??"up" as const,exitDirection:next?.media?.direction??"up" as const,zoom:scene.media?.zoom??1.06,transition:scene.media?.transition??"slide" as const},
        panelY:gsap.quickSetter(panel,"yPercent"),imageY:gsap.quickSetter(image,"yPercent"),scale:gsap.quickSetter(image,"scale"),
        playback(visible:boolean){const play=visible&&!document.hidden;if(!video||play===playing)return;playing=play;if(play)void video.play().catch(()=>{/* Keep poster; don't retry a blocked play every frame. */});else video.pause();},
      };
    });
    const render=(p:number)=>{
      for(const t of tracks){const state=sampleMediaPanel(p,t.window,compact.matches);t.panel.style.visibility=state.visible?"visible":"hidden";t.panel.style.opacity=String(state.opacity);t.panel.style.filter=`blur(${state.blur}px)`;t.panel.style.clipPath=state.transition==="curtain"?`inset(${state.clip/2}% 0 ${state.clip/2}% 0)`:state.transition==="wipe"?`inset(0 ${state.clip}% 0 0)`:"none";t.panelY(state.panelY);t.imageY(state.imageY);t.scale(state.scale);t.playback(state.visible);}
    };
    const refresh=()=>render(progress.current);
    const frame=cinematicProgress.subscribe(render);
    const fallback=useExperienceStore.subscribe(s=>{if(s.webglStatus!=="ready")render(s.progress);});
    compact.addEventListener("change",refresh);document.addEventListener("visibilitychange",refresh);refresh();
    return ()=>{frame();fallback();compact.removeEventListener("change",refresh);document.removeEventListener("visibilitychange",refresh);tracks.forEach(t=>{t.video?.pause();gsap.set(t.panel,{clearProps:"transform,visibility"});gsap.set(t.panel.querySelector(".media-panel__inner"),{clearProps:"transform"});});};
  },[active,preview,reduced]);
  if(reduced) return null;
  return <div ref={root} className="cinematic-media" aria-hidden="true">
    {experience.scenes.map((scene,index)=>{
      if(Math.abs(index-active)>1 || (!scene.media&&!preview))return null;
      const media=scene.media;
      return <div key={`${scene.id}-${preview}`} className="media-panel" data-media-panel={index} style={{zIndex:index}}>
        <div className="media-panel__inner" data-transition={media?.transition??"slide"} style={{"--media-position":`${media?.position[0]??50}% ${media?.position[1]??50}%`,"--media-position-mobile":`${media?.mobilePosition[0]??50}% ${media?.mobilePosition[1]??50}%`,"--media-blend":media?.blendColor??"transparent","--media-mask-softness":`${media?.maskSoftness??18}%`} as CSSProperties}>
          {media ? media.kind==="video" ? <video src={media.src} poster={media.poster} muted playsInline loop preload="none" /> : <img src={media.src} alt="" decoding="async" /> : <div className={`media-fixture media-fixture--${index%3}`}><span>MEDIA STUDY / {String(index+1).padStart(2,"0")}</span><i/><b/></div>}
        </div>
        <div className="media-panel__shade"/>
      </div>;
    })}
  </div>;
}
