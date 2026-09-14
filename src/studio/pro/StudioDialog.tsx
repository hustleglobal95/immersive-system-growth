'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { StudioIcon } from './StudioIcon';
export function StudioDialog({ open, title, children, onClose, wide = false }: { open: boolean; title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return <dialog ref={ref} className={`pro-dialog${wide ? ' pro-dialog--wide' : ''}`} aria-label={title} onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) { const b=e.currentTarget.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) onClose(); } }}><header><div><span>FORGE STUDIO</span><h2>{title}</h2></div><button type="button" className="pro-icon-button" aria-label="Close dialog" onClick={onClose}><StudioIcon name="close" /></button></header>{children}</dialog>;
}
