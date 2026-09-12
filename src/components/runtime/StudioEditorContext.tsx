"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Vec3 } from "@/src/types/experience";

export interface StudioGizmoState {
  target: string;
  mode: "translate" | "rotate" | "scale";
  value: Vec3;
  anchor: Vec3;
  display?: Vec3;
  snap: number;
  onChange: (value: Vec3) => void;
  onBegin: () => void;
  onEnd: () => void;
}

const StudioEditorContext = createContext<StudioGizmoState | null>(null);

export function StudioEditorProvider({ value, children }: { value: StudioGizmoState | null; children: ReactNode }) {
  return <StudioEditorContext.Provider value={value}>{children}</StudioEditorContext.Provider>;
}

export function useStudioEditor() {
  return useContext(StudioEditorContext);
}
