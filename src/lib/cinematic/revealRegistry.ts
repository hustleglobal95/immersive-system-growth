import type { RevealConfig } from "@/src/lib/cinematic/schema";
export interface RevealInput { progress:number; pointerX:number; pointerY:number; velocity:number; trailEnergy:number }
export interface RevealSample { progress:number; cssMask:string; edgeOpacity:number; displacement:number }
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const remap=(v:number,a:number,b:number)=>clamp01((v-a)/Math.max(1e-6,b-a));
const noise=(v:number,seed:number)=>{const x=Math.sin(v*12.9898+seed*78.233)*43758.5453;return x-Math.floor(x);};
export function sampleReveal(config:RevealConfig,input:RevealInput):RevealSample{
  const base=remap(input.progress,config.range[0],config.range[1]);
  const jitter=(noise(base*17,config.seed)-.5)*.08*config.intensity;
  const p=clamp01(base+(Math.abs(input.pointerX)+Math.abs(input.pointerY))*.02*config.pointerInfluence+input.trailEnergy*.03*config.trailInfluence+jitter);
  const s=Math.max(.001,config.softness), lo=Math.max(0,p-s)*100, hi=Math.min(1,p+s)*100;
  const dir={left:"to left",right:"to right",up:"to top",down:"to bottom"}[config.direction];
  let cssMask=`linear-gradient(${dir},#000 0%,#000 ${lo}%,transparent ${hi}%)`;
  if(config.effect==="radial") cssMask=`radial-gradient(circle at ${(input.pointerX*.5+.5)*100}% ${(-input.pointerY*.5+.5)*100}%,#000 0%,#000 ${p*72}%,transparent ${Math.min(100,p*72+s*100)}%)`;
  if(config.effect==="liquid") cssMask=`radial-gradient(ellipse ${40+p*80}% ${32+p*74}% at ${50+input.pointerX*18}% ${50-input.pointerY*18}%,#000 0%,#000 ${Math.max(0,p*75-s*45)}%,transparent ${Math.min(100,p*82+s*55)}%)`;
  if(config.effect==="burn") cssMask=`linear-gradient(${config.direction==="up"||config.direction==="down"?"0deg":"90deg"},#000 ${Math.max(0,p*100-s*80)}%,rgba(0,0,0,.7) ${p*100}%,transparent ${Math.min(100,p*100+s*80)}%)`;
  if(config.effect==="wireframe"||config.effect==="contour") cssMask=`repeating-linear-gradient(${config.direction==="up"?"0deg":"90deg"},#000 0 1px,transparent 1px ${Math.max(3,12-p*8)}px)`;
  if(config.effect==="particle") cssMask=`radial-gradient(circle,#000 ${p*68}%,transparent ${Math.min(100,p*70+Math.max(2,18-p*14))}%)`;
  return {progress:p,cssMask,edgeOpacity:clamp01(1-Math.abs(p-.5)*2)*config.intensity,displacement:(input.velocity+input.trailEnergy)*config.intensity};
}
