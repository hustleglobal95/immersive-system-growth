import type { IntakeRequirement } from './assetIntakeCatalog';

export type IntakeStatus = 'missing' | 'received' | 'prep' | 'ready' | 'approved' | 'rights';

export interface IntakeFileRecord {
  id: string;
  name: string;
  bytes: number;
  type: string;
  extension: string;
  uploadedAt: string;
  url?: string;
  sha256?: string;
  width?: number;
  height?: number;
  duration?: number;
  notes?: string[];
}

export interface IntakeItemState {
  status: IntakeStatus;
  notes: string;
  files: IntakeFileRecord[];
}

export interface IntakeDraft {
  profileId: string;
  ambitionId: string;
  moduleIds: string[];
  referenceUrl: string;
  projectName: string;
  items: Record<string, IntakeItemState>;
}

export const statusLabels: Record<IntakeStatus, string> = {
  missing: 'Missing', received: 'Received', prep: 'Needs preparation', ready: 'Ready', approved: 'Approved', rights: 'Rights cleared',
};

const statusScore: Record<IntakeStatus, number> = { missing: 0, received: .35, prep: .52, ready: .78, approved: .92, rights: 1 };
const tierWeight = { required: 3, recommended: 1.6, premium: .8 } as const;

export function createItemState(): IntakeItemState { return { status: 'missing', notes: '', files: [] }; }

export function readiness(requirements: IntakeRequirement[], items: Record<string, IntakeItemState>) {
  let score = 0, total = 0, requiredReady = 0, requiredTotal = 0;
  const blockers: IntakeRequirement[] = [];
  const preparation: IntakeRequirement[] = [];
  for (const requirement of requirements) {
    const weight = tierWeight[requirement.tier];
    const state = items[requirement.id] ?? createItemState();
    score += statusScore[state.status] * weight;
    total += weight;
    if (requirement.tier === 'required') {
      requiredTotal += 1;
      if (['ready','approved','rights'].includes(state.status)) requiredReady += 1;
      else blockers.push(requirement);
    }
    if (state.status === 'prep') preparation.push(requirement);
  }
  const percent = total ? Math.round(score / total * 100) : 0;
  const requiredPercent = requiredTotal ? Math.round(requiredReady / requiredTotal * 100) : 0;
  return { percent, requiredPercent, blockers, preparation, level: readinessLevel(percent, blockers.length) };
}

export function readinessLevel(percent: number, blockers: number) {
  if (percent < 20) return { id:0, label:'Discovery', copy:'We understand the target, but there is not enough source material to predict finish.' };
  if (percent < 40) return { id:1, label:'Brand ready', copy:'Enough brand material exists to begin visual direction and information architecture.' };
  if (percent < 60) return { id:2, label:'Design ready', copy:'Enough material exists for premium static design and composition work.' };
  if (percent < 75) return { id:3, label:'Cinematic ready', copy:'Photography, video and narrative coverage are sufficient for motion-led production.' };
  if (percent < 90 || blockers > 0) return { id:4, label:'Immersive ready', copy:'Most interactive/3D/data inputs are available, but blockers remain before production confidence is complete.' };
  return { id:5, label:'Production ready', copy:'All known required source material exists to pursue the approved creative direction without an asset blocker.' };
}

export function outcomeForecast(requirements: IntakeRequirement[], items: Record<string, IntakeItemState>) {
  const readyUnlocks = new Set<string>();
  const blockedUnlocks = new Set<string>();
  for (const req of requirements) {
    const state = items[req.id] ?? createItemState();
    const ready = ['ready','approved','rights'].includes(state.status);
    for (const value of req.unlocks) (ready ? readyUnlocks : blockedUnlocks).add(value);
  }
  return { ready: [...readyUnlocks], blocked: [...blockedUnlocks].filter((value) => !readyUnlocks.has(value)) };
}

export function buildClientRequestPack(projectName: string, profileLabel: string, referenceUrl: string, requirements: IntakeRequirement[], items: Record<string, IntakeItemState>) {
  const missing = requirements.filter((req) => (items[req.id]?.status ?? 'missing') === 'missing');
  const prep = requirements.filter((req) => items[req.id]?.status === 'prep');
  const lines = [
    `# ${projectName || 'Client project'} — production asset request`, '',
    `Target profile: ${profileLabel}`,
    referenceUrl ? `Reference / benchmark: ${referenceUrl}` : '', '',
    'This request separates source-material readiness from creative execution. Supplying an item does not guarantee final reference quality; it removes a known production blocker.', '',
  ].filter(Boolean);
  for (const [title, list] of [['Required / missing', missing.filter(r => r.tier === 'required')], ['Recommended / missing', missing.filter(r => r.tier === 'recommended')], ['Premium / missing', missing.filter(r => r.tier === 'premium')], ['Received but needs preparation', prep]] as const) {
    if (!list.length) continue;
    lines.push(`## ${title}`, '');
    for (const req of list) {
      lines.push(`### ${req.label}`, req.description, `Preferred: ${req.preferred ?? req.accept.join(', ')}`, req.minimum ? `Minimum: ${req.minimum}` : '', `Used for: ${req.unlocks.join(', ')}`, '');
    }
  }
  lines.push('## Delivery notes', '', '- Send original/source files whenever possible, not screenshots or files re-downloaded from the current website.', '- Keep file names meaningful and preserve source hierarchy.', '- Include written usage rights for licensed media, fonts, audio and third-party work.', '- Credentials and API secrets should be delivered through an approved secure channel, never embedded in this checklist.', '');
  return lines.filter((line, index, array) => !(line === '' && array[index - 1] === '')).join('\n');
}

export function extensionOf(name: string) { const dot = name.lastIndexOf('.'); return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''; }

export async function inspectBrowserFile(file: File): Promise<Pick<IntakeFileRecord,'width'|'height'|'duration'|'notes'>> {
  const notes: string[] = [];
  const extension = extensionOf(file.name);
  let width: number | undefined, height: number | undefined, duration: number | undefined;
  if (file.type.startsWith('image/')) {
    try { const bitmap = await createImageBitmap(file); width = bitmap.width; height = bitmap.height; bitmap.close(); if (Math.max(width,height) < 2500) notes.push('Below 2500 px long edge; review before hero use.'); } catch { notes.push('Image dimensions could not be inspected in this browser.'); }
  } else if (file.type.startsWith('video/')) {
    try {
      const url = URL.createObjectURL(file); const video = document.createElement('video'); video.preload = 'metadata'; video.src = url;
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('video metadata')); });
      width = video.videoWidth; height = video.videoHeight; duration = video.duration; URL.revokeObjectURL(url);
      if (Math.max(width,height) < 1920) notes.push('Below 1080p; not recommended for primary full-bleed motion.');
    } catch { notes.push('Video metadata could not be inspected in this browser.'); }
  } else if (extension === 'json') {
    try { JSON.parse(await file.text()); } catch { notes.push('JSON is not valid.'); }
  } else if (extension === 'glb') {
    try {
      const head = new DataView(await file.slice(0, 12).arrayBuffer());
      if (head.getUint32(0, true) !== 0x46546c67 || head.getUint32(4, true) !== 2) notes.push('GLB header/version is not valid glTF 2.0.');
    } catch { notes.push('GLB header could not be inspected.'); }
  }
  return { width, height, duration, notes };
}
