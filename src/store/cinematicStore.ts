"use client";
import { create } from "zustand";
export interface PointerTrailPoint{x:number;y:number;age:number}
interface CinematicState{springProgress:number;springVelocity:number;pointer:{x:number;y:number;velocityX:number;velocityY:number;speed:number;pressure:number;dwell:number;trailEnergy:number};trail:PointerTrailPoint[];setSpring:(value:number,velocity:number)=>void;setPointerSignal:(value:CinematicState["pointer"],trail:PointerTrailPoint[])=>void;}
export const useCinematicStore=create<CinematicState>((set)=>({springProgress:0,springVelocity:0,pointer:{x:0,y:0,velocityX:0,velocityY:0,speed:0,pressure:0,dwell:0,trailEnergy:0},trail:[],setSpring:(springProgress,springVelocity)=>set({springProgress,springVelocity}),setPointerSignal:(pointer,trail)=>set({pointer,trail})}));
