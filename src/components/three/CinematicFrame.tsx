"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
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
  const experience = useExperienceConfig();
  const [value] = useState<Frame>(() => ({
    current: sampleExperience(0, true, experience),
    progress: 0,
  }));
  const previous = useRef({ aspect: 0, motion: true, initialized: false, config: experience });
  const previousPreview = useRef(useExperienceStore.getState().cameraPreview);
  useFrame(({ size }, delta) => {
    const state = useExperienceStore.getState();
    const aspect = size.width / Math.max(1, size.height);
    const targetProgress = state.runtimeProgress ?? state.progress;
    const runtimeDriven = state.runtimeProgress !== null;
    const immediate =
      !previous.current.initialized ||
      state.reducedMotion ||
      runtimeDriven ||
      Math.abs(value.progress - targetProgress) > 0.2;
    // One shared time drives camera, object, world and effects. Runtime sequences are exact;
    // ordinary scroll remains damped so user input keeps the original cinematic feel.
    const alpha = immediate
      ? 1
      : 1 -
        Math.exp(
          -Math.min(
            experience.runtime.cameraDamping,
            experience.runtime.objectDamping,
          ) * Math.min(delta, 0.1),
        );
    let progress = value.progress + (targetProgress - value.progress) * alpha;
    if (Math.abs(progress - targetProgress) < 0.00001) progress = targetProgress;
    if (
      progress !== value.progress ||
      previous.current.aspect !== aspect ||
      previous.current.motion !== state.reducedMotion ||
      previousPreview.current !== state.cameraPreview ||
      previous.current.config !== experience ||
      !previous.current.initialized
    ) {
      value.progress = progress;
      value.current = sampleExperience(progress, state.reducedMotion, experience, aspect);
      if (!state.reducedMotion && state.cameraPreview?.sceneId === value.current.scene.id) {
        value.current.camera = sampleCameraShot(
          aspect < .85 ? state.cameraPreview.mobileCamera : state.cameraPreview.camera,
          value.current.easedProgress,
        );
      }
      previousPreview.current = state.cameraPreview;
      previous.current = { aspect, motion: state.reducedMotion, initialized: true, config: experience };
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
