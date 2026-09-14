'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export type IconName = 'camera' | 'cube' | 'sun' | 'layers' | 'play' | 'pause' | 'plus' | 'close' | 'search' | 'save' | 'export' | 'undo' | 'redo' | 'expand' | 'chevron' | 'check' | 'help' | 'target' | 'upload' | 'film' | 'desktop' | 'mobile' | 'tablet' | 'copy' | 'settings';
const paths: Record<IconName, ReactNode> = {
  camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></>,
  cube: <><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  layers: <><path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/></>,
  play: <path d="m8 4 12 8-12 8z"/>, pause: <path d="M8 5v14M16 5v14"/>,
  plus: <path d="M12 5v14M5 12h14"/>, close: <path d="m6 6 12 12M6 18 18 6"/>,
  search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
  save: <><path d="M4 3h14l3 3v15H3V3zM7 3v6h10V3M7 21v-8h10v8"/></>,
  export: <><path d="M12 16V2m-5 5 5-5 5 5M4 13v8h16v-8"/></>,
  upload: <><path d="M12 17V5m-5 5 5-5 5 5M4 17v4h16v-4"/></>,
  undo: <path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 6 6v3"/>,
  redo: <path d="m16 5 5 5-5 5M21 10H10a6 6 0 0 0-6 6v3"/>,
  expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
  chevron: <path d="m6 9 6 6 6-6"/>, check: <path d="m4 12 5 5L20 6"/>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 4m0 3v.5"/></>,
  target: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m10 0h4M3 16h4m10 0h4"/></>,
  desktop: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/></>,
  mobile: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></>,
  tablet: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M10 18h4"/></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 4H4v12"/></>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/></>,
};
export function StudioIcon({ name, size = 16 }: { name: IconName; size?: number }) {
  return <svg className="studio-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

/** Native modal supplies focus containment and inert background, including Escape. */
export function StudioDialog({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current, prior = document.activeElement as HTMLElement | null;
    if (!dialog) return;
    dialog.showModal();
    return () => { dialog.close(); prior?.focus(); };
  }, []);
  return <dialog ref={ref} className={`studio-dialog${wide ? ' studio-dialog--wide' : ''}`} aria-labelledby={id} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(item => item.getClientRects().length > 0);
    const first = items[0], last = items.at(-1);
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || !e.currentTarget.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !e.currentTarget.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }} onCancel={e => { e.preventDefault(); closeRef.current(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeRef.current(); } }}>
    <header><div><span className="pro-eyebrow">FORGE STUDIO</span><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="pro-icon-button" aria-label="Close dialog" onClick={onClose}><StudioIcon name="close"/></button></header>{children}
  </dialog>;
}

/** Commit a complete value on blur/Enter; incomplete numeric typing never mutates a scene. */
export function StudioNumber({ label, value, onChange, min = -10000, max = 10000, step = .05 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  const [draft, setDraft] = useState(String(value)), [editing, setEditing] = useState(false);
  const shown = editing ? draft : String(Math.round(value * 10000) / 10000);
  const commit = () => { const n = Number(draft); if (draft.trim() && Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); setEditing(false); };
  return <input aria-label={label} type="number" step={step} min={min} max={max} value={shown} onFocus={() => { setDraft(String(value)); setEditing(true); }} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); } }} />;
}
export function StudioText({ label, value, onChange, maxLength = 120, multiline = false }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; multiline?: boolean }) {
  const [draft, setDraft] = useState(value), [editing, setEditing] = useState(false);
  const props = { 'aria-label': label, value: editing ? draft : value, maxLength, onFocus: () => { setDraft(value); setEditing(true); }, onChange: (e: { target: { value: string } }) => setDraft(e.target.value), onBlur: () => { if (draft.trim()) onChange(draft.trim()); setEditing(false); } };
  return <label className="pro-text-field"><span>{label}</span>{multiline ? <textarea {...props} rows={3}/> : <input {...props} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}/>}</label>;
}
export function isTextEntry(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}
