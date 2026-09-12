import type { RuntimeEasing } from "@/src/lib/interactionGraph";
import { sampleCameraPath, sampleFov } from "@/src/lib/cameraPaths";
import { lerp, lerpVec3 } from "@/src/lib/math";
import { sampleSplineArcLength } from "@/src/lib/spline";
import type { CameraDefinition, CameraState } from "@/src/types/experience";

export function runtimeEase(progress: number, easing: RuntimeEasing = "smooth") {
  const p = clamp01(progress);
  if (easing === "linear") return p;
  if (easing === "ease-in") return p * p * p;
  if (easing === "ease-out") return 1 - Math.pow(1 - p, 3);
  if (easing === "ease-in-out") return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  return p * p * (3 - 2 * p);
}

export function sampleCameraDefinition(camera: CameraDefinition, progress: number): CameraState {
  const p = clamp01(progress);
  const position = camera.waypoints?.length
    ? sampleSplineArcLength([camera.from.position, ...camera.waypoints, camera.to.position], p)
    : sampleCameraPath(
        camera.from.position,
        camera.to.position,
        p,
        camera.path,
        camera.from.target,
        camera.to.target,
      );
  const target = camera.targetWaypoints?.length
    ? sampleSplineArcLength([camera.from.target, ...camera.targetWaypoints, camera.to.target], p)
    : lerpVec3(camera.from.target, camera.to.target, p);
  return {
    position,
    target,
    fov: sampleFov(camera.from.fov, camera.to.fov, p),
  };
}

export function sampleCameraTransition(
  current: CameraState,
  camera: CameraDefinition,
  progress: number,
  blendPortion = 0.18,
): CameraState {
  const p = clamp01(progress);
  const blend = Math.max(0, Math.min(0.45, blendPortion));
  if (blend > 0 && p < blend) {
    return lerpCameraState(current, camera.from, runtimeEase(p / blend));
  }
  const authored = blend >= 1 ? 1 : (p - blend) / Math.max(0.000001, 1 - blend);
  return sampleCameraDefinition(camera, authored);
}

export function lerpCameraState(from: CameraState, to: CameraState, progress: number): CameraState {
  const p = clamp01(progress);
  return {
    position: lerpVec3(from.position, to.position, p),
    target: lerpVec3(from.target, to.target, p),
    fov: lerp(from.fov, to.fov, p),
  };
}

export function defaultSequenceDuration(range: [number, number]) {
  const span = Math.max(0.001, range[1] - range[0]);
  return Math.round(Math.max(1200, Math.min(8000, span * 12000)));
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
