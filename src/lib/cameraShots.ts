import type { CameraDefinition, CameraState, Vec3 } from "@/src/types/experience";
import { sampleCameraPath, sampleFov } from "./cameraPaths";
import { lerpVec3 } from "./math";

export const cameraShotNames = ["low-reveal", "hero-orbit", "detail-approach"] as const;
export type CameraShotName = typeof cameraShotNames[number];

/** Bounding-sphere fit accounts for the narrower horizontal FOV in portrait. */
export function subjectFitDistance(radius: number, fov: number, aspect: number, padding = 1.15) {
  if (![radius, fov, aspect, padding].every(Number.isFinite) || radius <= 0 || aspect <= 0 || padding < 1 || fov < 15 || fov > 90) {
    throw new RangeError("Invalid subject framing parameters");
  }
  const vertical = fov * Math.PI / 360;
  const limitingAngle = Math.min(vertical, Math.atan(Math.tan(vertical) * aspect));
  return radius * padding / Math.sin(limitingAngle);
}

export function createCameraShot(name: CameraShotName, target: Vec3, radius: number, aspect = 16 / 9): CameraDefinition {
  if (!target.every(Number.isFinite)) throw new RangeError("Camera target must be finite");
  const point = (azimuth: number, elevation: number, fov: number, distanceScale: number): CameraState => {
    const r = subjectFitDistance(radius, fov, aspect) * distanceScale;
    const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180;
    return { position: [target[0] + Math.sin(a) * Math.cos(e) * r, target[1] + Math.sin(e) * r, target[2] + Math.cos(a) * Math.cos(e) * r], target: [...target], fov };
  };
  switch (name) {
    case "low-reveal": return { path: "subject-orbit", from: point(-32, -8, 42, 1.45), to: point(22, 18, 38, 1) };
    case "hero-orbit": return { path: "subject-orbit", from: point(-42, 12, 38, 1.1), to: point(42, 18, 38, 1.1) };
    case "detail-approach": return { path: "subject-orbit", from: point(30, 15, 42, 1.55), to: point(8, 8, 30, 1) };
  }
}

/** Generated shots use no spline waypoints; this sampler is for those lab previews. */
export function sampleCameraShot(camera: CameraDefinition, progress: number): CameraState {
  const t = Math.max(0, Math.min(1, progress));
  return {
    position: sampleCameraPath(camera.from.position, camera.to.position, t, camera.path, camera.from.target, camera.to.target),
    target: lerpVec3(camera.from.target, camera.to.target, t),
    fov: sampleFov(camera.from.fov, camera.to.fov, t),
  };
}
