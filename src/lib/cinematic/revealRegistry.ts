import type { RevealConfig } from "@/src/lib/cinematic/schema";
export interface RevealInput { progress:number; pointerX:number; pointerY:number; velocity:number; trailEnergy:number }
export interface RevealSample { progress:number; cssMask:string; edgeOpacity:number; displacement:number }
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const remap=(v:number,a:number,b:number)=>clamp01((v-a)/Math.max(1e-6,b-a));
const noise=(v:number,seed:number)=>{const x=Math.sin(v*12.9898+seed*78.233)*43758.5453;return x-Math.floor(x);};
const pct=(v:number)=>`${v.toFixed(2)}%`;
/** A finished reveal always hands the whole frame back to the image. */
export const FULL_REVEAL_MASK="linear-gradient(#000,#000)";
export function sampleReveal(config:RevealConfig,input:RevealInput):RevealSample{
  const base=remap(input.progress,config.range[0],config.range[1]);
  // Pointer drift and grain shape a reveal only while it is travelling. Damping them by
  // activity keeps a completed reveal complete instead of holding the mask off the frame.
  const activity=base*(1-base)*4;
  const jitter=(noise(base*17,config.seed)-.5)*.08*config.intensity*activity;
  const drift=((Math.abs(input.pointerX)+Math.abs(input.pointerY))*.02*config.pointerInfluence+input.trailEnergy*.03*config.trailInfluence)*activity;
  const p=clamp01(base+drift+jitter);
  const s=Math.max(.001,config.softness);
  // The wipe edge travels from fully hidden (-softness) to fully revealed (1 + softness).
  const edge=-s+p*(1+2*s), lo=(edge-s)*100, hi=(edge+s)*100;
  const dir={left:"to left",right:"to right",up:"to top",down:"to bottom"}[config.direction];
  const axis=config.direction==="up"||config.direction==="down"?"0deg":"90deg";
  let cssMask=`linear-gradient(${dir},#000 0%,#000 ${pct(lo)},transparent ${pct(hi)})`;
  if(config.effect==="radial"){const inner=p*(100+s*60);cssMask=`radial-gradient(circle at ${pct((input.pointerX*.5+.5)*100)} ${pct((-input.pointerY*.5+.5)*100)},#000 0%,#000 ${pct(inner)},transparent ${pct(inner+s*60)})`;}
  if(config.effect==="liquid"){const inner=Math.max(0,p*108-s*30);cssMask=`radial-gradient(ellipse ${pct(40+p*120)} ${pct(34+p*116)} at ${pct(50+input.pointerX*18)} ${pct(50-input.pointerY*18)},#000 0%,#000 ${pct(inner)},transparent ${pct(inner+s*40+2)})`;}
  if(config.effect==="burn") cssMask=`linear-gradient(${axis},#000 0%,#000 ${pct(lo)},rgba(0,0,0,.7) ${pct(edge*100)},transparent ${pct(hi)})`;
  if(config.effect==="wireframe"||config.effect==="contour"){const period=14,band=p*period;cssMask=`repeating-linear-gradient(${axis},#000 0 ${band.toFixed(2)}px,transparent ${band.toFixed(2)}px ${period}px)`;}
  if(config.effect==="particle"){const inner=p*112;cssMask=`radial-gradient(circle,#000 ${pct(inner)},transparent ${pct(inner+Math.max(2,18-p*16))})`;}
  if(p>=.999) cssMask=FULL_REVEAL_MASK;
  return {progress:p,cssMask,edgeOpacity:clamp01(1-Math.abs(p-.5)*2)*config.intensity,displacement:(input.velocity+input.trailEnergy)*config.intensity};
}
