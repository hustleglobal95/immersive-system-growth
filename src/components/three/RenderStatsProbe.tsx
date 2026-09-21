"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useExperienceStore } from "@/src/store/experienceStore";
import { renderGovernorProfile } from "@/src/lib/renderGovernor";

type ForgeRenderStats = {
  calls:number;
  triangles:number;
  lines:number;
  points:number;
  textures:number;
  geometries:number;
  programs:number;
  frameMs:number;
  drawingBufferPixels:number;
  pixelRatio:number;
  sampledAt:number;
  quality:string;
  governorTier:string;
  governorFrameP95:number;
  reconstruction:string;
};

export function RenderStatsProbe() {
  const { gl } = useThree();
  const sum = useRef({ frames: 0, ms: 0 });
  useEffect(() => {
    const previous = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = previous;
      delete (window as Window & { __FORGE_RENDER_STATS__?:ForgeRenderStats }).__FORGE_RENDER_STATS__;
    };
  }, [gl]);
  useFrame((_, delta) => {
    // At the start of a frame, counters include ALL render passes from the previous frame.
    sum.current.frames++;
    sum.current.ms += delta * 1000;
    if (sum.current.frames >= 30) {
      const r = gl.info.render;
      const runtime=useExperienceStore.getState();
      const governorProfile=renderGovernorProfile(runtime.quality,runtime.renderGovernor.tier);
      const stats:ForgeRenderStats={
        calls:r.calls,
        triangles:r.triangles,
        lines:r.lines,
        points:r.points,
        textures:gl.info.memory.textures,
        geometries:gl.info.memory.geometries,
        programs:gl.info.programs?.length ?? 0,
        frameMs:sum.current.ms / sum.current.frames,
        drawingBufferPixels:gl.domElement.width*gl.domElement.height,
        pixelRatio:gl.getPixelRatio(),
        sampledAt:performance.now(),
        quality:runtime.quality,
        governorTier:runtime.renderGovernor.tier,
        governorFrameP95:runtime.renderGovernor.telemetry.frameP95,
        reconstruction:governorProfile.reconstruction,
      };
      // A bounded read-only profiling bridge lets Loop Engine compare incumbent/candidate
      // render cost without coupling the production runtime to the authoring process.
      (window as Window & { __FORGE_RENDER_STATS__?:ForgeRenderStats }).__FORGE_RENDER_STATS__=stats;
      if (useExperienceStore.getState().debug) {
        useExperienceStore.getState().setRendererStats({
          calls:stats.calls,
          triangles:stats.triangles,
          lines:stats.lines,
          points:stats.points,
          textures:stats.textures,
          geometries:stats.geometries,
          frameMs:stats.frameMs,
        });
      }
      sum.current = { frames: 0, ms: 0 };
    }
    gl.info.reset();
  }, -200);
  return null;
}
