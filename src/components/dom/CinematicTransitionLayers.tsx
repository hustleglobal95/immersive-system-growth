"use client";

import { useEffect, useRef } from "react";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { sampleTransitionLayer } from "@/src/lib/transitionLayers";
import { useExperienceStore } from "@/src/store/experienceStore";

export function CinematicTransitionLayers() {
  const experience = useExperienceConfig();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useExperienceStore((state) => state.reducedMotion);
  useEffect(() => {
    const element = root.current;
    if (!element || reduced) return;
    const layers = Array.from(element.querySelectorAll<HTMLElement>("[data-transition-layer]")).map((node) => {
      const scene = experience.scenes[Number(node.dataset.sceneIndex)];
      const layer = scene.media?.layers.find((item) => item.id === node.dataset.transitionLayer);
      return layer ? { node, scene, layer } : null;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const render = (progress: number) => {
      for (const item of layers) {
        const state = sampleTransitionLayer(progress, item.scene.range, item.layer);
        item.node.hidden = !state.visible;
        item.node.style.opacity = String(state.opacity);
        item.node.style.transform = `translate3d(0,${state.translateY}%,0) scale(${state.scale})`;
      }
    };
    render(useExperienceStore.getState().progress);
    return cinematicProgress.subscribe(render);
  }, [experience, reduced]);
  if (reduced) return null;
  return <div ref={root} className="cinematic-transition-layers" aria-hidden="true">
    {experience.scenes.flatMap((scene, sceneIndex) => (scene.media?.layers ?? []).map((layer) => (
      <div key={`${scene.id}-${layer.id}`} className="cinematic-transition-layer" data-transition-layer={layer.id} data-scene-index={sceneIndex} style={{ mixBlendMode: layer.blendMode }}>
        {layer.kind === "color" ? <div style={{ background: layer.color }} /> : <img src={layer.src} alt="" style={{ objectPosition: `${layer.position[0]}% ${layer.position[1]}%` }} />}
      </div>
    )))}
  </div>;
}
