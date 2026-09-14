"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useExperienceStore, type RendererStats } from "@/src/store/experienceStore";

export function RenderStatsProbe() {
  const { gl } = useThree();
  const sum = useRef({ frames: 0, ms: 0 });
  const last = useRef<RendererStats | null>(null);
  useEffect(() => {
    const previous = gl.info.autoReset;
    gl.info.autoReset = false;
    last.current = null;
    return () => { gl.info.autoReset = previous; };
  }, [gl]);
  useFrame((_, delta) => {
    // Counters include all render passes from the previous completed frame.
    sum.current.frames++;
    sum.current.ms += delta * 1000;
    const r = gl.info.render;
    const prior = last.current;
    const changed = !prior || prior.calls !== r.calls || prior.triangles !== r.triangles
      || prior.lines !== r.lines || prior.points !== r.points
      || prior.textures !== gl.info.memory.textures || prior.geometries !== gl.info.memory.geometries;
    // A demand-rendered scene may settle before 30 frames. Publish its first
    // nonempty result and changed budgets immediately; never invalidate here.
    if (r.calls > 0 && useExperienceStore.getState().debug && (changed || sum.current.frames >= 30)) {
      const snapshot: RendererStats = {
        calls: r.calls, triangles: r.triangles, lines: r.lines, points: r.points,
        textures: gl.info.memory.textures, geometries: gl.info.memory.geometries,
        frameMs: sum.current.ms / sum.current.frames,
      };
      last.current = snapshot;
      useExperienceStore.getState().setRendererStats(snapshot);
      sum.current = { frames: 0, ms: 0 };
    } else if (sum.current.frames >= 30) {
      sum.current = { frames: 0, ms: 0 };
    }
    gl.info.reset();
  }, -200);
  return null;
}
