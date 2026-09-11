"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { qualityDpr } from "@/src/lib/quality";
export function RendererLifecycle() {
  const experience = useExperienceConfig();
  const { gl, size, setDpr } = useThree();
  const quality = useExperienceStore((s) => s.quality);
  useEffect(() => {
    setDpr(
      qualityDpr(
        quality,
        window.devicePixelRatio,
        size.width,
        size.height,
        experience.runtime.minDpr,
        experience.runtime.maxDpr,
        experience.runtime.maxPixels,
      ),
    );
  }, [experience.runtime.maxDpr, experience.runtime.maxPixels, experience.runtime.minDpr, quality, size.width, size.height, setDpr]);
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
