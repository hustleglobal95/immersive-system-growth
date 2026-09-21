"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { qualityDpr } from "@/src/lib/quality";
import { governedDpr, renderGovernorProfile } from "@/src/lib/renderGovernor";
import { ACESFilmicToneMapping, ColorManagement, PCFSoftShadowMap, SRGBColorSpace } from "three";
export function RendererLifecycle() {
  const experience = useExperienceConfig();
  const { gl, size, setDpr } = useThree();
  const quality = useExperienceStore((s) => s.quality);
  const governorTier = useExperienceStore((s) => s.renderGovernor.tier);
  useEffect(() => {
    ColorManagement.enabled = true;
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.shadowMap.type = PCFSoftShadowMap;
  }, [gl]);
  useEffect(() => {
    const baseDpr=qualityDpr(
      quality,
      window.devicePixelRatio,
      size.width,
      size.height,
      experience.runtime.minDpr,
      experience.runtime.maxDpr,
      experience.runtime.maxPixels,
    );
    const dpr=governedDpr(baseDpr,quality,governorTier);
    setDpr(dpr);
    const profile=renderGovernorProfile(quality,governorTier);
    const root=document.documentElement;
    root.dataset.forgeRenderGovernor=governorTier;
    root.dataset.forgeReconstruction=profile.reconstruction;
    root.style.setProperty("--forge-render-scale",profile.dprScale.toFixed(3));
  }, [experience.runtime.maxDpr, experience.runtime.maxPixels, experience.runtime.minDpr, governorTier, quality, size.width, size.height, setDpr]);
  useEffect(() => {
    const canvas = gl.domElement;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const set = useExperienceStore.getState().setWebglStatus;
    set("ready");
    const lost = (event: Event) => {
      event.preventDefault();
      set("lost");
      timeout = setTimeout(() => set("failed"), 8000);
    };
    const restored = () => {
      clearTimeout(timeout);
      set("ready");
    };
    const previousError = gl.debug.onShaderError;
    gl.debug.onShaderError = (...args) => {
      set("failed");
      previousError?.(...args);
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      gl.debug.onShaderError = previousError;
      clearTimeout(timeout);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl]);
  return null;
}
