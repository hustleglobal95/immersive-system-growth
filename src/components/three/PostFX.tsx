"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useExperienceStore } from "@/src/store/experienceStore";
import { sampleExperience } from "@/src/lib/sampleExperience";

export function PostFX() {
  const quality = useExperienceStore((state) => state.quality);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const progress = useExperienceStore((state) => state.progress);
  if (quality === "low" || reducedMotion) return null;
  const post = sampleExperience(progress, false).post;

  return (
    <EffectComposer multisampling={quality === "high" ? 4 : 0}>
      <Bloom intensity={post.bloom} luminanceThreshold={0.7} luminanceSmoothing={0.5} mipmapBlur />
      <Vignette offset={0.22} darkness={post.vignette} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
