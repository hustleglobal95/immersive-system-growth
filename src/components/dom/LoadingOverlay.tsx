"use client";

import { useProgress } from "@react-three/drei";

export function LoadingOverlay() {
  const { active, progress, item } = useProgress();
  if (!active) return null;
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay__inner">
        <span>LOADING 3D WORLD</span>
        <strong>{Math.round(progress)}%</strong>
        <div>
          <i style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        {item && <small>{item.split("/").at(-1)}</small>}
      </div>
    </div>
  );
}
