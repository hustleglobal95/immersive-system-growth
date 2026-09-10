"use client";

import { Html } from "@react-three/drei";
import type { ReactNode } from "react";
import type { Vec3 } from "@/src/types/experience";

export function HtmlScreen({ children, position = [0, 0, 0], rotation = [0, 0, 0], distanceFactor = 1.5 }: { children: ReactNode; position?: Vec3; rotation?: Vec3; distanceFactor?: number }) {
  return (
    <Html transform occlude="blending" position={position} rotation={rotation} distanceFactor={distanceFactor}>
      <div className="html-screen">{children}</div>
    </Html>
  );
}
