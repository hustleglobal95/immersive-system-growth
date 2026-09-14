"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { experience } from "@/src/lib/experience";
import { getCinematicScene } from "@/src/lib/cinematic/config";
import { composeCinematicScene } from "@/src/lib/cinematic/composer";
import { generateContourPaths, generateHalftonePoints, lineTracePath } from "@/src/lib/cinematic/procedural";
import { spatialImageCss } from "@/src/lib/cinematic/spatialImage";
import { svgSegment } from "@/src/lib/cinematic/diagrams";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicStore } from "@/src/store/cinematicStore";
import { CinematicShaderCanvas } from "@/src/components/dom/CinematicShaderCanvas";

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

export function CinematicSystemsLayer(){
  const activeScene=useExperienceStore(s=>s.activeScene);
  return <CinematicSceneLayer key={activeScene} />;
}

function CinematicSceneLayer(){
  const activeScene=useExperienceStore(s=>s.activeScene),quality=useExperienceStore(s=>s.quality),reduced=useExperienceStore(s=>s.reducedMotion);
  const progress=useCinematicStore(s=>s.springProgress),pointer=useCinematicStore(s=>s.pointer),trail=useCinematicStore(s=>s.trail),canvas=useRef<HTMLCanvasElement>(null);
  const [shaderReady,setShaderReady]=useState(false),[shaderFailed,setShaderFailed]=useState(false);
  const base=experience.scenes[Math.min(activeScene,experience.scenes.length-1)],config=base?getCinematicScene(base.id):null;
  const local=base?clamp01((progress-base.range[0])/Math.max(1e-6,base.range[1]-base.range[0])):0;
  const composed=useMemo(()=>config?composeCinematicScene(config,{progress:local,pointer:{x:pointer.x,y:pointer.y,velocity:pointer.speed,trailEnergy:pointer.trailEnergy}}):null,[config,local,pointer.x,pointer.y,pointer.speed,pointer.trailEnergy]);
  const gpuEligible=!!(base?.media?.kind==="image"&&config&&(config.spatial||config.reveal)&&quality!=="low"&&!reduced&&!shaderFailed);

  useEffect(()=>{
    if(!config||!composed)return;
    const panel=document.querySelector<HTMLElement>(`[data-media-panel="${activeScene}"]`),media=panel?.querySelector<HTMLElement>("img,video");
    if(!media)return;
    const previous={transform:media.style.transform,maskImage:media.style.maskImage,webkitMaskImage:media.style.webkitMaskImage,filter:media.style.filter,opacity:media.style.opacity};
    if(shaderReady&&gpuEligible){media.style.opacity="0";}
    else {
      if(!reduced&&composed.spatial){Object.assign(media.style,spatialImageCss(composed.spatial));media.style.filter=`blur(${composed.spatial.focusBlur.toFixed(2)}px)`;}
      if(!reduced&&composed.stack){const spatial=composed.spatial?spatialImageCss(composed.spatial).transform:"";media.style.transform=`${spatial} scale(${composed.stack.scale.toFixed(5)})`;}
      if(!reduced&&composed.reveal){media.style.maskImage=composed.reveal.cssMask;media.style.webkitMaskImage=composed.reveal.cssMask;}
    }
    return()=>{media.style.transform=previous.transform;media.style.maskImage=previous.maskImage;media.style.webkitMaskImage=previous.webkitMaskImage;media.style.filter=previous.filter;media.style.opacity=previous.opacity;};
  },[activeScene,composed,config,gpuEligible,reduced,shaderReady]);

  useEffect(()=>{
    const element=canvas.current;if(!element||!config||reduced)return;
    const dpr=Math.min(window.devicePixelRatio||1,quality==="low"?1:2),width=window.innerWidth,height=window.innerHeight;
    element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);element.style.width=`${width}px`;element.style.height=`${height}px`;
    const ctx=element.getContext("2d");if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    for(const item of composed?.procedural??[]){
      const c=item.config;ctx.save();ctx.globalAlpha=item.opacity;ctx.strokeStyle=c.color;ctx.fillStyle=c.color;ctx.globalCompositeOperation=c.blendMode==="normal"?"source-over":c.blendMode==="screen"?"screen":c.blendMode==="multiply"?"multiply":"overlay";
      if(c.kind==="contours"){ctx.lineWidth=.8;for(const path of generateContourPaths(c,width,height))ctx.stroke(new Path2D(path));}
      if(c.kind==="halftone"){
        const limit=quality==="low"?1200:quality==="medium"?4000:c.count;
        for(const point of generateHalftonePoints(c,width,height).slice(0,limit)){
          const influence=c.interactive?Math.max(0,1-Math.hypot(point.x-width*(pointer.x*.5+.5),point.y-height*(-pointer.y*.5+.5))/260):0;
          ctx.beginPath();ctx.arc(point.x,point.y,point.radius*(1+influence*c.response),0,Math.PI*2);ctx.fill();
        }
      }
      if(c.kind==="line-trace"){ctx.lineWidth=1.25;ctx.setLineDash([Math.max(width,height)*2]);ctx.lineDashOffset=Math.max(width,height)*2*(1-local);ctx.stroke(new Path2D(lineTracePath(c,width,height)));}
      if(c.kind==="grid"){
        ctx.lineWidth=.6;
        for(let x=0;x<=c.columns;x++){const px=x/c.columns*width;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px+pointer.x*c.distortion*20,height);ctx.stroke();}
        for(let y=0;y<=c.rows;y++){const py=y/c.rows*height;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(width,py-pointer.y*c.distortion*20);ctx.stroke();}
      }
      ctx.restore();
    }
    if(trail.length){ctx.save();ctx.globalCompositeOperation="screen";for(const point of trail){ctx.globalAlpha=(1-point.age)*.28;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc((point.x*.5+.5)*width,(-point.y*.5+.5)*height,Math.max(1,5*(1-point.age)),0,Math.PI*2);ctx.fill();}ctx.restore();}
  },[config,composed,quality,reduced,trail,pointer.x,pointer.y,local]);

  if(!config)return null;
  const stackScale=composed?.stack?.scale??1;
  return <div className="forge-cinematic-systems" aria-hidden="true" style={{position:"fixed",inset:0,zIndex:6,pointerEvents:"none",overflow:"hidden"}}>
    {gpuEligible&&base.media?.kind==="image"&&<div style={{position:"absolute",inset:0,transform:`scale(${stackScale})`,transformOrigin:"50% 50%",willChange:"transform"}}>
      <CinematicShaderCanvas src={base.media.src} depthMap={config.spatial?.depthMap} normalMap={config.spatial?.normalMap} spatial={config.spatial} reveal={config.reveal} progress={local} pointerX={pointer.x} pointerY={pointer.y} scrollProgress={local} onReady={()=>setShaderReady(true)} onError={()=>{setShaderReady(false);setShaderFailed(true);}} />
    </div>}
    <canvas ref={canvas} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} />
    {composed?.stack&&<div style={{position:"absolute",inset:0,background:"#000",opacity:reduced?0:composed.stack.shade,pointerEvents:"none"}} />}
    {composed?.occlusion.map(({config:layer,sample})=>sample.visible?<div key={layer.id} style={{position:"absolute",inset:"-12%",opacity:reduced?0:sample.opacity,filter:`blur(${sample.blur}px)`,transform:layer.axis==="x"?`translate3d(${sample.translate}%,0,0)`:`translate3d(0,${sample.translate}%,0)`,zIndex:Math.round(20+sample.depth*5),background:layer.kind==="shadow"?"linear-gradient(90deg,transparent,rgba(0,0,0,.92),transparent)":layer.kind==="blur"?"rgba(255,255,255,.035)":layer.kind==="gradient"?"linear-gradient(110deg,rgba(255,255,255,.08),rgba(0,0,0,.75))":undefined,backgroundImage:layer.kind==="image"&&layer.src?`url(${layer.src})`:undefined,backgroundSize:"cover",backgroundPosition:"center"}}/>:null)}
    {composed?.diagram&&<svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{position:"absolute",inset:"10%",width:"80%",height:"80%",overflow:"visible"}}>{composed.diagram.sample.edges.map((edge,index)=>{const segment=svgSegment(edge.from,edge.to,reduced?1:edge.progress);return <line key={`${edge.from.id}-${edge.to.id}-${index}`} {...segment} stroke={composed.diagram!.config.stroke} strokeWidth={composed.diagram!.config.lineWidth} vectorEffect="non-scaling-stroke"/>;})}{composed.diagram.config.labels&&composed.diagram.sample.points.map(point=><g key={point.id} transform={`translate(${point.x*1000} ${point.y*600})`}><circle r="4" fill={composed.diagram!.config.accent}/>{point.label&&<text x="10" y="-9" fill={composed.diagram!.config.stroke} fontSize="14">{point.label}</text>}</g>)}</svg>}
  </div>;
}
