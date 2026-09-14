'use client';
import { useState } from 'react';
import { StudioDialog, StudioIcon, type IconName } from './StudioControls';
export type StudioCommand = { id: string; label: string; detail: string; icon: IconName; shortcut?: string; run: () => void; disabled?: boolean };
export function StudioCommandMenu({ commands, onClose }: { commands: StudioCommand[]; onClose: () => void }) {
  const [query, setQuery] = useState(''), [active, setActive] = useState(0);
  const results = commands.filter(c => !c.disabled && `${c.label} ${c.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  const run = (command: StudioCommand) => { onClose(); command.run(); };
  return <StudioDialog title="What would you like to do?" onClose={onClose}>
    <div className="pro-command-search"><StudioIcon name="search"/><input autoFocus aria-label="Search commands" placeholder="Search scenes, tools, and actions..." value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setActive(n => Math.min(results.length - 1, n + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive(n => Math.max(0, n - 1)); } if (e.key === 'Enter' && results[active]) { e.preventDefault(); run(results[active]); } }}/><kbd>ESC</kbd></div>
    <div className="pro-command-results">{results.map((c, i) => <button key={c.id} type="button" data-highlight={active === i} onMouseEnter={() => setActive(i)} onClick={() => run(c)}><StudioIcon name={c.icon}/><span><strong>{c.label}</strong><small>{c.detail}</small></span>{c.shortcut && <kbd>{c.shortcut}</kbd>}</button>)}{!results.length && <p>No actions match that search.</p>}</div>
  </StudioDialog>;
}
