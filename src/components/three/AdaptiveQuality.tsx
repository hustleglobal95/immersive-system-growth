"use client";
import { useRef } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useExperienceStore } from "@/src/store/experienceStore";
import { mean, percentile95 } from "@/src/lib/renderGovernor";

export function AdaptiveQuality() {
  const samples=useRef<number[]>([]);
  const elapsed=useRef(0);
  useFrame((_,delta)=>{
    const ms=Math.min(100,Math.max(0,delta*1000));
    samples.current.push(ms);
    if(samples.current.length>120) samples.current.shift();
    elapsed.current+=delta;
    if(elapsed.current<.75 || samples.current.length<30) return;
    elapsed.current=0;
    const values=samples.current.slice(-90);
    useExperienceStore.getState().setRenderGovernorTelemetry({
      frameMean:mean(values),
      frameP95:percentile95(values),
      samples:values.length,
      updatedAt:performance.now(),
    });
  },-210);

  return (
    <PerformanceMonitor
      iterations={10}
      ms={250}
      flipflops={3}
      onDecline={() => useExperienceStore.getState().adaptRendering(-1,"performance-monitor")}
      onIncline={() => useExperienceStore.getState().adaptRendering(1,"performance-monitor")}
      onFallback={() => useExperienceStore.getState().adaptRendering(0,"performance-monitor")}
    />
  );
}
