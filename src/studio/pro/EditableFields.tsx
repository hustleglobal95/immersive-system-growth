'use client';

import { useLayoutEffect, useRef } from 'react';

/** Incomplete keyboard input is not a configuration value. */
export function fieldNumber(text: string, min = -Infinity, max = Infinity): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : null;
}

/** Leave the input buffer alone while typing a minus sign or decimal point.
 * External edits, undo and gizmo changes synchronize when the field is not focused. */
export function StudioNumberInput({ value, onValueChange, label, min, max, step = .05, className }: {
  value: number; onValueChange: (value: number) => void; label: string;
  min?: number; max?: number; step?: number; className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const editing = useRef(false);
  useLayoutEffect(() => { if (input.current && !editing.current) input.current.value = String(value); }, [value]);
  return <input ref={input} aria-label={label} type="number" inputMode="decimal" min={min} max={max} step={step} className={className} defaultValue={value}
    onFocus={() => { editing.current = true; }}
    onChange={event => {
      const next = fieldNumber(event.currentTarget.value);
      if (next !== null && (min === undefined || next >= min) && (max === undefined || next <= max)) onValueChange(next);
    }}
    onBlur={event => {
      editing.current = false;
      const next = fieldNumber(event.currentTarget.value, min, max) ?? value;
      event.currentTarget.value = String(next);
      if (next !== value) onValueChange(next);
    }}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}

/** Required copy can temporarily be empty during a replacement without erasing
 * the last valid scene. Blurring an empty field restores that last valid value. */
export function StudioTextInput({ value, onValueChange, label, maxLength, rows, required = false }: {
  value: string; onValueChange: (value: string) => void; label: string;
  maxLength: number; rows?: number; required?: boolean;
}) {
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const editing = useRef(false);
  useLayoutEffect(() => { if (input.current && !editing.current) input.current.value = value; }, [value]);
  const props = {
    'aria-label': label, defaultValue: value, maxLength, required,
    onFocus: () => { editing.current = true; },
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!required || event.currentTarget.value.trim()) onValueChange(event.currentTarget.value);
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      editing.current = false;
      if (required && !event.currentTarget.value.trim()) event.currentTarget.value = value;
    },
  };
  return rows
    ? <textarea {...props} rows={rows} ref={element => { input.current = element; }} />
    : <input {...props} type="text" ref={element => { input.current = element; }} />;
}
