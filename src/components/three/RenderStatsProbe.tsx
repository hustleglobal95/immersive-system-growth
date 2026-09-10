"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useExperienceStore } from "@/src/store/experienceStore";

export function RenderStatsProbe() {
  const frame = useRef(0);
  useFrame(({ gl }) => {
    frame.current += 1;
    if (frame.current % 24 !== 0) return;
    const render = gl.info.render;
    useExperienceStore.getState().setRendererStats({
      calls: render.calls,
      triangles: render.triangles,
      lines: render.lines,
      points: render.points,
    });
  });
  return null;
}
