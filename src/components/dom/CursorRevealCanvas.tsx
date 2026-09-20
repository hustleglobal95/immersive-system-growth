"use client";
import { useEffect, useRef, useState } from "react";
import type { CursorRevealConfig } from "@/src/lib/cinematic/schema";
import { cursorRevealBrush, cursorRevealIdleDecay, shouldInjectCursorReveal } from "@/src/lib/cinematic/cursorReveal";
import { forgeTicker } from "@/src/lib/cinematic/ticker";
import type { QualityTier } from "@/src/types/experience";
import type { CinematicPointerSignal, PointerTrailPoint } from "@/src/store/cinematicStore";

interface Props {
  src: string;
  config: CursorRevealConfig;
  pointer: CinematicPointerSignal;
  trail: PointerTrailPoint[];
  quality: QualityTier;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

type Target={texture:WebGLTexture;fbo:WebGLFramebuffer;width:number;height:number};
type DoubleTarget={read:Target;write:Target;swap:()=>void};

const vertex=[
  "#version 300 es","precision highp float;","out vec2 vUv;",
  "void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p*.5;gl_Position=vec4(p-1.,0.,1.);}"
].join("\n");
const trailFragment=[
  "#version 300 es","precision highp float;","in vec2 vUv;out vec4 outColor;",
  "uniform sampler2D uSource;uniform vec2 uPoint;uniform float uRadius,uStrength,uDecay,uInject,uSoftness;",
  "void main(){float previous=texture(uSource,vUv).r*uDecay;float radius=max(.001,uRadius);float inner=radius*(1.-clamp(uSoftness,0.,.98));float brush=(1.-smoothstep(inner,radius,distance(vUv,uPoint)))*uStrength*uInject;outColor=vec4(max(previous,brush),0.,0.,1.);}"
].join("\n");
const advectFragment=[
  "#version 300 es","precision highp float;","in vec2 vUv;out vec4 outColor;",
  "uniform sampler2D uVelocity,uSource;uniform vec2 uTexel;uniform float uDt,uDissipation,uVorticity;",
  "void main(){vec2 velocity=texture(uVelocity,vUv).xy;vec2 L=texture(uVelocity,vUv-vec2(uTexel.x,0.)).xy;vec2 R=texture(uVelocity,vUv+vec2(uTexel.x,0.)).xy;vec2 T=texture(uVelocity,vUv+vec2(0.,uTexel.y)).xy;vec2 B=texture(uVelocity,vUv-vec2(0.,uTexel.y)).xy;float curl=.5*((R.y-L.y)-(T.x-B.x));velocity+=vec2(-velocity.y,velocity.x)*curl*uVorticity*uDt*.035;vec2 coord=clamp(vUv-uDt*velocity,vec2(.001),vec2(.999));outColor=texture(uSource,coord)*uDissipation;}"
].join("\n");
const splatFragment=[
  "#version 300 es","precision highp float;","in vec2 vUv;out vec4 outColor;",
  "uniform sampler2D uTarget;uniform vec2 uPoint,uValue;uniform float uRadius,uStrength;",
  "void main(){vec2 delta=vUv-uPoint;float weight=exp(-dot(delta,delta)/max(.00001,uRadius*uRadius));vec4 base=texture(uTarget,vUv);outColor=base+vec4(uValue*weight*uStrength,0.,0.);}"
].join("\n");
const renderFragment=[
  "#version 300 es","precision highp float;","in vec2 vUv;out vec4 outColor;",
  "uniform sampler2D uImage,uMask;uniform vec2 uResolution,uImageSize,uPointer,uPosition;uniform float uMode,uRadius,uSoftness,uFit;",
  "vec2 mediaUv(vec2 uv,out float visible){float canvas=uResolution.x/max(1.,uResolution.y);float image=uImageSize.x/max(1.,uImageSize.y);vec2 scale=vec2(1.);if(uFit<.5){if(image>canvas)scale.x=canvas/image;else scale.y=image/canvas;}else{if(image>canvas)scale.y=image/canvas;else scale.x=canvas/image;}vec2 center=vec2(.5)+(uPosition-.5)*(vec2(1.)-scale);vec2 mapped=(uv-.5)*scale+center;visible=step(0.,mapped.x)*step(mapped.x,1.)*step(0.,mapped.y)*step(mapped.y,1.);return clamp(mapped,vec2(.001),vec2(.999));}",
  "void main(){float visible=1.;vec2 uv=mediaUv(vUv,visible);vec4 image=texture(uImage,uv);float mask=texture(uMask,vUv).r;if(uMode<.5){float d=distance(vUv,uPointer);float inner=uRadius*(1.-clamp(uSoftness,0.,.98));mask=1.-smoothstep(inner,uRadius,d);}else mask=smoothstep(0.,max(.001,uSoftness),mask);outColor=vec4(image.rgb,image.a*mask*visible);}"
].join("\n");

function compile(gl:WebGL2RenderingContext,type:number,source:string){
  const shader=gl.createShader(type);if(!shader)throw new Error("Unable to create cursor reveal shader");
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error("Cursor reveal shader compile failed: "+log);}
  return shader;
}
function makeProgram(gl:WebGL2RenderingContext,fragment:string){
  const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment),value=gl.createProgram();if(!value)throw new Error("Unable to create cursor reveal program");
  gl.attachShader(value,vs);gl.attachShader(value,fs);gl.linkProgram(value);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(value,gl.LINK_STATUS))throw new Error("Cursor reveal program link failed: "+gl.getProgramInfoLog(value));
  return value;
}
function makeTarget(gl:WebGL2RenderingContext,width:number,height:number,floatTarget=false):Target{
  const texture=gl.createTexture(),fbo=gl.createFramebuffer();if(!texture||!fbo)throw new Error("Unable to create cursor reveal target");
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,floatTarget?gl.RGBA16F:gl.RGBA8,width,height,0,gl.RGBA,floatTarget?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error("Cursor reveal framebuffer incomplete");
  return{texture,fbo,width,height};
}
function makeDouble(gl:WebGL2RenderingContext,width:number,height:number,floatTarget=false):DoubleTarget{
  let read=makeTarget(gl,width,height,floatTarget),write=makeTarget(gl,width,height,floatTarget);
  return{get read(){return read},get write(){return write},swap(){const next=read;read=write;write=next}} as DoubleTarget;
}
function clearTarget(gl:WebGL2RenderingContext,target:Target){gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.viewport(0,0,target.width,target.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
function loadImage(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.crossOrigin="anonymous";image.decoding="async";image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Unable to load cursor reveal media "+url));image.src=url;});}
function point(pointer:CinematicPointerSignal):[number,number]{return[pointer.x*.5+.5,pointer.y*.5+.5];}

export function CursorRevealCanvas(props:Props){
  const canvas=useRef<HTMLCanvasElement>(null),values=useRef(props),[fallback,setFallback]=useState(false);
  useEffect(()=>{values.current=props;});
  useEffect(()=>{
    let disposed=false,unsubscribe:(()=>void)|undefined;
    const element=canvas.current;if(!element)return;
    const cleanupFns:Array<()=>void>=[];
    (async()=>{
      const image=await loadImage(props.src);if(disposed)return;
      const useCanvas=fallback||props.quality==="low"||props.config.renderer==="canvas";
      if(useCanvas){
        const ctx=element.getContext("2d"),mask=document.createElement("canvas"),maskCtx=mask.getContext("2d");if(!ctx||!maskCtx)throw new Error("2D cursor reveal unavailable");
        let width=0,height=0;
        unsubscribe=forgeTicker.subscribe((delta)=>{
          const current=values.current,config=current.config,pointer=current.pointer,nextWidth=Math.max(1,window.innerWidth),nextHeight=Math.max(1,window.innerHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);
          if(width!==nextWidth||height!==nextHeight){width=nextWidth;height=nextHeight;element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);element.style.width=width+"px";element.style.height=height+"px";mask.width=Math.round(width*dpr);mask.height=Math.round(height*dpr);}
          ctx.setTransform(dpr,0,0,dpr,0,0);maskCtx.setTransform(dpr,0,0,dpr,0,0);
          const idle=Math.max(0,performance.now()-pointer.lastMoveAt),recent=idle<90,allowed=shouldInjectCursorReveal(config,pointer),inject=allowed&&(config.mode==="lens"||recent||(pointer.pointerType==="touch"&&pointer.down)),brush=cursorRevealBrush(config,pointer.speed,pointer.pressure);
          if(config.mode==="lens")maskCtx.clearRect(0,0,width,height);else{const decay=cursorRevealIdleDecay(config,idle,delta);if(decay<.9999){maskCtx.save();maskCtx.globalCompositeOperation="destination-out";maskCtx.globalAlpha=Math.max(0,1-decay);maskCtx.fillRect(0,0,width,height);maskCtx.restore();}}
          if(inject){
            const x=(pointer.x*.5+.5)*width,y=(-pointer.y*.5+.5)*height,r=Math.max(2,brush.radius*Math.min(width,height));
            const paint=(px:number,py:number,alpha:number)=>{const gradient=maskCtx.createRadialGradient(px,py,r*(1-config.softness),px,py,r);gradient.addColorStop(0,"rgba(255,255,255,"+Math.min(1,brush.strength*alpha)+")");gradient.addColorStop(1,"rgba(255,255,255,0)");maskCtx.fillStyle=gradient;maskCtx.beginPath();maskCtx.arc(px,py,r,0,Math.PI*2);maskCtx.fill();};
            paint(x,y,1);if(config.mode!=="lens")for(const item of current.trail.slice(-12))paint((item.x*.5+.5)*width,(-item.y*.5+.5)*height,Math.max(0,.42*(1-item.age)));
          }
          ctx.clearRect(0,0,width,height);
          const iw=image.naturalWidth,ih=image.naturalHeight,scale=config.fit==="cover"?Math.max(width/iw,height/ih):Math.min(width/iw,height/ih),dw=iw*scale,dh=ih*scale,x=(width-dw)*(config.position[0]/100),y=(height-dh)*(config.position[1]/100);
          ctx.drawImage(image,x,y,dw,dh);ctx.globalCompositeOperation="destination-in";ctx.drawImage(mask,0,0,width,height);ctx.globalCompositeOperation="source-over";
        });
        props.onReady?.();return;
      }

      const gl=element.getContext("webgl2",{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:"high-performance"});if(!gl){setFallback(true);return;}
      const vao=gl.createVertexArray();if(!vao)throw new Error("Unable to create cursor reveal VAO");gl.bindVertexArray(vao);
      const trailProgram=makeProgram(gl,trailFragment),advectProgram=makeProgram(gl,advectFragment),splatProgram=makeProgram(gl,splatFragment),renderProgram=makeProgram(gl,renderFragment);
      const imageTexture=gl.createTexture();if(!imageTexture)throw new Error("Unable to create cursor reveal image texture");
      gl.bindTexture(gl.TEXTURE_2D,imageTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      const hasFloat=!!gl.getExtension("EXT_color_buffer_float"),fluid=props.config.mode==="fluid"&&hasFloat,aspect=Math.max(.4,Math.min(2.5,window.innerWidth/Math.max(1,window.innerHeight))),base=Math.max(64,Math.min(512,props.config.fluidResolution)),simWidth=aspect>=1?Math.min(512,Math.round(base*aspect)):base,simHeight=aspect>=1?base:Math.min(512,Math.round(base/aspect));
      const trailField=makeDouble(gl,simWidth,simHeight,false),velocity=fluid?makeDouble(gl,simWidth,simHeight,true):null,dye=fluid?makeDouble(gl,simWidth,simHeight,true):null;
      [trailField.read,trailField.write,velocity?.read,velocity?.write,dye?.read,dye?.write].filter(Boolean).forEach(value=>clearTarget(gl,value as Target));
      const uniform=(program:WebGLProgram,name:string)=>gl.getUniformLocation(program,name),bind=(unit:number,texture:WebGLTexture,location:WebGLUniformLocation|null)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(location,unit);},draw=(program:WebGLProgram,target:Target|null,width:number,height:number,setup:()=>void)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fbo??null);gl.viewport(0,0,width,height);gl.useProgram(program);gl.bindVertexArray(vao);setup();gl.drawArrays(gl.TRIANGLES,0,3);};
      unsubscribe=forgeTicker.subscribe((delta)=>{
        const current=values.current,config=current.config,pointer=current.pointer,idle=Math.max(0,performance.now()-pointer.lastMoveAt),recent=idle<90,allowed=shouldInjectCursorReveal(config,pointer),inject=allowed&&(config.mode==="lens"||recent||(pointer.pointerType==="touch"&&pointer.down)),brush=cursorRevealBrush(config,pointer.speed,pointer.pressure),p=point(pointer),dt=Math.min(.033,Math.max(.001,delta)),decay=cursorRevealIdleDecay(config,idle,dt),texel:[number,number]=[1/simWidth,1/simHeight];
        let maskTexture=trailField.read.texture,mode=config.mode==="lens"?0:1;
        if(fluid&&velocity&&dye){
          draw(advectProgram,velocity.write,simWidth,simHeight,()=>{bind(0,velocity.read.texture,uniform(advectProgram,"uVelocity"));bind(1,velocity.read.texture,uniform(advectProgram,"uSource"));gl.uniform2f(uniform(advectProgram,"uTexel"),texel[0],texel[1]);gl.uniform1f(uniform(advectProgram,"uDt"),dt);gl.uniform1f(uniform(advectProgram,"uDissipation"),config.velocityDissipation);gl.uniform1f(uniform(advectProgram,"uVorticity"),config.curl);});velocity.swap();
          if(inject){draw(splatProgram,velocity.write,simWidth,simHeight,()=>{bind(0,velocity.read.texture,uniform(splatProgram,"uTarget"));gl.uniform2f(uniform(splatProgram,"uPoint"),p[0],p[1]);gl.uniform2f(uniform(splatProgram,"uValue"),pointer.velocityX*.012*config.splatForce,pointer.velocityY*.012*config.splatForce);gl.uniform1f(uniform(splatProgram,"uRadius"),brush.radius);gl.uniform1f(uniform(splatProgram,"uStrength"),config.motionStrength);});velocity.swap();}
          draw(advectProgram,dye.write,simWidth,simHeight,()=>{bind(0,velocity.read.texture,uniform(advectProgram,"uVelocity"));bind(1,dye.read.texture,uniform(advectProgram,"uSource"));gl.uniform2f(uniform(advectProgram,"uTexel"),texel[0],texel[1]);gl.uniform1f(uniform(advectProgram,"uDt"),dt);gl.uniform1f(uniform(advectProgram,"uDissipation"),idle<=config.lingerMs?1:Math.min(1,config.dyeDissipation*decay));gl.uniform1f(uniform(advectProgram,"uVorticity"),0);});dye.swap();
          if(inject){draw(splatProgram,dye.write,simWidth,simHeight,()=>{bind(0,dye.read.texture,uniform(splatProgram,"uTarget"));gl.uniform2f(uniform(splatProgram,"uPoint"),p[0],p[1]);gl.uniform2f(uniform(splatProgram,"uValue"),1,0);gl.uniform1f(uniform(splatProgram,"uRadius"),brush.radius);gl.uniform1f(uniform(splatProgram,"uStrength"),brush.strength);});dye.swap();}
          maskTexture=dye.read.texture;mode=1;
        }else if(config.mode!=="lens"){
          draw(trailProgram,trailField.write,simWidth,simHeight,()=>{bind(0,trailField.read.texture,uniform(trailProgram,"uSource"));gl.uniform2f(uniform(trailProgram,"uPoint"),p[0],p[1]);gl.uniform1f(uniform(trailProgram,"uRadius"),brush.radius);gl.uniform1f(uniform(trailProgram,"uStrength"),brush.strength);gl.uniform1f(uniform(trailProgram,"uDecay"),decay);gl.uniform1f(uniform(trailProgram,"uInject"),inject?1:0);gl.uniform1f(uniform(trailProgram,"uSoftness"),config.softness);});trailField.swap();maskTexture=trailField.read.texture;
        }
        const dpr=Math.min(window.devicePixelRatio||1,2),width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight),dw=Math.round(width*dpr),dh=Math.round(height*dpr);if(element.width!==dw||element.height!==dh){element.width=dw;element.height=dh;element.style.width=width+"px";element.style.height=height+"px";}
        gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,dw,dh);gl.clear(gl.COLOR_BUFFER_BIT);
        draw(renderProgram,null,dw,dh,()=>{bind(0,imageTexture,uniform(renderProgram,"uImage"));bind(1,maskTexture,uniform(renderProgram,"uMask"));gl.uniform2f(uniform(renderProgram,"uResolution"),dw,dh);gl.uniform2f(uniform(renderProgram,"uImageSize"),image.naturalWidth,image.naturalHeight);gl.uniform2f(uniform(renderProgram,"uPointer"),p[0],p[1]);gl.uniform2f(uniform(renderProgram,"uPosition"),config.position[0]/100,config.position[1]/100);gl.uniform1f(uniform(renderProgram,"uMode"),mode);gl.uniform1f(uniform(renderProgram,"uRadius"),brush.radius);gl.uniform1f(uniform(renderProgram,"uSoftness"),config.softness);gl.uniform1f(uniform(renderProgram,"uFit"),config.fit==="cover"?0:1);});
      });
      cleanupFns.push(()=>{gl.deleteTexture(imageTexture);[trailProgram,advectProgram,splatProgram,renderProgram].forEach(value=>gl.deleteProgram(value));[trailField.read,trailField.write,velocity?.read,velocity?.write,dye?.read,dye?.write].filter(Boolean).forEach(value=>{const target=value as Target;gl.deleteFramebuffer(target.fbo);gl.deleteTexture(target.texture);});gl.deleteVertexArray(vao);gl.getExtension("WEBGL_lose_context")?.loseContext();});
      props.onReady?.();
    })().catch(error=>{if(disposed)return;const value=error instanceof Error?error:new Error(String(error));props.onError?.(value);if(!fallback)setFallback(true);});
    return()=>{disposed=true;unsubscribe?.();for(const cleanup of cleanupFns)cleanup();};
  },[fallback,props.config,props.onError,props.onReady,props.quality,props.src]);
  return <canvas key={fallback?"canvas":"webgl"} ref={canvas} className="forge-cursor-reveal" aria-hidden="true" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}
