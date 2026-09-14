import { parseExperience } from '@/src/lib/configSchema';
import type { CameraDefinition, CameraState, ExperienceConfig, SceneDefinition, Vec3 } from '@/src/types/experience';

export function newScene(config: ExperienceConfig, index: number, duplicate = false): ExperienceConfig {
  if (config.scenes.length >= 30) throw new Error('A project supports up to 30 scenes.');
  const source = config.scenes[index];
  if (!source) throw new Error('Select a scene first.');
  const scene = structuredClone(source);
  let n = config.scenes.length + 1;
  while (config.scenes.some(s => s.id === `scene-${n}`)) n++;
  scene.id = `scene-${n}`;
  scene.label = duplicate ? `${source.label.slice(0,70)} copy` : `Scene ${n}`;
  if (!duplicate) {
    scene.camera = { path: 'dolly', from: structuredClone(source.camera.to), to: structuredClone(source.camera.to) };
    if (source.mobileCamera) scene.mobileCamera = { path: 'dolly', from: structuredClone(source.mobileCamera.to), to: structuredClone(source.mobileCamera.to) };
    scene.hero.from = structuredClone(source.hero.to); scene.hero.to = structuredClone(source.hero.to);
    scene.motionTracks = []; delete scene.media; scene.blocks = [];
    scene.copy = { eyebrow: 'NEW CHAPTER', headline: 'A new perspective.', body: 'Compose your next scene.', align: 'left' };
  }
  const split = (source.range[0] + source.range[1]) / 2;
  scene.range = [split, source.range[1]];
  const scenes = config.scenes.map((s,i) => i === index ? { ...s, range: [s.range[0],split] as [number,number] } : s);
  scenes.splice(index+1,0,scene);
  const assets = config.assets.map(a => a.scenes?.includes(source.id) ? { ...a, scenes: [...a.scenes,scene.id] } : a);
  return parseExperience({ ...config, scenes, assets });
}

export function removeScene(config: ExperienceConfig, index: number): ExperienceConfig {
  if (config.scenes.length <= 1) throw new Error('Keep at least one scene.');
  const removed = config.scenes[index];
  if (!removed) throw new Error('Scene not found.');
  const scenes = config.scenes.filter((_,i)=>i!==index).map(s => ({ ...s, range: [...s.range] as [number,number] }));
  if (index > 0) scenes[index-1].range[1] = removed.range[1]; else scenes[0].range[0] = 0;
  const assets = config.assets.flatMap(a => {
    const scenes = a.scenes?.filter(id=>id!==removed.id);
    if (scenes && !scenes.length && !a.persist) return [];
    const next = { ...a, scenes: scenes?.length ? scenes : undefined };
    if (next.kind === 'model' && next.animation?.sceneId === removed.id) delete next.animation;
    if (next.kind === 'video' && next.sceneId === removed.id) delete next.sceneId;
    return [next];
  });
  return parseExperience({ ...config, scenes, assets, hotspots: config.hotspots.filter(h=>h.sceneId!==removed.id) });
}

export const shotNames = ['Dolly in', 'Reveal arc', 'Crane rise', 'Hold frame'] as const;
export type ShotName = typeof shotNames[number];
export function shotPreset(camera: CameraDefinition, name: ShotName): CameraDefinition {
  const from = structuredClone(camera.from);
  const to = structuredClone(from);
  const direction = from.position.map((n,i)=>n-from.target[i]) as Vec3;
  const length = Math.max(.01, Math.hypot(...direction));
  const distance = Math.max(.5, Math.min(3,length*.22));
  let path: CameraDefinition['path'] = 'linear';
  if (name === 'Dolly in') { to.position=from.position.map((n,i)=>n-direction[i]/length*distance) as Vec3; path='dolly'; }
  if (name === 'Crane rise') { to.position[1]+=distance; path='crane'; }
  if (name === 'Reveal arc') { const a=.4; to.position=[from.target[0]+direction[0]*Math.cos(a)-direction[2]*Math.sin(a),from.position[1],from.target[2]+direction[0]*Math.sin(a)+direction[2]*Math.cos(a)]; path='arc'; }
  return { path, from, to };
}
export function capturePose(camera: CameraDefinition, endpoint: 'from'|'to', pose: CameraState): CameraDefinition {
  if (![...pose.position,...pose.target,pose.fov].every(Number.isFinite) || Math.hypot(...pose.position.map((n,i)=>n-pose.target[i])) < .001) throw new Error('Move the camera away from its target before capturing.');
  return { ...camera, [endpoint]: { position: [...pose.position], target: [...pose.target], fov: Math.min(90,Math.max(15,pose.fov)) } };
}
export function cloneAsset(config: ExperienceConfig, id: string): ExperienceConfig {
  const asset=config.assets.find(a=>a.id===id); if(!asset) throw new Error('Select an asset.');
  let suffix=2; while(config.assets.some(a=>a.id===`${id}-${suffix}`)) suffix++;
  const clone=structuredClone(asset); clone.id=`${id}-${suffix}`; clone.position[0]+=.5;
  return parseExperience({...config,assets:[...config.assets,clone]});
}
export function cameraTrackWarning(scene: SceneDefinition, mobile: boolean) {
  return scene.motionTracks.some(t => !t.muted && t.target.startsWith('camera.') && (t.viewport==='all'||t.viewport===(mobile?'mobile':'desktop')));
}
export interface Snapshot { id: string; name: string; created: string; experience: ExperienceConfig }
export function readSnapshots(storage: Pick<Storage,'getItem'>, key: string): Snapshot[] {
  const raw=storage.getItem(key); if(!raw) return [];
  const parsed: unknown = JSON.parse(raw); if(!Array.isArray(parsed)) throw new Error('Snapshot history is unreadable.');
  return parsed.map((s: Snapshot)=>({id:String(s.id),name:String(s.name),created:String(s.created),experience:parseExperience(s.experience)}));
}
export function writeSnapshot(storage: Pick<Storage,'getItem'|'setItem'>, key: string, experience: ExperienceConfig, name: string, created = new Date().toISOString()): Snapshot[] {
  const snapshot = { id: created, name: name.trim() || 'Untitled version', created, experience: parseExperience(experience) };
  const history = [snapshot,...readSnapshots(storage,key)].slice(0,8);
  storage.setItem(key,JSON.stringify(history)); return history;
}
