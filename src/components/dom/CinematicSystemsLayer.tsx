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
import { CursorRevealCanvas } from "@/src/components/dom/CursorRevealCanvas";
import { sampleSceneTransition } from "@/src/lib/cinematic/visualPhysics";

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

export function CinematicSystemsLayer(){
  const activeScene=useExperienceStore(s=>s.activeScene),quality=useExperienceStore(s=>s.quality),reduced=useExperienceStore(s=>s.reducedMotion);
  const progress=useCinematicStore(s=>s.springProgress),pointer=useCinematicStore(s=>s.pointer),trail=useCinematicStore(s=>s.trail),canvas=useRef<HTMLCanvasElement>(null);
  const [shaderReady,setShaderReady]=useState(false),[shaderFailed,setShaderFailed]=useState(false);
  const base=experience.scenes[Math.min(activeScene,experience.scenes.length-1)],config=base?getCinematicScene(base.id):null;
  const nextScene=experience.scenes[Math.min(activeScene+1,experience.scenes.length-1)];
  const local=base?clamp01((progress-base.range[0])/Math.max(1e-6,base.range[1]-base.range[0])):0;
  const composed=useMemo(()=>config?composeCinematicScene(config,{progress:local,pointer:{x:pointer.x,y:pointer.y,velocity:pointer.speed,trailEnergy:pointer.trailEnergy}}):null,[config,local,pointer.x,pointer.y,pointer.speed,pointer.trailEnergy]);
  const transition=config?.sceneTransition?sampleSceneTransition(config.sceneTransition,local):null;
  const targetSrc=config?.sceneTransition?.src??(nextScene?.media?.kind==="image"?nextScene.media.src:base?.media?.kind==="image"?base.media.src:undefined);
  const gpuEligible=!!(base?.media?.kind==="image"&&base.media.src&&config&&(config.spatial||config.reveal||config.warp||config.refraction||config.sceneTransition)&&!config.cursorReveal&&quality!=="low"&&!reduced&&!shaderFailed);

  // Each scene compiles its own shader, so readiness resets when the scene changes. Adjusting
  // during render means the layer never paints one frame claiming the previous scene's shader
  // is ready for the new scene.
  const [shaderScene,setShaderScene]=useState(activeScene);
  if(shaderScene!==activeScene){setShaderScene(activeScene);setShaderReady(false);setShaderFailed(false);}

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

  if(!config||base?.media?.kind==="color")return null;
  const stackScale=composed?.stack?.scale??1;
  return <div className="forge-cinematic-systems" aria-hidden="true" style={{position:"fixed",inset:0,zIndex:6,pointerEvents:"none",overflow:"hidden"}}>
    {gpuEligible&&base.media?.kind==="image"&&base.media.src&&<div style={{position:"absolute",inset:0,transform:`scale(${stackScale})`,transformOrigin:"50% 50%",willChange:"transform"}}>
      <CinematicShaderCanvas src={base.media.src} targetSrc={targetSrc} depthMap={config.spatial?.depthMap} normalMap={config.spatial?.normalMap} spatial={config.spatial} reveal={config.reveal} warp={config.warp} refraction={config.refraction} sceneTransition={config.sceneTransition} transitionProgress={transition?.progress??0} progress={composed?.reveal?.progress??local} pointerX={pointer.x} pointerY={pointer.y} pointerVelocity={pointer.speed} scrollProgress={local} onReady={()=>setShaderReady(true)} onError={()=>{setShaderReady(false);setShaderFailed(true);}} />
    </div>}
    {base.media?.kind==="image"&&base.media.src&&config.cursorReveal&&!reduced&&<div style={{position:"absolute",inset:0,transform:`scale(${stackScale})`,transformOrigin:"50% 50%",willChange:"transform"}}>
      <CursorRevealCanvas src={config.cursorReveal.src} config={config.cursorReveal} pointer={pointer} trail={trail} quality={quality} />
    </div>}
    <canvas ref={canvas} style={{position:"absolute",inset:0,width:"100%",height:"100%"}} />
    {composed?.stack&&<div style={{position:"absolute",inset:0,background:"#000",opacity:reduced?0:composed.stack.shade,pointerEvents:"none"}} />}
    {composed?.occlusion.map(({config:layer,sample})=>sample.visible?<div key={layer.id} style={{position:"absolute",inset:"-12%",opacity:reduced?0:sample.opacity,filter:`blur(${sample.blur}px)`,transform:layer.axis==="x"?`translate3d(${sample.translate}%,0,0)`:`translate3d(0,${sample.translate}%,0)`,zIndex:Math.round(20+sample.depth*5),background:layer.kind==="shadow"?"linear-gradient(90deg,transparent,rgba(0,0,0,.92),transparent)":layer.kind==="blur"?"rgba(255,255,255,.035)":layer.kind==="gradient"?"linear-gradient(110deg,rgba(255,255,255,.08),rgba(0,0,0,.75))":undefined,backgroundImage:layer.kind==="image"&&layer.src?`url(${layer.src})`:undefined,backgroundSize:"cover",backgroundPosition:"center"}}/>:null)}
    {composed?.diagram && (
      /* The drawing is strokes in SVG and annotations in HTML.
         Text inside a scaled viewBox is measured in user units, so a label authored at 11px
         rendered at about 4 and could not be read. The annotations are therefore ordinary
         elements positioned by percentage, which keeps them at a real type size at any plate
         size. That mapping is exact as long as the plate's content box carries the viewBox's
         own 5:3 ratio, which the project skin sets; edges carry their own progress from the
         shared sampler, which is what draws the plan line by line as the chapter is read. */
      <div className="cinematic-diagram" aria-hidden="true">
        <svg className="cinematic-diagram__ink" viewBox="0 0 1000 600" preserveAspectRatio="none">
          {composed.diagram.sample.edges.map((edge, index) => (
            <line
              key={`${edge.from.id}-${edge.to.id}-${index}`}
              {...svgSegment(edge.from, edge.to, reduced ? 1 : edge.progress)}
              stroke={composed.diagram!.config.stroke}
              strokeWidth={composed.diagram!.config.lineWidth}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {composed.diagram.config.labels &&
          composed.diagram.sample.points
            // A tick is an annotation, so only an annotated point carries one. A marker on every
            // vertex of a real plan reads as noise rather than as a drawing.
            .filter((point) => point.label)
            .map((point) => (
              <span
                key={point.id}
                className="cinematic-diagram__label"
                data-flip={point.x > 0.62 ? "true" : undefined}
                style={{
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  color: composed.diagram!.config.stroke,
                  ["--tick" as string]: composed.diagram!.config.accent,
                }}
              >
                {point.label}
              </span>
            ))}
      </div>
    )}
  </div>;
}
