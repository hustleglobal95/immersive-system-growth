"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  BlendFunction,
  type BloomEffect,
  type VignetteEffect,
} from "postprocessing";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
export function PostFX() {
  const quality = useExperienceStore((s) => s.quality),
    motion = useExperienceStore((s) => s.reducedMotion);
  const frame = useCinematicFrame(),
    bloom = useRef<BloomEffect>(null),
    vignette = useRef<VignetteEffect>(null);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = frame.current.post.bloom;
    if (vignette.current)
      vignette.current.darkness = frame.current.post.vignette;
  });
  if (quality === "low" || motion) return null;
  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0}>
      <Bloom
        ref={bloom}
        intensity={0.25}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.5}
        mipmapBlur
      />
      <Vignette
        ref={vignette}
        offset={0.22}
        darkness={0.4}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
