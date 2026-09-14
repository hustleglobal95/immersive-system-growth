import { parseExperience } from '@/src/lib/configSchema';
import type { CameraDefinition, CameraState, ExperienceConfig, Vec3 } from '@/src/types/experience';

export type ShotPreset = 'push-in' | 'pull-back' | 'orbit-left' | 'crane-up';
export const shotPresets: { id: ShotPreset; name: string; detail: string }[] = [
  { id: 'push-in', name: 'Push in', detail: 'Move closer to the subject' },
  { id: 'pull-back', name: 'Pull back', detail: 'Reveal the surroundings' },
  { id: 'orbit-left', name: 'Orbit', detail: 'Arc around the focal point' },
  { id: 'crane-up', name: 'Rise', detail: 'Elevate the final framing' },
];
export function makeShot(camera: CameraDefinition, preset: ShotPreset): CameraDefinition {
  const from = structuredClone(camera.from), v = from.position.map((x, i) => x - from.target[i]) as Vec3;
  const distance = Math.hypot(...v);
  let end: Vec3;
  if (preset === 'orbit-left') {
    const a = -Math.PI / 5;
    end = [from.target[0] + v[0] * Math.cos(a) + v[2] * Math.sin(a), from.position[1], from.target[2] - v[0] * Math.sin(a) + v[2] * Math.cos(a)];
  } else if (preset === 'crane-up') end = [from.position[0], from.position[1] + Math.max(1, distance * .35), from.position[2]];
  else { const scale = preset === 'push-in' ? .68 : 1.5; end = v.map((n, i) => from.target[i] + n * scale) as Vec3; }
  return { path: preset === 'orbit-left' ? 'subject-orbit' : 'linear', from, to: { position: end, target: [...from.target], fov: from.fov } };
}
export function captureCamera(camera: CameraDefinition, pose: CameraState, endpoint: 'from' | 'to'): CameraDefinition {
  if (![...pose.position, ...pose.target, pose.fov].every(Number.isFinite)) throw new Error('The view is not ready to capture.');
  if (Math.hypot(...pose.position.map((n, i) => n - pose.target[i])) < .001) throw new Error('Move the view away from its target first.');
  return { ...camera, [endpoint]: { position: [...pose.position], target: [...pose.target], fov: Math.max(15, Math.min(90, pose.fov)) } };
}
export function duplicateAsset(experience: ExperienceConfig, id: string): ExperienceConfig {
  const asset = experience.assets.find(a => a.id === id);
  if (!asset) throw new Error('Select an asset first.');
  let suffix = 2; while (experience.assets.some(a => a.id === `${id}-copy-${suffix}`)) suffix++;
  return parseExperience({ ...experience, assets: [...experience.assets, { ...structuredClone(asset), id: `${id}-copy-${suffix}`, position: [asset.position[0] + 1, asset.position[1], asset.position[2]] }] });
}
export type Snapshot = { id: string; label: string; savedAt: string; experience: ExperienceConfig };
export const snapshotKey = (name: string) => `forge-studio-snapshots-v1:${name}`;
export function readSnapshots(storage: Pick<Storage, 'getItem'>, name: string): Snapshot[] {
  const raw = storage.getItem(snapshotKey(name));
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Snapshot history is unreadable. Export a recovery copy before replacing it.');
  return data.map((item: Snapshot) => {
    if (!item || typeof item.id !== 'string' || typeof item.label !== 'string' || typeof item.savedAt !== 'string') throw new Error('Snapshot history is unreadable.');
    return { ...item, experience: parseExperience(item.experience) };
  }).slice(0, 12);
}
export function writeSnapshot(storage: Pick<Storage, 'getItem' | 'setItem'>, experience: ExperienceConfig, now = new Date()): Snapshot[] {
  const valid = parseExperience(experience), history = readSnapshots(storage, valid.meta.name);
  const version = Math.max(0, ...history.map(item => Number(item.label.replace(/[^0-9]/g, '')) || 0)) + 1;
  const snapshot: Snapshot = { id: `${now.getTime()}-${version}`, label: `Version ${version}`, savedAt: now.toISOString(), experience: valid };
  const next = [snapshot, ...history].slice(0, 12);
  storage.setItem(snapshotKey(valid.meta.name), JSON.stringify(next));
  return next;
}
