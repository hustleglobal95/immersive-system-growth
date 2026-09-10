"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useExperienceStore } from "@/src/store/experienceStore";
export function RenderStatsProbe() {
  const { gl } = useThree();
  const sum = useRef({ frames: 0, ms: 0 });
  useEffect(() => {
    const previous = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = previous;
    };
  }, [gl]);
  useFrame((_, delta) => {
    // At the start of a frame, counters include ALL render passes from the previous frame.
    sum.current.frames++;
    sum.current.ms += delta * 1000;
    if (sum.current.frames >= 30) {
      if (useExperienceStore.getState().debug) {
        const r = gl.info.render;
        useExperienceStore
          .getState()
          .setRendererStats({
            calls: r.calls,
            triangles: r.triangles,
            lines: r.lines,
            points: r.points,
            textures: gl.info.memory.textures,
            geometries: gl.info.memory.geometries,
            frameMs: sum.current.ms / sum.current.frames,
          });
      }
      sum.current = { frames: 0, ms: 0 };
    }
    gl.info.reset();
  }, -200);
  return null;
}
