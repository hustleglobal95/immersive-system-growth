'use client';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Vec3 } from '@/src/types/experience';

type Bounds = { minA: number; minB: number; span: number };
function boundsFor(points: Vec3[], a: number, b: number): Bounds {
  const as = points.map(p => p[a]), bs = points.map(p => p[b]);
  const minA = Math.min(...as), maxA = Math.max(...as), minB = Math.min(...bs), maxB = Math.max(...bs);
  const span = Math.max(4, maxA - minA, maxB - minB) * 1.25;
  return { minA: (minA + maxA - span) / 2, minB: (minB + maxB - span) / 2, span };
}
export function CameraPathEditor({ points, selected, onSelect, onChange, onBegin, onEnd }: {
  points: Vec3[]; selected: number; onSelect: (index: number) => void;
  onChange: (index: number, value: Vec3) => void; onBegin: () => void; onEnd: () => void;
}) {
  const drag = useRef<{ index: number; a: number; b: number; bounds: Bounds; point: Vec3 } | null>(null);
  const [frozen, setFrozen] = useState<{ a: number; b: number; bounds: Bounds } | null>(null);
  const stop = () => { if (drag.current) { drag.current = null; setFrozen(null); onEnd(); } };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current; if (!d) return;
    const matrix = event.currentTarget.getScreenCTM(); if (!matrix) return;
    const xy = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const next: Vec3 = [...d.point];
    next[d.a] = Math.round((d.bounds.minA + xy.x / 240 * d.bounds.span) * 100) / 100;
    next[d.b] = Math.round((d.bounds.minB + (240 - xy.y) / 240 * d.bounds.span) * 100) / 100;
    onChange(d.index, next);
  };
  return <div className="builder-paths">{([[0, 2, 'TOP / XZ'], [2, 1, 'SIDE / ZY']] as const).map(([a, b, title]) => {
    const bounds = frozen?.a === a && frozen.b === b ? frozen.bounds : boundsFor(points, a, b);
    const xy = (p: Vec3) => [(p[a] - bounds.minA) / bounds.span * 240, 240 - (p[b] - bounds.minB) / bounds.span * 240];
    return <figure key={title}><figcaption>{title}</figcaption><svg viewBox="0 0 240 240" aria-label={title + ' editable camera path'} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
      <path d="M60 0V240M120 0V240M180 0V240M0 60H240M0 120H240M0 180H240" className="builder-path-grid" />
      <polyline points={points.map(p => xy(p).join(',')).join(' ')} className="builder-path-line" />
      {points.map((point, index) => { const [cx, cy] = xy(point); return <circle key={index} cx={cx} cy={cy} r={selected === index ? 9 : 6} tabIndex={0} role="button" aria-label={`${title} point ${index + 1}`} aria-pressed={selected === index}
        className={selected === index ? 'is-selected' : ''}
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onSelect(index); drag.current = { index, a, b, bounds, point: [...point] }; setFrozen({ a, b, bounds }); e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId); onBegin(); }}
        onKeyDown={e => { const directions: Record<string, [number, number]> = { ArrowLeft: [a, -1], ArrowRight: [a, 1], ArrowDown: [b, -1], ArrowUp: [b, 1] }; const direction = directions[e.key]; if (!direction) return; e.preventDefault(); onSelect(index); const value: Vec3 = [...point]; value[direction[0]] += direction[1] * (e.shiftKey ? 1 : .1); onChange(index, value); }} />; })}
    </svg></figure>;
  })}</div>;
}
