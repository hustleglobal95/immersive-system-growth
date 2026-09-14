import type { SpatialConfig } from "@/src/lib/cinematic/schema";
export interface SpatialInput { pointerX:number; pointerY:number; scrollProgress:number }
export interface SpatialSample { translateX:number; translateY:number; scale:number; rotateX:number; rotateY:number; lightX:number; lightY:number; focusBlur:number }
export function sampleSpatialImage(config:SpatialConfig,input:SpatialInput):SpatialSample{
  const depth=config.depthStrength, px=input.pointerX*config.pointerResponse, py=input.pointerY*config.pointerResponse, scroll=(input.scrollProgress-.5)*2*config.scrollResponse;
  return {translateX:px*depth,translateY:-py*depth+scroll*depth*.35,scale:1+Math.abs(scroll)*.018+depth/4000,rotateX:-py*1.8,rotateY:px*2.2,lightX:.5+input.pointerX*.5,lightY:.5-input.pointerY*.5,focusBlur:Math.abs(input.scrollProgress-config.focus)*2.5};
}
export function spatialImageCss(sample:SpatialSample){return {transform:`translate3d(${sample.translateX.toFixed(2)}px,${sample.translateY.toFixed(2)}px,0) scale(${sample.scale.toFixed(5)}) rotateX(${sample.rotateX.toFixed(2)}deg) rotateY(${sample.rotateY.toFixed(2)}deg)`,transformOrigin:"50% 50%",willChange:"transform, filter"};}
