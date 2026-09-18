import type { DiagramConfig } from "@/src/lib/cinematic/schema";
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
// Each line eases in and out of its own draw so it does not start and stop dead; the sequence
// across edges stays even, so the plan still builds at a steady rate.
const ease=(v:number)=>{const t=clamp01(v);return t*t*t*(t*(t*6-15)+10);};
export function sampleDiagram(config:DiagramConfig,progress:number){const draw=clamp01((progress-config.drawRange[0])/Math.max(1e-6,config.drawRange[1]-config.drawRange[0])),points=new Map(config.points.map(point=>[point.id,point])),edges=config.edges.flatMap((edge,index)=>{const from=points.get(edge.from),to=points.get(edge.to);if(!from||!to)return[];const start=index/Math.max(1,config.edges.length),end=Math.min(1,start+Math.max(.12,1/Math.max(1,config.edges.length)));return[{from,to,label:edge.label,progress:ease((draw-start)/Math.max(1e-6,end-start))}];});return{draw,points:config.points,edges};}
export function svgSegment(from:{x:number;y:number},to:{x:number;y:number},progress:number,width=1000,height=600){return{x1:from.x*width,y1:from.y*height,x2:(from.x+(to.x-from.x)*progress)*width,y2:(from.y+(to.y-from.y)*progress)*height};}
