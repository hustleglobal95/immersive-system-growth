"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import {
  BlendFunction,
  type BloomEffect,
  type VignetteEffect,
} from "postprocessing";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { cinematicRenderProfile } from "@/src/lib/renderProfile";
export function PostFX() {
  const quality = useExperienceStore((s) => s.quality),
    governorTier = useExperienceStore((s) => s.renderGovernor.tier),
    motion = useExperienceStore((s) => s.reducedMotion);
  const frame = useCinematicFrame(),
    bloom = useRef<BloomEffect>(null),
    vignette = useRef<VignetteEffect>(null);
  const profile = cinematicRenderProfile(quality,governorTier);
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = frame.current.post.bloom * profile.bloomScale;
    if (vignette.current)
      vignette.current.darkness = frame.current.post.vignette;
  });
  if (motion || (!profile.bloom && profile.antialias === "none")) return null;
  return (
    <EffectComposer multisampling={profile.composerMultisampling}>
      {profile.antialias === "smaa" && <SMAA />}
      {profile.bloom && <Bloom
        ref={bloom}
        intensity={0.25}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.5}
        mipmapBlur={profile.bloomMipmap}
      />}
      <Vignette
        ref={vignette}
        offset={0.22}
        darkness={0.4}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
