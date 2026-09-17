"use client";
import { useEffect, useRef } from "react";
import type { RevealConfig, SpatialConfig } from "@/src/lib/cinematic/schema";
import { forgeTicker } from "@/src/lib/cinematic/ticker";

interface Props {
  src: string;
  depthMap?: string;
  normalMap?: string;
  spatial?: SpatialConfig;
  reveal?: RevealConfig;
  progress: number;
  pointerX: number;
  pointerY: number;
  scrollProgress: number;
  opacity?: number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

type Runtime = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Record<string, WebGLUniformLocation | null>;
  textures: WebGLTexture[];
  imageSize: [number, number];
};

const vertex = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
  vUv=p*.5;
  gl_Position=vec4(p-1.,0.,1.);
}`;

const fragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uBase;
uniform sampler2D uDepth;
uniform sampler2D uNormal;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uPointer;
uniform float uProgress;
uniform float uScroll;
uniform float uDepthStrength;
uniform float uRelightStrength;
uniform float uUseDepth;
uniform float uUseNormal;
uniform float uReveal;
uniform float uSoftness;
uniform float uSeed;
uniform float uDirection;
uniform vec3 uEdge;
uniform float uEdgeWidth;
uniform float uOpacity;

float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
vec2 coverUv(vec2 uv){
  float canvas=uResolution.x/max(1.,uResolution.y);
  float image=uImageSize.x/max(1.,uImageSize.y);
  vec2 outUv=uv;
  if(image>canvas){float scale=canvas/image;outUv.x=(uv.x-.5)*scale+.5;}
  else{float scale=image/canvas;outUv.y=(uv.y-.5)*scale+.5;}
  return outUv;
}
float directionCoord(vec2 uv){
  if(uDirection<.5)return uv.x;
  if(uDirection<1.5)return 1.-uv.x;
  if(uDirection<2.5)return uv.y;
  return 1.-uv.y;
}
/**
 * A reveal is an entrance. Progress 0 must hide the frame and progress 1 must hand the whole
 * frame back to the image, so the travelling edge sweeps from -softness to 1 + softness
 * instead of from 0 to 1 -- otherwise a wide softness leaves the image permanently masked.
 */
float sweep(float progress,float s,float pad){return mix(-s-pad,1.+s+pad,progress);}
float revealMask(vec2 uv,float depth){
  if(uReveal<.5)return 1.;
  float s=max(.002,uSoftness);
  float coord=directionCoord(uv);
  float edge=sweep(uProgress,s,0.);
  if(uReveal<1.5)return 1.-smoothstep(edge-s,edge+s,coord);
  if(uReveal<2.5){float radius=mix(-s,.78+s,uProgress);return 1.-smoothstep(radius-s,radius+s,distance(uv,uPointer*.13+.5));}
  if(uReveal<3.5){float wave=sin(uv.y*19.+uSeed)*.035+sin(uv.x*31.-uSeed*.3)*.018;float liquid=sweep(uProgress,s,.06)+wave+(depth-.5)*.08;return 1.-smoothstep(liquid-s,liquid+s,coord);}
  if(uReveal<4.5){float n=hash21(floor(uv*vec2(220.,140.))+uSeed);float burn=sweep(uProgress,s,.09)+(n-.5)*.17;return 1.-smoothstep(burn-s,burn+s,coord);}
  if(uReveal<5.5){float n=hash21(floor(uv*vec2(180.,110.))+uSeed);return step(n,clamp(uProgress*1.15,0.,1.));}
  if(uReveal<6.5){float lines=min(fract(uv.x*110.),fract(uv.y*70.));float scan=smoothstep(.0,.14,lines);float gate=1.-smoothstep(edge-s,edge+s,coord);return max(gate,scan*(1.-gate)*.28);}
  float contour=abs(fract((depth+uv.y*.12)*42.)-.5);float bands=1.-smoothstep(.03,.11,contour);float gate=1.-smoothstep(edge-s,edge+s,coord);return max(gate,bands*(1.-gate)*.4);
}
void main(){
  vec2 uv=coverUv(vUv);
  float depth=texture(uDepth,uv).r;
  if(uUseDepth>.5){
    vec2 parallax=uPointer*(depth-.5)*uDepthStrength*.0025;
    parallax.y+=(uScroll-.5)*(depth-.5)*uDepthStrength*.0012;
    uv=clamp(uv+parallax,.001,.999);
    depth=texture(uDepth,uv).r;
  }
  vec4 base=texture(uBase,uv);
  float light=1.;
  if(uUseNormal>.5){
    vec3 n=normalize(texture(uNormal,uv).xyz*2.-1.);
    vec3 l=normalize(vec3(uPointer.x*.8,uPointer.y*.8,1.));
    light=mix(1.,.58+.72*max(0.,dot(n,l)),uRelightStrength);
  }
  float mask=revealMask(uv,depth);
  float edgeBand=0.;
  if(uEdgeWidth>0.){
    float coord=directionCoord(uv);
    float travelling=sweep(uProgress,max(.002,uSoftness),0.);
    edgeBand=1.-smoothstep(uEdgeWidth,uEdgeWidth*3.,abs(coord-travelling));
  }
  vec3 rgb=mix(base.rgb*light,uEdge,min(1.,edgeBand*.8));
  outColor=vec4(rgb,base.a*mask*uOpacity);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader=gl.createShader(type);
  if(!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const log=gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Cinematic shader compile failed: ${log}`);
  }
  return shader;
}
function createProgram(gl: WebGL2RenderingContext){
  const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment),p=gl.createProgram();
  if(!p)throw new Error("Unable to create program");
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(`Cinematic shader link failed: ${gl.getProgramInfoLog(p)}`);
  return p;
}
function createTexture(gl:WebGL2RenderingContext){
  const value=gl.createTexture();if(!value)throw new Error("Unable to create texture");
  gl.bindTexture(gl.TEXTURE_2D,value);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));
  return value;
}
function loadImage(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.crossOrigin="anonymous";image.decoding="async";image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Unable to load cinematic texture ${url}`));image.src=url;});}
const effectCode=(effect:RevealConfig["effect"]|undefined)=>effect==="directional"?1:effect==="radial"?2:effect==="liquid"?3:effect==="burn"?4:effect==="particle"?5:effect==="wireframe"?6:effect==="contour"?7:0;
const directionCode=(direction:RevealConfig["direction"]|undefined)=>direction==="left"?1:direction==="up"?2:direction==="down"?3:0;
function hex(value:string|undefined){const v=(value??"#ffffff").replace("#","");const n=parseInt(v.length===3?v.split("").map(x=>x+x).join(""):v,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255] as const;}

export function CinematicShaderCanvas(props:Props){
  const canvas=useRef<HTMLCanvasElement>(null),runtime=useRef<Runtime|null>(null),values=useRef(props);
  values.current=props;
  useEffect(()=>{
    let disposed=false, unsubscribe: null | (()=>void)=null;
    const element=canvas.current;
    if(!element)return;
    const gl=element.getContext("webgl2",{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:"high-performance"});
    if(!gl){props.onError?.(new Error("WebGL2 unavailable for cinematic compositor"));return;}
    let rt:Runtime|null=null;
    const render=()=>{
      const current=runtime.current;if(!current)return;
      const {gl,program:p,vao,uniforms,imageSize}=current,v=values.current,dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight),dw=Math.round(w*dpr),dh=Math.round(h*dpr);
      if(element.width!==dw||element.height!==dh){element.width=dw;element.height=dh;element.style.width=`${w}px`;element.style.height=`${h}px`;}
      gl.viewport(0,0,dw,dh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(p);gl.bindVertexArray(vao);
      gl.uniform1i(uniforms.uBase,0);gl.uniform1i(uniforms.uDepth,1);gl.uniform1i(uniforms.uNormal,2);gl.uniform2f(uniforms.uResolution,dw,dh);gl.uniform2f(uniforms.uImageSize,imageSize[0],imageSize[1]);gl.uniform2f(uniforms.uPointer,v.pointerX,v.pointerY);gl.uniform1f(uniforms.uProgress,v.progress);gl.uniform1f(uniforms.uScroll,v.scrollProgress);gl.uniform1f(uniforms.uDepthStrength,v.spatial?.depthStrength??0);gl.uniform1f(uniforms.uRelightStrength,v.spatial?.relightStrength??0);gl.uniform1f(uniforms.uUseDepth,v.depthMap?1:0);gl.uniform1f(uniforms.uUseNormal,v.normalMap?1:0);gl.uniform1f(uniforms.uReveal,effectCode(v.reveal?.effect));gl.uniform1f(uniforms.uSoftness,v.reveal?.softness??.1);gl.uniform1f(uniforms.uSeed,v.reveal?.seed??47);gl.uniform1f(uniforms.uDirection,directionCode(v.reveal?.direction));
      const edge=hex(v.reveal?.edgeColor);gl.uniform3f(uniforms.uEdge,edge[0],edge[1],edge[2]);gl.uniform1f(uniforms.uEdgeWidth,v.reveal?.edgeWidth??0);gl.uniform1f(uniforms.uOpacity,v.opacity??1);gl.drawArrays(gl.TRIANGLES,0,3);
    };
    (async()=>{
      const p=createProgram(gl),vao=gl.createVertexArray();if(!vao)throw new Error("Unable to create cinematic VAO");gl.bindVertexArray(vao);
      const names=["uBase","uDepth","uNormal","uResolution","uImageSize","uPointer","uProgress","uScroll","uDepthStrength","uRelightStrength","uUseDepth","uUseNormal","uReveal","uSoftness","uSeed","uDirection","uEdge","uEdgeWidth","uOpacity"];
      const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]));const textures=[createTexture(gl),createTexture(gl),createTexture(gl)];
      const [base,depth,normal]=await Promise.all([loadImage(props.src),props.depthMap?loadImage(props.depthMap):null,props.normalMap?loadImage(props.normalMap):null]);
      if(disposed)return;
      for(const [index,image] of [base,depth,normal].entries()){
        if(!image)continue;gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,textures[index]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      }
      rt={gl,program:p,vao,uniforms,textures,imageSize:[base.naturalWidth,base.naturalHeight]};runtime.current=rt;render();props.onReady?.();unsubscribe=forgeTicker.subscribe(render);
    })().catch((error)=>{runtime.current=null;props.onError?.(error instanceof Error?error:new Error(String(error)));});
    const onResize=()=>render();window.addEventListener("resize",onResize);
    return()=>{disposed=true;unsubscribe?.();window.removeEventListener("resize",onResize);if(rt){rt.textures.forEach(value=>gl.deleteTexture(value));gl.deleteVertexArray(rt.vao);gl.deleteProgram(rt.program);}runtime.current=null;/* Each scene mounts its own compositor. Browsers cap live WebGL contexts and drop the oldest, which would take the persistent scene canvas with it, so release this one. */gl.getExtension("WEBGL_lose_context")?.loseContext();};
  },[props.src,props.depthMap,props.normalMap]);
  return <canvas ref={canvas} className="forge-cinematic-shader" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}
