"use client";
import { useEffect, useRef } from "react";
import type { RefractionConfig, RevealConfig, SceneTransitionConfig, SpatialConfig, WarpConfig } from "@/src/lib/cinematic/schema";
import { forgeTicker } from "@/src/lib/cinematic/ticker";

interface Props {
  src: string;
  targetSrc?: string;
  depthMap?: string;
  normalMap?: string;
  spatial?: SpatialConfig;
  reveal?: RevealConfig;
  warp?: WarpConfig;
  refraction?: RefractionConfig;
  sceneTransition?: SceneTransitionConfig;
  transitionProgress?: number;
  progress: number;
  pointerX: number;
  pointerY: number;
  pointerVelocity?: number;
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
  targetSize: [number, number];
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
uniform sampler2D uTarget;
uniform sampler2D uDepth;
uniform sampler2D uNormal;
uniform vec2 uResolution;
uniform vec2 uImageSize;
uniform vec2 uTargetSize;
uniform vec2 uPointer;
uniform float uPointerVelocity;
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

uniform float uWarpMode;
uniform float uWarpStrength;
uniform float uWarpRadius;
uniform float uWarpFalloff;
uniform float uWarpPointer;
uniform float uWarpVelocity;
uniform float uWarpScroll;
uniform float uWarpFrequency;

uniform float uRefractionMode;
uniform float uRefractionStrength;
uniform float uRefractionRadius;
uniform float uDispersion;
uniform float uEdgeRefraction;
uniform float uSheen;
uniform float uRipple;
uniform float uRefractionPointer;
uniform vec2 uRefractionCenter;

uniform float uTransition;
uniform float uTransitionProgress;
uniform float uTransitionSoftness;
uniform float uTransitionIntensity;
uniform float uTransitionDisplacement;
uniform float uTransitionChromatic;
uniform float uTransitionBlock;
uniform float uTransitionSlats;
uniform float uTransitionSeed;
uniform float uTransitionDirection;

float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
vec2 pointerUv(){return vec2(uPointer.x*.5+.5,-uPointer.y*.5+.5);}
vec2 coverUvFor(vec2 uv,vec2 imageSize){
  float canvas=uResolution.x/max(1.,uResolution.y);
  float image=imageSize.x/max(1.,imageSize.y);
  vec2 outUv=uv;
  if(image>canvas){float scale=canvas/image;outUv.x=(uv.x-.5)*scale+.5;}
  else{float scale=image/canvas;outUv.y=(uv.y-.5)*scale+.5;}
  return outUv;
}
float directionCoord(vec2 uv,float direction){
  if(direction<.5)return uv.x;
  if(direction<1.5)return 1.-uv.x;
  if(direction<2.5)return uv.y;
  return 1.-uv.y;
}
float sweep(float progress,float s,float pad){return mix(-s-pad,1.+s+pad,progress);}

vec2 applyWarp(vec2 uv){
  if(uWarpMode<.5||uWarpStrength<=0.)return uv;
  vec2 p=pointerUv();
  vec2 delta=uv-p;
  float dist=max(.0001,length(delta));
  float radius=max(.02,uWarpRadius);
  float field=exp(-pow(dist/radius,max(.1,uWarpFalloff)));
  float velocity=1.+min(3.,uPointerVelocity)*uWarpVelocity*.35;
  float scroll=1.+abs(uScroll-.5)*2.*uWarpScroll*.35;
  float strength=uWarpStrength*(.25+.75*uWarpPointer)*velocity*scroll;
  vec2 dir=delta/dist;
  if(uWarpMode<1.5){
    uv-=delta*field*strength*.085;
  }else if(uWarpMode<2.5){
    vec2 wave=vec2(sin(uv.y*uWarpFrequency*6.+uScroll*8.),cos(uv.x*uWarpFrequency*6.-uScroll*6.));
    uv+=wave*field*strength*.012;
  }else if(uWarpMode<3.5){
    float wave=sin(dist*uWarpFrequency*28.-uScroll*18.)*field;
    uv+=dir*wave*strength*.018;
  }else if(uWarpMode<4.5){
    float heat=sin(uv.y*uWarpFrequency*9.+uScroll*14.+hash21(floor(uv*90.))*2.)*strength*.009;
    uv.x+=heat*(.35+field);
  }else{
    float ring=fract(uScroll*.85);
    float shock=exp(-abs(dist-ring*.9)*28.)*strength;
    uv+=dir*shock*.035;
  }
  return clamp(uv,.001,.999);
}

vec2 refractionCenter(){
  vec2 authored=vec2(uRefractionCenter.x,1.-uRefractionCenter.y);
  return mix(authored,pointerUv(),clamp(uRefractionPointer,0.,1.));
}

vec2 refractionOffset(vec2 uv,out float field,out vec2 ray){
  field=0.;ray=vec2(0.);
  if(uRefractionMode<.5||uRefractionStrength<=0.)return vec2(0.);
  vec2 center=refractionCenter();
  vec2 delta=uv-center;
  float dist=max(.0001,length(delta));
  float radius=max(.03,uRefractionRadius);
  field=smoothstep(radius,0.,dist);
  ray=delta/dist;
  float edge=pow(clamp(dist/radius,0.,1.),2.)*uEdgeRefraction;
  if(uRefractionMode<1.5)return -delta*field*uRefractionStrength*.08*(1.+edge);
  if(uRefractionMode<2.5){
    float panel=(sin(uv.x*18.+uScroll*4.)+cos(uv.y*16.-uScroll*3.))*.5;
    return ray*field*panel*uRefractionStrength*.022*(1.+edge);
  }
  float liquid=sin(dist*46.-uScroll*16.)*uRipple+sin((uv.x+uv.y)*24.+uScroll*5.)*.25;
  return ray*field*liquid*uRefractionStrength*.035*(1.+edge);
}

float revealMask(vec2 uv,float depth){
  if(uReveal<.5)return 1.;
  float s=max(.002,uSoftness);
  float coord=directionCoord(uv,uDirection);
  float edge=sweep(uProgress,s,0.);
  if(uReveal<1.5)return 1.-smoothstep(edge-s,edge+s,coord);
  if(uReveal<2.5){float radius=mix(-s,.78+s,uProgress);return 1.-smoothstep(radius-s,radius+s,distance(uv,pointerUv()));}
  if(uReveal<3.5){float wave=sin(uv.y*19.+uSeed)*.035+sin(uv.x*31.-uSeed*.3)*.018;float liquid=sweep(uProgress,s,.06)+wave+(depth-.5)*.08;return 1.-smoothstep(liquid-s,liquid+s,coord);}
  if(uReveal<4.5){float n=hash21(floor(uv*vec2(220.,140.))+uSeed);float burn=sweep(uProgress,s,.09)+(n-.5)*.17;return 1.-smoothstep(burn-s,burn+s,coord);}
  if(uReveal<5.5){float n=hash21(floor(uv*vec2(180.,110.))+uSeed);return step(n,clamp(uProgress*1.15,0.,1.));}
  if(uReveal<6.5){float lines=min(fract(uv.x*110.),fract(uv.y*70.));float scan=smoothstep(.0,.14,lines);float gate=1.-smoothstep(edge-s,edge+s,coord);return max(gate,scan*(1.-gate)*.28);}
  float contour=abs(fract((depth+uv.y*.12)*42.)-.5);float bands=1.-smoothstep(.03,.11,contour);float gate=1.-smoothstep(edge-s,edge+s,coord);return max(gate,bands*(1.-gate)*.4);
}

float transitionMask(vec2 uv,float depth){
  if(uTransition<.5)return 0.;
  float t=clamp(uTransitionProgress,0.,1.);
  float s=max(.001,uTransitionSoftness);
  float coord=directionCoord(uv,uTransitionDirection);
  if(uTransition<1.5){
    float radius=t*1.35;
    float d=distance(uv,vec2(.5))+sin(distance(uv,vec2(.5))*44.-t*22.)*uTransitionDisplacement*uTransitionIntensity;
    return 1.-smoothstep(radius-s,radius+s,d);
  }
  if(uTransition<2.5){
    float wave=sin(uv.y*18.+uTransitionSeed)*uTransitionDisplacement+sin(uv.x*27.-uTransitionSeed*.17)*uTransitionDisplacement*.55;
    float edge=sweep(t,s,.08)+wave*uTransitionIntensity;
    return 1.-smoothstep(edge-s,edge+s,coord);
  }
  if(uTransition<3.5){
    float n=hash21(floor(uv*vec2(240.,150.))+uTransitionSeed);
    return smoothstep(n-s,n+s,t);
  }
  if(uTransition<4.5){
    vec2 cells=max(vec2(1.),uResolution/max(2.,uTransitionBlock));
    float n=hash21(floor(uv*cells)+uTransitionSeed);
    return smoothstep(n-s,n+s,t);
  }
  if(uTransition<5.5){
    float edge=sweep(t,s,.03);
    return 1.-smoothstep(edge-s,edge+s,coord);
  }
  if(uTransition<6.5){
    float edge=sweep(t,s,0.);
    return 1.-smoothstep(edge-s,edge+s,coord);
  }
  if(uTransition<7.5){
    float radius=mix(-s,.82+s,t);
    return 1.-smoothstep(radius-s,radius+s,distance(uv,vec2(.5)));
  }
  if(uTransition<8.5){
    float slats=max(2.,uTransitionSlats);
    float index=floor(uv.y*slats);
    float stagger=mod(index,2.)*.16+hash21(vec2(index,uTransitionSeed))*.1;
    float local=clamp((t-stagger)/(1.-stagger),0.,1.);
    float edge=sweep(local,s,0.);
    return 1.-smoothstep(edge-s,edge+s,coord);
  }
  if(uTransition<9.5){
    float n=hash21(floor(uv*vec2(420.,260.))+uTransitionSeed);
    return smoothstep(n-s,n+s,t);
  }
  return smoothstep(t-s,t+s,1.-depth);
}

void main(){
  vec2 warped=applyWarp(vUv);
  vec2 uv=coverUvFor(warped,uImageSize);
  float depth=texture(uDepth,uv).r;
  if(uUseDepth>.5){
    vec2 parallax=uPointer*(depth-.5)*uDepthStrength*.0025;
    parallax.y+=(uScroll-.5)*(depth-.5)*uDepthStrength*.0012;
    uv=clamp(uv+parallax,.001,.999);
    depth=texture(uDepth,uv).r;
  }

  float refractField;vec2 refractRay;
  vec2 refraction=refractionOffset(uv,refractField,refractRay);
  vec2 ruv=clamp(uv+refraction,.001,.999);
  float dispersion=uDispersion*refractField;
  vec4 base=texture(uBase,ruv);
  if(dispersion>0.){
    base.r=texture(uBase,clamp(ruv+refractRay*dispersion,.001,.999)).r;
    base.b=texture(uBase,clamp(ruv-refractRay*dispersion,.001,.999)).b;
  }

  float light=1.;
  if(uUseNormal>.5){
    vec3 n=normalize(texture(uNormal,uv).xyz*2.-1.);
    vec3 l=normalize(vec3(uPointer.x*.8,uPointer.y*.8,1.));
    light=mix(1.,.58+.72*max(0.,dot(n,l)),uRelightStrength);
  }

  float mask=revealMask(uv,depth);
  float edgeBand=0.;
  if(uEdgeWidth>0.){
    float coord=directionCoord(uv,uDirection);
    float travelling=sweep(uProgress,max(.002,uSoftness),0.);
    edgeBand=1.-smoothstep(uEdgeWidth,uEdgeWidth*3.,abs(coord-travelling));
  }

  vec3 rgb=mix(base.rgb*light,uEdge,min(1.,edgeBand*.8));
  if(uRefractionMode>.5&&uSheen>0.){
    float sheen=refractField*pow(max(0.,dot(normalize(refractRay+vec2(.0001)),normalize(vec2(-.62,.78)))),6.)*uSheen;
    rgb+=vec3(sheen);
  }

  float transition=transitionMask(vUv,depth);
  vec2 targetUv=coverUvFor(warped,uTargetSize);
  vec2 transitionRay=normalize((vUv-.5)+vec2(.0001));
  vec2 displaced=clamp(targetUv-transitionRay*uTransitionDisplacement*(1.-transition)*uTransitionIntensity,.001,.999);
  vec4 target=texture(uTarget,displaced);
  float chroma=uTransitionChromatic*(1.-abs(transition-.5)*2.);
  if(chroma>0.){
    target.r=texture(uTarget,clamp(displaced+transitionRay*chroma,.001,.999)).r;
    target.b=texture(uTarget,clamp(displaced-transitionRay*chroma,.001,.999)).b;
  }

  vec3 finalRgb=mix(rgb,target.rgb,transition);
  float finalAlpha=mix(base.a*mask,target.a,transition)*uOpacity;
  outColor=vec4(finalRgb,finalAlpha);
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
const directionCode=(direction:RevealConfig["direction"]|SceneTransitionConfig["direction"]|undefined)=>direction==="left"?1:direction==="up"?2:direction==="down"?3:0;
const warpCode=(mode:WarpConfig["mode"]|undefined)=>mode==="elastic"?1:mode==="cloth"?2:mode==="water"?3:mode==="heat"?4:mode==="shockwave"?5:0;
const refractionCode=(mode:RefractionConfig["mode"]|undefined)=>mode==="lens"?1:mode==="panel"?2:mode==="liquid"?3:0;
const transitionCode=(effect:SceneTransitionConfig["effect"]|undefined)=>effect==="ripple"?1:effect==="liquid"?2:effect==="noise"?3:effect==="pixel"?4:effect==="chromatic"?5:effect==="directional"?6:effect==="iris"?7:effect==="slats"?8:effect==="grain"?9:effect==="depth"?10:0;
function hex(value:string|undefined){const v=(value??"#ffffff").replace("#","");const n=parseInt(v.length===3?v.split("").map(x=>x+x).join(""):v,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255] as const;}

export function CinematicShaderCanvas(props:Props){
  const canvas=useRef<HTMLCanvasElement>(null),runtime=useRef<Runtime|null>(null),values=useRef(props);
  useEffect(()=>{values.current=props;});
  useEffect(()=>{
    let disposed=false, unsubscribe: null | (()=>void)=null;
    const element=canvas.current;
    if(!element)return;
    const gl=element.getContext("webgl2",{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:"high-performance"});
    if(!gl){props.onError?.(new Error("WebGL2 unavailable for cinematic compositor"));return;}
    let rt:Runtime|null=null;
    const render=()=>{
      const current=runtime.current;if(!current)return;
      const {gl,program:p,vao,uniforms,imageSize,targetSize}=current,v=values.current,dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight),dw=Math.round(w*dpr),dh=Math.round(h*dpr);
      if(element.width!==dw||element.height!==dh){element.width=dw;element.height=dh;element.style.width=`${w}px`;element.style.height=`${h}px`;}
      gl.viewport(0,0,dw,dh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(p);gl.bindVertexArray(vao);
      gl.uniform1i(uniforms.uBase,0);gl.uniform1i(uniforms.uTarget,1);gl.uniform1i(uniforms.uDepth,2);gl.uniform1i(uniforms.uNormal,3);
      gl.uniform2f(uniforms.uResolution,dw,dh);gl.uniform2f(uniforms.uImageSize,imageSize[0],imageSize[1]);gl.uniform2f(uniforms.uTargetSize,targetSize[0],targetSize[1]);
      gl.uniform2f(uniforms.uPointer,v.pointerX,v.pointerY);gl.uniform1f(uniforms.uPointerVelocity,v.pointerVelocity??0);gl.uniform1f(uniforms.uProgress,v.progress);gl.uniform1f(uniforms.uScroll,v.scrollProgress);
      gl.uniform1f(uniforms.uDepthStrength,v.spatial?.depthStrength??0);gl.uniform1f(uniforms.uRelightStrength,v.spatial?.relightStrength??0);gl.uniform1f(uniforms.uUseDepth,v.depthMap?1:0);gl.uniform1f(uniforms.uUseNormal,v.normalMap?1:0);
      gl.uniform1f(uniforms.uReveal,effectCode(v.reveal?.effect));gl.uniform1f(uniforms.uSoftness,v.reveal?.softness??.1);gl.uniform1f(uniforms.uSeed,v.reveal?.seed??47);gl.uniform1f(uniforms.uDirection,directionCode(v.reveal?.direction));
      const edge=hex(v.reveal?.edgeColor);gl.uniform3f(uniforms.uEdge,edge[0],edge[1],edge[2]);gl.uniform1f(uniforms.uEdgeWidth,v.reveal?.edgeWidth??0);gl.uniform1f(uniforms.uOpacity,v.opacity??1);

      gl.uniform1f(uniforms.uWarpMode,warpCode(v.warp?.mode));gl.uniform1f(uniforms.uWarpStrength,v.warp?.strength??0);gl.uniform1f(uniforms.uWarpRadius,v.warp?.radius??.3);gl.uniform1f(uniforms.uWarpFalloff,v.warp?.falloff??2);gl.uniform1f(uniforms.uWarpPointer,v.warp?.pointerInfluence??0);gl.uniform1f(uniforms.uWarpVelocity,v.warp?.velocityInfluence??0);gl.uniform1f(uniforms.uWarpScroll,v.warp?.scrollInfluence??0);gl.uniform1f(uniforms.uWarpFrequency,v.warp?.frequency??8);
      gl.uniform1f(uniforms.uRefractionMode,refractionCode(v.refraction?.mode));gl.uniform1f(uniforms.uRefractionStrength,v.refraction?.strength??0);gl.uniform1f(uniforms.uRefractionRadius,v.refraction?.radius??.34);gl.uniform1f(uniforms.uDispersion,v.refraction?.dispersion??0);gl.uniform1f(uniforms.uEdgeRefraction,v.refraction?.edgeRefraction??0);gl.uniform1f(uniforms.uSheen,v.refraction?.sheen??0);gl.uniform1f(uniforms.uRipple,v.refraction?.ripple??0);gl.uniform1f(uniforms.uRefractionPointer,v.refraction?.pointerInfluence??0);gl.uniform2f(uniforms.uRefractionCenter,(v.refraction?.center[0]??50)/100,(v.refraction?.center[1]??50)/100);
      gl.uniform1f(uniforms.uTransition,transitionCode(v.sceneTransition?.effect));gl.uniform1f(uniforms.uTransitionProgress,v.transitionProgress??0);gl.uniform1f(uniforms.uTransitionSoftness,v.sceneTransition?.softness??.08);gl.uniform1f(uniforms.uTransitionIntensity,v.sceneTransition?.intensity??1);gl.uniform1f(uniforms.uTransitionDisplacement,v.sceneTransition?.displacement??0);gl.uniform1f(uniforms.uTransitionChromatic,v.sceneTransition?.chromaticAberration??0);gl.uniform1f(uniforms.uTransitionBlock,v.sceneTransition?.blockSize??24);gl.uniform1f(uniforms.uTransitionSlats,v.sceneTransition?.slats??12);gl.uniform1f(uniforms.uTransitionSeed,v.sceneTransition?.seed??47);gl.uniform1f(uniforms.uTransitionDirection,directionCode(v.sceneTransition?.direction));
      gl.drawArrays(gl.TRIANGLES,0,3);
    };
    (async()=>{
      const p=createProgram(gl),vao=gl.createVertexArray();if(!vao)throw new Error("Unable to create cinematic VAO");gl.bindVertexArray(vao);
      const names=["uBase","uTarget","uDepth","uNormal","uResolution","uImageSize","uTargetSize","uPointer","uPointerVelocity","uProgress","uScroll","uDepthStrength","uRelightStrength","uUseDepth","uUseNormal","uReveal","uSoftness","uSeed","uDirection","uEdge","uEdgeWidth","uOpacity","uWarpMode","uWarpStrength","uWarpRadius","uWarpFalloff","uWarpPointer","uWarpVelocity","uWarpScroll","uWarpFrequency","uRefractionMode","uRefractionStrength","uRefractionRadius","uDispersion","uEdgeRefraction","uSheen","uRipple","uRefractionPointer","uRefractionCenter","uTransition","uTransitionProgress","uTransitionSoftness","uTransitionIntensity","uTransitionDisplacement","uTransitionChromatic","uTransitionBlock","uTransitionSlats","uTransitionSeed","uTransitionDirection"];
      const uniforms=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]));const textures=[createTexture(gl),createTexture(gl),createTexture(gl),createTexture(gl)];
      const [base,target,depth,normal]=await Promise.all([loadImage(props.src),loadImage(props.targetSrc??props.src),props.depthMap?loadImage(props.depthMap):null,props.normalMap?loadImage(props.normalMap):null]);
      if(disposed)return;
      for(const [index,image] of [base,target,depth,normal].entries()){
        if(!image)continue;gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,textures[index]);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      }
      rt={gl,program:p,vao,uniforms,textures,imageSize:[base.naturalWidth,base.naturalHeight],targetSize:[target.naturalWidth,target.naturalHeight]};runtime.current=rt;render();props.onReady?.();unsubscribe=forgeTicker.subscribe(render);
    })().catch((error)=>{runtime.current=null;props.onError?.(error instanceof Error?error:new Error(String(error)));});
    const onResize=()=>render();window.addEventListener("resize",onResize);
    return()=>{disposed=true;unsubscribe?.();window.removeEventListener("resize",onResize);if(rt){rt.textures.forEach(value=>gl.deleteTexture(value));gl.deleteVertexArray(rt.vao);gl.deleteProgram(rt.program);}runtime.current=null;gl.getExtension("WEBGL_lose_context")?.loseContext();};
  },[props.src,props.targetSrc,props.depthMap,props.normalMap]);
  return <canvas ref={canvas} className="forge-cinematic-shader" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}
