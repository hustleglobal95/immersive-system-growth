"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame } from "@react-three/fiber";
import { experience } from "@/src/lib/experience";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { sampleExperience } from "@/src/lib/sampleExperience";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { SampledExperienceState } from "@/src/types/experience";
interface Frame {
  current: SampledExperienceState;
  progress: number;
}
const Context = createContext<Frame | null>(null);
export function CinematicFrame({ children }: { children: ReactNode }) {
  const [value] = useState<Frame>(() => ({
    current: sampleExperience(0, true),
    progress: 0,
  }));
  const previous = useRef({ aspect: 0, motion: true, initialized: false });
  useFrame(({ size }, delta) => {
    const s = useExperienceStore.getState(),
      aspect = size.width / Math.max(1, size.height);
    const immediate =
      !previous.current.initialized ||
      s.reducedMotion ||
      Math.abs(value.progress - s.progress) > 0.2;
    // One shared damped time drives camera, object, world and effects. A seek snaps as a unit.
    const alpha = immediate
      ? 1
      : 1 -
        Math.exp(
          -Math.min(
            experience.runtime.cameraDamping,
            experience.runtime.objectDamping,
          ) * Math.min(delta, 0.1),
        );
    let p = value.progress + (s.progress - value.progress) * alpha;
    if (Math.abs(p - s.progress) < 0.00001) p = s.progress;
    if (
      p !== value.progress ||
      previous.current.aspect !== aspect ||
      previous.current.motion !== s.reducedMotion ||
      !previous.current.initialized
    ) {
      value.progress = p;
      value.current = sampleExperience(p, s.reducedMotion, experience, aspect);
      previous.current = { aspect, motion: s.reducedMotion, initialized: true };
    }
    cinematicProgress.publish(value.progress);
  }, -100);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCinematicFrame() {
  const frame = useContext(Context);
  if (!frame) throw new Error("CinematicFrame provider required");
  return frame;
}
