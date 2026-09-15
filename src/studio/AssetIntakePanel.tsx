'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { StudioIcon } from './ui/StudioControls';
import { ambitionLevels, intakeModules, intakeProfiles, requirementsFor, type IntakeRequirement } from './assetIntakeCatalog';
import { buildClientRequestPack, createItemState, extensionOf, inspectBrowserFile, outcomeForecast, readiness, statusLabels, type IntakeDraft, type IntakeFileRecord, type IntakeItemState, type IntakeStatus } from './assetReadiness';

const STORAGE = 'forge-client-intake-v1';
const statuses = Object.keys(statusLabels) as IntakeStatus[];

function initialDraft(projectName: string): IntakeDraft {
  return { profileId: 'architecture-real-estate', ambitionId: 'immersive', moduleIds: ['module-3d','module-motion','module-accessibility'], referenceUrl: '', projectName, items: {} };
}

export function AssetIntakePanel({ defaultProjectName = 'Client project' }: { defaultProjectName?: string }) {
  const [draft, setDraft] = useState<IntakeDraft>(() => initialDraft(defaultProjectName));
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<'all'|'required'|'recommended'|'premium'>('all');
  const [statusFilter, setStatusFilter] = useState<'all'|IntakeStatus>('all');
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<IntakeDraft>;
        setDraft({ ...initialDraft(defaultProjectName), ...parsed, items: parsed.items ?? {} });
      }
    } catch { localStorage.removeItem(STORAGE); }
    setLoaded(true);
  }, [defaultProjectName]);
  useEffect(() => { if (loaded) localStorage.setItem(STORAGE, JSON.stringify(draft)); }, [draft, loaded]);

  const profile = intakeProfiles.find((entry) => entry.id === draft.profileId) ?? intakeProfiles[0];
  const requirements = useMemo(() => requirementsFor(draft.profileId, draft.moduleIds, draft.ambitionId), [draft.profileId, draft.moduleIds, draft.ambitionId]);
  const report = useMemo(() => readiness(requirements, draft.items), [requirements, draft.items]);
  const forecast = useMemo(() => outcomeForecast(requirements, draft.items), [requirements, draft.items]);
  const groups = useMemo(() => [...new Set(requirements.map((entry) => entry.group))], [requirements]);
  const visible = requirements.filter((entry) => {
    const state = draft.items[entry.id] ?? createItemState();
    const haystack = `${entry.group} ${entry.label} ${entry.description} ${entry.unlocks.join(' ')}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (tier === 'all' || entry.tier === tier) && (statusFilter === 'all' || state.status === statusFilter);
  });
  const fileCount = Object.values(draft.items).reduce((count, state) => count + state.files.length, 0);

  const setItem = (id: string, update: (state: IntakeItemState) => IntakeItemState) => setDraft((current) => ({ ...current, items: { ...current.items, [id]: update(current.items[id] ?? createItemState()) } }));
  const toggleModule = (id: string) => setDraft((current) => ({ ...current, moduleIds: current.moduleIds.includes(id) ? current.moduleIds.filter((value) => value !== id) : [...current.moduleIds, id] }));

  const upload = async (requirement: IntakeRequirement, files: FileList | null) => {
    if (!files?.length) return;
    setUploading(requirement.id); setNotice(`Inspecting ${files.length} file${files.length === 1 ? '' : 's'}…`);
    const records: IntakeFileRecord[] = [];
    try {
      for (const file of [...files]) {
        const extension = extensionOf(file.name);
        const accepted = requirement.accept.includes(extension);
        const inspection = await inspectBrowserFile(file);
        if (!accepted) inspection.notes?.push(`.${extension || 'unknown'} is outside the preferred formats for this requirement.`);
        let storedPath: string | undefined, sha256: string | undefined;
        try {
          const response = await fetch('/api/studio/intake', {
            method: 'POST', body: file,
            headers: {
              'content-type': file.type || 'application/octet-stream',
              'x-forge-studio': 'client-intake',
              'x-forge-intake-project': draft.projectName,
              'x-forge-intake-item': requirement.id,
              'x-forge-intake-file': encodeURIComponent(file.name),
            },
          });
          const body = await response.json() as { storedPath?: string; sha256?: string; error?: string };
          if (!response.ok) inspection.notes?.push(body.error ?? 'Local vault did not store this file.');
          else { storedPath = body.storedPath; sha256 = body.sha256; }
        } catch { inspection.notes?.push('Local vault unavailable; file metadata was recorded in this browser only.'); }
        records.push({ id: crypto.randomUUID(), name: file.name, bytes: file.size, type: file.type, extension, uploadedAt: new Date().toISOString(), url: storedPath, sha256, ...inspection });
      }
      setItem(requirement.id, (state) => ({ ...state, status: records.some((file) => file.notes?.length) ? 'prep' : state.status === 'missing' ? 'received' : state.status, files: [...state.files, ...records] }));
      setNotice(`${records.length} file${records.length === 1 ? '' : 's'} registered for ${requirement.label}.`);
    } finally { setUploading(null); if (fileInputs.current[requirement.id]) fileInputs.current[requirement.id]!.value = ''; }
  };

  const download = (name: string, text: string, type = 'text/plain') => {
    const url = URL.createObjectURL(new Blob([text], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const exportRequest = () => download(`${slug(draft.projectName)}-asset-request.md`, buildClientRequestPack(draft.projectName, profile.label, draft.referenceUrl, requirements, draft.items), 'text/markdown');
  const exportManifest = () => download(`${slug(draft.projectName)}-intake-manifest.json`, JSON.stringify({ generatedAt: new Date().toISOString(), profile: profile.id, ambition: draft.ambitionId, modules: draft.moduleIds, referenceUrl: draft.referenceUrl, readiness: report, requirements, items: draft.items }, null, 2), 'application/json');

  return <div className="intake-shell">
    <header className="intake-hero">
      <div><span className="pro-eyebrow">CLIENT ASSET INTAKE / PRODUCTION READINESS</span><h1>Know what the experience can become <em>before</em> production starts.</h1><p>Choose the site archetype and ambition. Forge generates the source-material request, stores client originals locally, exposes blockers, and forecasts which experience systems the current asset set can actually support.</p></div>
      <div className="intake-score" data-level={report.level.id}><div className="intake-score__ring" style={{ '--score': `${report.percent * 3.6}deg` } as React.CSSProperties}><strong>{report.percent}<small>%</small></strong></div><div><span>PROJECT READINESS</span><strong>{report.level.label}</strong><p>{report.level.copy}</p></div></div>
    </header>

    <section className="intake-config">
      <label><span>Project</span><input value={draft.projectName} onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))}/></label>
      <label className="intake-config__reference"><span>Reference / benchmark</span><input type="url" placeholder="https://likova.space/" value={draft.referenceUrl} onChange={(event) => setDraft((current) => ({ ...current, referenceUrl: event.target.value }))}/></label>
      <label><span>Website archetype</span><select value={draft.profileId} onChange={(event) => setDraft((current) => ({ ...current, profileId: event.target.value }))}>{intakeProfiles.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
      <div className="intake-ambition"><span>Experience level</span><div>{ambitionLevels.map((entry) => <button key={entry.id} type="button" aria-pressed={draft.ambitionId === entry.id} onClick={() => setDraft((current) => ({ ...current, ambitionId: entry.id }))}><strong>{entry.label}</strong><small>{entry.description}</small></button>)}</div></div>
    </section>

    <section className="intake-modules">
      <div className="intake-section-head"><div><span className="pro-eyebrow">CAPABILITY MODULES</span><h2>Add what the reference actually requires</h2></div><p>Modules layer extra requirements onto the selected industry checklist.</p></div>
      <div className="intake-module-grid">{intakeModules.map((module) => { const selected = draft.moduleIds.includes(module.id); return <button type="button" key={module.id} aria-pressed={selected} onClick={() => toggleModule(module.id)}><span className="intake-module-check">{selected ? <StudioIcon name="check" size={13}/> : <i/>}</span><div><strong>{module.label}</strong><small>{module.short}</small></div></button>; })}</div>
    </section>

    <section className="intake-dashboard">
      <aside className="intake-summary">
        <div className="intake-summary__title"><span className="pro-eyebrow">READINESS</span><h2>{profile.label}</h2><p>{profile.outcome}</p></div>
        <div className="intake-metrics"><div><span>Overall</span><strong>{report.percent}%</strong></div><div><span>Required ready</span><strong>{report.requiredPercent}%</strong></div><div><span>Blockers</span><strong>{report.blockers.length}</strong></div><div><span>Files registered</span><strong>{fileCount}</strong></div></div>
        <div className="intake-progress"><i style={{ width: `${report.percent}%` }}/></div>
        <div className="intake-summary__block"><span>Outcome currently unlocked</span>{forecast.ready.length ? <ul>{forecast.ready.slice(0,8).map((value) => <li key={value}><StudioIcon name="check" size={11}/>{value}</li>)}</ul> : <p>No production capability is fully cleared yet.</p>}</div>
        <div className="intake-summary__block intake-summary__block--risk"><span>Blocked / at risk</span>{report.blockers.length ? <ul>{report.blockers.slice(0,8).map((value) => <li key={value.id}>{value.label}</li>)}</ul> : <p>No required asset blockers.</p>}</div>
        <div className="intake-actions"><button className="studio-primary" type="button" onClick={exportRequest}><StudioIcon name="export"/>Client request pack</button><button type="button" onClick={exportManifest}><StudioIcon name="save"/>Intake manifest</button></div>
        <p className="intake-disclaimer">100% means the known required source material exists. It does not promise a copied reference or substitute for art direction, asset preparation, engineering, QA or rights review.</p>
      </aside>

      <div className="intake-main">
        <div className="intake-toolbar">
          <label className="intake-search"><StudioIcon name="search" size={14}/><input aria-label="Search asset checklist" placeholder="Search assets, outcomes, formats…" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
          <select aria-label="Filter by tier" value={tier} onChange={(event) => setTier(event.target.value as typeof tier)}><option value="all">All priorities</option><option value="required">Required</option><option value="recommended">Recommended</option><option value="premium">Premium</option></select>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All statuses</option>{statuses.map((value) => <option value={value} key={value}>{statusLabels[value]}</option>)}</select>
          <output>{visible.length} / {requirements.length} requirements</output>
        </div>
        {notice && <p className="intake-notice" role="status">{notice}</p>}
        <div className="intake-groups">{groups.map((group) => { const entries = visible.filter((entry) => entry.group === group); if (!entries.length) return null; const groupReady = readiness(entries, draft.items); return <section className="intake-group" key={group}><header><div><span>{group}</span><strong>{entries.length} requirements</strong></div><div><i><b style={{ width: `${groupReady.percent}%` }}/></i><output>{groupReady.percent}%</output></div></header><div>{entries.map((requirement) => <RequirementCard key={requirement.id} requirement={requirement} state={draft.items[requirement.id] ?? createItemState()} uploading={uploading === requirement.id} inputRef={(node) => { fileInputs.current[requirement.id] = node; }} onUpload={(files) => void upload(requirement, files)} onStatus={(status) => setItem(requirement.id, (state) => ({ ...state, status }))} onNotes={(notes) => setItem(requirement.id, (state) => ({ ...state, notes }))} onRemove={(id) => setItem(requirement.id, (state) => ({ ...state, files: state.files.filter((file) => file.id !== id), status: state.files.length <= 1 ? 'missing' : state.status }))}/> )}</div></section>; })}</div>
      </div>
    </section>
  </div>;
}

function RequirementCard({ requirement, state, uploading, inputRef, onUpload, onStatus, onNotes, onRemove }: { requirement: IntakeRequirement; state: IntakeItemState; uploading: boolean; inputRef: (node: HTMLInputElement | null) => void; onUpload: (files: FileList | null) => void; onStatus: (status: IntakeStatus) => void; onNotes: (notes: string) => void; onRemove: (id: string) => void }) {
  const accept = requirement.accept.map((extension) => `.${extension}`).join(',');
  return <article className="intake-item" data-status={state.status}>
    <div className="intake-item__status"><i/><span>{requirement.tier}</span></div>
    <div className="intake-item__body"><div className="intake-item__heading"><div><strong>{requirement.label}</strong><p>{requirement.description}</p></div><select aria-label={`${requirement.label} status`} value={state.status} onChange={(event) => onStatus(event.target.value as IntakeStatus)}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></div>
      <div className="intake-item__spec"><span><b>Preferred</b>{requirement.preferred ?? requirement.accept.join(' · ')}</span>{requirement.minimum && <span><b>Minimum</b>{requirement.minimum}</span>}<span><b>Unlocks</b>{requirement.unlocks.join(' · ')}</span></div>
      {!!state.files.length && <div className="intake-files">{state.files.map((file) => <div key={file.id} data-risk={Boolean(file.notes?.length)}><StudioIcon name={file.type.startsWith('video') ? 'film' : file.extension === 'glb' || ['fbx','obj','step','stp','rvt','3dm'].includes(file.extension) ? 'cube' : 'layers'} size={14}/><div><strong>{file.name}</strong><small>{formatBytes(file.bytes)}{file.width ? ` · ${file.width}×${file.height}` : ''}{file.duration ? ` · ${Math.round(file.duration)}s` : ''}{file.url ? ` · stored locally` : ' · browser record only'}</small>{file.notes?.map((note) => <em key={note}>{note}</em>)}</div><button type="button" aria-label={`Remove ${file.name}`} onClick={() => onRemove(file.id)}><StudioIcon name="close" size={12}/></button></div>)}</div>}
      <div className="intake-item__actions"><input ref={inputRef} hidden multiple type="file" accept={accept} onChange={(event) => onUpload(event.target.files)}/><button type="button" disabled={uploading} onClick={(event) => (event.currentTarget.previousElementSibling as HTMLInputElement)?.click()}><StudioIcon name="upload"/>{uploading ? 'Storing…' : 'Add source files'}</button><input className="intake-note" aria-label={`${requirement.label} notes`} placeholder="Internal note / what to ask client…" value={state.notes} onChange={(event) => onNotes(event.target.value)}/></div>
    </div>
  </article>;
}

function slug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'client-project'; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 ** 2) return `${(bytes/1024).toFixed(1)} KB`; if (bytes < 1024 ** 3) return `${(bytes/1024**2).toFixed(1)} MB`; return `${(bytes/1024**3).toFixed(2)} GB`; }
