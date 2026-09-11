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
import { sampleCameraShot } from "@/src/lib/cameraShots";
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
  const previousPreview = useRef(useExperienceStore.getState().cameraPreview);
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
      previousPreview.current !== s.cameraPreview ||
      !previous.current.initialized
    ) {
      value.progress = p;
      value.current = sampleExperience(p, s.reducedMotion, experience, aspect);
      if (!s.reducedMotion && s.cameraPreview?.sceneId === value.current.scene.id) {
        value.current.camera = sampleCameraShot(aspect < .85 ? s.cameraPreview.mobileCamera : s.cameraPreview.camera, value.current.easedProgress);
      }
      previousPreview.current = s.cameraPreview;
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
