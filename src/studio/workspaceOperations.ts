import type { CameraDefinition, ExperienceConfig, SceneDefinition, Vec3 } from '@/src/types/experience';

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
export function sceneAt(experience: ExperienceConfig, progress: number) {
  const p = clamp(progress, 0, 1);
  return Math.max(0, experience.scenes.findIndex((s, i) => p >= s.range[0] && (p < s.range[1] || i === experience.scenes.length - 1)));
}
export function cameraPoints(camera: CameraDefinition, target = false): Vec3[] {
  return target ? [camera.from.target, ...(camera.targetWaypoints ?? []), camera.to.target] : [camera.from.position, ...(camera.waypoints ?? []), camera.to.position];
}
export function changeCameraPoint(camera: CameraDefinition, index: number, value: Vec3, target = false): CameraDefinition {
  const points = cameraPoints(camera, target);
  if (!Number.isInteger(index) || index < 0 || index >= points.length || !value.every(Number.isFinite)) return camera;
  const property = target ? 'target' : 'position';
  if (index === 0) return { ...camera, from: { ...camera.from, [property]: [...value] } };
  if (index === points.length - 1) return { ...camera, to: { ...camera.to, [property]: [...value] } };
  const waypoints = points.slice(1, -1).map((p, i) => i === index - 1 ? [...value] as Vec3 : p);
  return { ...camera, [target ? 'targetWaypoints' : 'waypoints']: waypoints };
}
export function insertWaypoint(camera: CameraDefinition, after: number, target = false): CameraDefinition {
  const points = cameraPoints(camera, target);
  if (points.length >= 34) return camera;
  const i = Math.round(clamp(after, 0, points.length - 2));
  const value = points[i].map((n, axis) => (n + points[i + 1][axis]) / 2) as Vec3;
  const middle = points.slice(1, -1);
  middle.splice(i, 0, value);
  return { ...camera, [target ? 'targetWaypoints' : 'waypoints']: middle };
}
export function removeWaypoint(camera: CameraDefinition, index: number, target = false): CameraDefinition {
  const points = cameraPoints(camera, target);
  if (index <= 0 || index >= points.length - 1) return camera;
  return { ...camera, [target ? 'targetWaypoints' : 'waypoints']: points.slice(1, -1).filter((_, i) => i !== index - 1) };
}
export function moveBoundary(experience: ExperienceConfig, index: number, value: number): ExperienceConfig {
  const left = experience.scenes[index], right = experience.scenes[index + 1];
  if (!left || !right || !Number.isFinite(value)) return experience;
  const min = left.range[0] + .005, max = right.range[1] - .005;
  if (min > max) return experience;
  const boundary = clamp(value, min, max);
  return { ...experience, scenes: experience.scenes.map((s, i) => i === index ? { ...s, range: [s.range[0], boundary] } : i === index + 1 ? { ...s, range: [boundary, s.range[1]] } : s) };
}
export function addModel(experience: ExperienceConfig, sceneIndex: number, url: string, position: Vec3): ExperienceConfig {
  if (!/^(?:\/(?!\/)[^\s?#]*\.glb|https:\/\/[^\s]+\.glb(?:[?#][^\s]*)?)$/i.test(url)) throw new Error('Use a hosted .glb HTTPS URL or a /models/...glb project path. Local files must be uploaded first.');
  if (!experience.scenes[sceneIndex] || !position.every(Number.isFinite)) throw new Error('Select a valid scene and position.');
  const base = (url.split(/[?#]/)[0].split('/').pop() ?? 'model').replace(/\.glb$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'model';
  let id = base, count = 2;
  while (experience.assets.some(a => a.id === id)) id = `${base}-${count++}`;
  return { ...experience, assets: [...experience.assets, { id, kind: 'model', url, position: [...position], rotation: [0, 0, 0], scale: 1, scenes: [experience.scenes[sceneIndex].id], persist: false }] };
}
export const lightPresets = {
  'Golden hour': { ambient: .4, key: 3.2, rim: 4, keyColor: '#ffe0aa', rimColor: '#dc9860', exposure: 1.05 },
  'Cool gallery': { ambient: .35, key: 2, rim: 3, keyColor: '#d6e5ff', rimColor: '#8db5d8', exposure: 1 },
  'Soft studio': { ambient: .7, key: 2.4, rim: 2, keyColor: '#fff6e5', rimColor: '#ffffff', exposure: 1 },
} satisfies Record<string, Partial<SceneDefinition['world']>>;
