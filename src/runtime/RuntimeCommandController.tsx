"use client";

import { useEffect, useRef } from "react";
import { Color } from "three";
import { experience } from "@/src/lib/experience";
import { cameraShotNames, createCameraShot, type CameraShotName } from "@/src/lib/cameraShots";
import { sampleExperience } from "@/src/lib/sampleExperience";
import {
  defaultSequenceDuration,
  lerpCameraState,
  runtimeEase,
  sampleCameraTransition,
} from "@/src/lib/runtimeCommands";
import type { InteractionAction, RuntimeEasing } from "@/src/lib/interactionGraph";
import type { CameraDefinition, CameraState } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { dispatchForgeLifecycle } from "@/src/runtime/interactionEvents";
import {
  readShaderTarget,
  writeShaderTarget,
  type ForgeShaderValue,
} from "@/src/runtime/shaderRegistry";

type SequenceAction = Extract<InteractionAction, { type: "sequence" }>;
type CameraAction = Extract<InteractionAction, { type: "camera" }>;
type AudioAction = Extract<InteractionAction, { type: "audio" }>;
type ShaderAction = Extract<InteractionAction, { type: "shader" }>;
type CommandDetail<T> = Omit<T, "type"> & { nodeId?: string };

interface SequencePlayback {
  name: string;
  current: number;
  start: number;
  end: number;
  durationMs: number;
  loop: boolean;
  release: boolean;
  frame: number | null;
  paused: boolean;
}
interface CameraPlayback {
  name: string;
  frame: number | null;
}
interface AudioCue {
  element: HTMLAudioElement;
  src: string;
  fadeFrame: number | null;
}

export function RuntimeCommandController() {
  const sequence = useRef<SequencePlayback | null>(null);
  const camera = useRef<CameraPlayback | null>(null);
  const audio = useRef(new Map<string, AudioCue>());
  const shaderFrames = useRef(new Map<string, number>());

  useEffect(() => {
    const cancelSequence = (reason: string, emit = true) => {
      const current = sequence.current;
      if (!current) return;
      if (current.frame !== null) cancelAnimationFrame(current.frame);
      current.frame = null;
      if (emit) dispatchForgeLifecycle("action-cancelled", current.name, { kind: "sequence", reason });
    };

    const onSequence = (event: Event) => {
      const detail = (event as CustomEvent<CommandDetail<SequenceAction>>).detail;
      if (!detail?.name) return;
      const scene = experience.scenes.find((candidate) => candidate.id === detail.name);
      if (!scene) {
        dispatchForgeLifecycle("action-cancelled", detail.name, { kind: "sequence", reason: "unknown-sequence" });
        return;
      }
      if (detail.command === "pause") {
        const current = sequence.current;
        if (current?.name === detail.name) {
          if (current.frame !== null) cancelAnimationFrame(current.frame);
          current.frame = null;
          current.paused = true;
        }
        return;
      }
      if (detail.command === "stop") {
        const current = sequence.current;
        if (current?.name === detail.name) cancelSequence("stopped", false);
        sequence.current = null;
        useExperienceStore.getState().setRuntimeProgress(null);
        dispatchForgeLifecycle("sequence-complete", detail.name, { completed: false, reason: "stopped" });
        return;
      }

      const previous = sequence.current;
      if (previous && previous.name !== detail.name) cancelSequence("replaced");
      const resume = previous?.name === detail.name && previous.paused;
      const start = scene.range[0];
      const end = scene.range[1];
      const currentProgress = resume ? previous.current : start;
      const durationMs = detail.durationMs ?? previous?.durationMs ?? defaultSequenceDuration(scene.range);
      const playback: SequencePlayback = {
        name: detail.name,
        current: currentProgress,
        start,
        end,
        durationMs,
        loop: detail.loop ?? false,
        release: detail.release ?? false,
        frame: null,
        paused: false,
      };
      sequence.current = playback;
      useExperienceStore.getState().setRuntimeProgress(currentProgress);

      if (useExperienceStore.getState().reducedMotion || durationMs === 0) {
        playback.current = end;
        useExperienceStore.getState().setRuntimeProgress(end);
        if (playback.release) useExperienceStore.getState().setRuntimeProgress(null);
        dispatchForgeLifecycle("sequence-complete", detail.name, { completed: true, reason: "finished" });
        return;
      }

      const playPass = (from: number) => {
        const remaining = Math.max(0.000001, (end - from) / Math.max(0.000001, end - start));
        const passDuration = Math.max(1, durationMs * remaining);
        const started = performance.now();
        const tick = (now: number) => {
          if (sequence.current !== playback || playback.paused) return;
          const linear = Math.max(0, Math.min(1, (now - started) / passDuration));
          const eased = runtimeEase(linear, "ease-in-out");
          playback.current = from + (end - from) * eased;
          useExperienceStore.getState().setRuntimeProgress(playback.current);
          if (linear < 1) {
            playback.frame = requestAnimationFrame(tick);
            return;
          }
          playback.frame = null;
          if (playback.loop) {
            playback.current = start;
            useExperienceStore.getState().setRuntimeProgress(start);
            playPass(start);
            return;
          }
          playback.current = end;
          if (playback.release) useExperienceStore.getState().setRuntimeProgress(null);
          dispatchForgeLifecycle("sequence-complete", detail.name, { completed: true, reason: "finished" });
        };
        playback.frame = requestAnimationFrame(tick);
      };
      playPass(currentProgress);
    };

    const cancelCamera = (reason: string, emit = true) => {
      const current = camera.current;
      if (!current) return;
      if (current.frame !== null) cancelAnimationFrame(current.frame);
      current.frame = null;
      if (emit) dispatchForgeLifecycle("action-cancelled", current.name, { kind: "camera", reason });
    };

    const onCamera = (event: Event) => {
      const detail = (event as CustomEvent<CommandDetail<CameraAction>>).detail;
      if (!detail?.name) return;
      const store = useExperienceStore.getState();
      const aspect = Math.max(0.2, window.innerWidth / Math.max(1, window.innerHeight));
      const baseProgress = store.runtimeProgress ?? store.progress;
      const baseCamera = store.runtimeCamera ?? sampleExperience(baseProgress, store.reducedMotion, experience, aspect).camera;

      if (detail.command === "reset") {
        if (camera.current) cancelCamera("reset", false);
        const destination = sampleExperience(baseProgress, store.reducedMotion, experience, aspect).camera;
        const duration = detail.durationMs ?? 700;
        if (!store.runtimeCamera || store.reducedMotion || duration === 0) {
          store.setRuntimeCamera(null);
          dispatchForgeLifecycle("camera-complete", detail.name, { completed: true, reason: "reset" });
          return;
        }
        const playback: CameraPlayback = { name: detail.name, frame: null };
        camera.current = playback;
        const started = performance.now();
        const from = store.runtimeCamera;
        const tick = (now: number) => {
          if (camera.current !== playback) return;
          const linear = Math.max(0, Math.min(1, (now - started) / Math.max(1, duration)));
          store.setRuntimeCamera(lerpCameraState(from, destination, runtimeEase(linear, "ease-in-out")));
          if (linear < 1) playback.frame = requestAnimationFrame(tick);
          else {
            playback.frame = null;
            store.setRuntimeCamera(null);
            dispatchForgeLifecycle("camera-complete", detail.name, { completed: true, reason: "reset" });
          }
        };
        playback.frame = requestAnimationFrame(tick);
        return;
      }

      const definition = resolveCameraDefinition(detail.name, aspect, baseCamera);
      if (!definition) {
        dispatchForgeLifecycle("action-cancelled", detail.name, { kind: "camera", reason: "unknown-camera" });
        return;
      }
      if (camera.current) cancelCamera("replaced");
      const duration = detail.durationMs ?? 1800;
      const playback: CameraPlayback = { name: detail.name, frame: null };
      camera.current = playback;
      if (store.reducedMotion || duration === 0) {
        store.setRuntimeCamera(definition.to);
        if (detail.release) store.setRuntimeCamera(null);
        dispatchForgeLifecycle("camera-complete", detail.name, { completed: true, reason: "finished" });
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        if (camera.current !== playback) return;
        const linear = Math.max(0, Math.min(1, (now - started) / Math.max(1, duration)));
        const sampled = sampleCameraTransition(baseCamera, definition, runtimeEase(linear, "ease-in-out"));
        useExperienceStore.getState().setRuntimeCamera(sampled);
        if (linear < 1) playback.frame = requestAnimationFrame(tick);
        else {
          playback.frame = null;
          if (detail.release) useExperienceStore.getState().setRuntimeCamera(null);
          dispatchForgeLifecycle("camera-complete", detail.name, { completed: true, reason: "finished" });
        }
      };
      playback.frame = requestAnimationFrame(tick);
    };

    const fadeAudio = (cue: AudioCue, target: number, duration: number, done?: () => void) => {
      if (cue.fadeFrame !== null) cancelAnimationFrame(cue.fadeFrame);
      if (duration <= 0) {
        cue.element.volume = target;
        cue.fadeFrame = null;
        done?.();
        return;
      }
      const from = cue.element.volume;
      const started = performance.now();
      const tick = (now: number) => {
        const linear = Math.max(0, Math.min(1, (now - started) / duration));
        cue.element.volume = from + (target - from) * runtimeEase(linear, "smooth");
        if (linear < 1) cue.fadeFrame = requestAnimationFrame(tick);
        else {
          cue.fadeFrame = null;
          done?.();
        }
      };
      cue.fadeFrame = requestAnimationFrame(tick);
    };

    const onAudio = (event: Event) => {
      const detail = (event as CustomEvent<CommandDetail<AudioAction>>).detail;
      if (!detail?.name) return;
      let cue = audio.current.get(detail.name);
      if (!cue && detail.src) {
        const element = new Audio(detail.src);
        element.preload = "auto";
        cue = { element, src: detail.src, fadeFrame: null };
        audio.current.set(detail.name, cue);
      }
      if (!cue) {
        dispatchForgeLifecycle("action-cancelled", detail.name, { kind: "audio", reason: "missing-source" });
        return;
      }
      if (detail.src && detail.src !== cue.src) {
        cue.element.pause();
        cue.element.src = detail.src;
        cue.src = detail.src;
        cue.element.load();
      }
      const targetVolume = detail.volume ?? 1;
      const fadeMs = detail.fadeMs ?? 0;
      if (detail.loop !== undefined) cue.element.loop = detail.loop;
      cue.element.onended = () => dispatchForgeLifecycle("audio-complete", detail.name, { completed: true, reason: "ended" });

      if (detail.command === "play") {
        if (fadeMs > 0) cue.element.volume = 0;
        void cue.element.play().then(() => {
          fadeAudio(cue!, targetVolume, fadeMs);
        }).catch(() => {
          dispatchForgeLifecycle("action-cancelled", detail.name, { kind: "audio", reason: "playback-blocked" });
        });
        return;
      }
      if (detail.command === "pause") {
        fadeAudio(cue, 0, fadeMs, () => cue!.element.pause());
        return;
      }
      fadeAudio(cue, 0, fadeMs, () => {
        cue!.element.pause();
        try { cue!.element.currentTime = 0; } catch { /* Non-seekable streams stay paused. */ }
        dispatchForgeLifecycle("audio-complete", detail.name, { completed: false, reason: "stopped" });
      });
    };

    const onShader = (event: Event) => {
      const detail = (event as CustomEvent<CommandDetail<ShaderAction>>).detail;
      if (!detail?.target || !detail.parameter) return;
      const name = `${detail.target}.${detail.parameter}`;
      const from = readShaderTarget(detail.target, detail.parameter);
      if (from === undefined) {
        dispatchForgeLifecycle("action-cancelled", name, { kind: "shader", reason: "missing-target" });
        return;
      }
      const key = name;
      const previousFrame = shaderFrames.current.get(key);
      if (previousFrame !== undefined) {
        cancelAnimationFrame(previousFrame);
        shaderFrames.current.delete(key);
        dispatchForgeLifecycle("action-cancelled", name, { kind: "shader", reason: "replaced" });
      }
      const duration = detail.durationMs ?? 0;
      if (duration === 0 || typeof from !== typeof detail.value || typeof detail.value === "boolean") {
        const written = writeShaderTarget(detail.target, detail.parameter, detail.value);
        if (!written) dispatchForgeLifecycle("action-cancelled", name, { kind: "shader", reason: "unsupported-parameter" });
        else dispatchForgeLifecycle("shader-complete", name, { completed: true, reason: "finished" });
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const linear = Math.max(0, Math.min(1, (now - started) / Math.max(1, duration)));
        const value = interpolateShaderValue(from, detail.value, runtimeEase(linear, detail.easing as RuntimeEasing));
        const written = writeShaderTarget(detail.target, detail.parameter, value);
        if (!written) {
          shaderFrames.current.delete(key);
          dispatchForgeLifecycle("action-cancelled", name, { kind: "shader", reason: "target-lost" });
          return;
        }
        if (linear < 1) shaderFrames.current.set(key, requestAnimationFrame(tick));
        else {
          shaderFrames.current.delete(key);
          dispatchForgeLifecycle("shader-complete", name, { completed: true, reason: "finished" });
        }
      };
      shaderFrames.current.set(key, requestAnimationFrame(tick));
    };

    window.addEventListener("forge:sequence", onSequence as EventListener);
    window.addEventListener("forge:camera", onCamera as EventListener);
    window.addEventListener("forge:audio", onAudio as EventListener);
    window.addEventListener("forge:shader", onShader as EventListener);
    return () => {
      window.removeEventListener("forge:sequence", onSequence as EventListener);
      window.removeEventListener("forge:camera", onCamera as EventListener);
      window.removeEventListener("forge:audio", onAudio as EventListener);
      window.removeEventListener("forge:shader", onShader as EventListener);
      cancelSequence("unmount", false);
      cancelCamera("unmount", false);
      for (const frame of shaderFrames.current.values()) cancelAnimationFrame(frame);
      shaderFrames.current.clear();
      for (const cue of audio.current.values()) {
        if (cue.fadeFrame !== null) cancelAnimationFrame(cue.fadeFrame);
        cue.element.pause();
        cue.element.onended = null;
      }
      audio.current.clear();
      useExperienceStore.getState().resetRuntimeOverrides();
    };
  }, []);

  return null;
}

function resolveCameraDefinition(name: string, aspect: number, current: CameraState): CameraDefinition | null {
  const scene = experience.scenes.find((candidate) => candidate.id === name);
  if (scene) return aspect < 0.85 && scene.mobileCamera ? scene.mobileCamera : scene.camera;
  if ((cameraShotNames as readonly string[]).includes(name)) {
    const radius = Math.max(
      0.25,
      Math.hypot(
        current.position[0] - current.target[0],
        current.position[1] - current.target[1],
        current.position[2] - current.target[2],
      ) * 0.45,
    );
    return createCameraShot(name as CameraShotName, current.target, radius, aspect);
  }
  return null;
}

function interpolateShaderValue(from: ForgeShaderValue, to: ForgeShaderValue, progress: number): ForgeShaderValue {
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * progress;
  if (typeof from === "string" && typeof to === "string" && isHex(from) && isHex(to)) {
    const start = new Color(from);
    const end = new Color(to);
    start.lerp(end, progress);
    return `#${start.getHexString()}`;
  }
  return progress >= 1 ? to : from;
}

function isHex(value: string) {
  return /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value);
}
