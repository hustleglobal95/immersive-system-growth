"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { remap01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { SceneBlock } from "@/src/types/experience";

type Roll = Extract<SceneBlock, { type: "image-roll" }>;

/**
 * A levitating rank of square plates. Scroll carries the whole rank sideways while each plate
 * rides its own slow lift, so the row reads as floating rather than sliding. It is seeked from
 * the one scroll clock, so reverse scrubbing reconstructs the same frame, and it holds still
 * under reduced motion.
 */
export function ImageRoll({ block, range }: { block: Roll; range: readonly [number, number] }) {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useExperienceStore((state) => state.reducedMotion);

  useEffect(() => {
    const element = track.current;
    if (!element || reduced) return;
    const plates = Array.from(element.querySelectorAll<HTMLElement>(".image-roll__plate"));
    const setTrack = gsap.quickSetter(element, "xPercent");
    const setPlate = plates.map((plate) => ({
      y: gsap.quickSetter(plate, "y", "px"),
      rotate: gsap.quickSetter(plate, "rotate", "deg"),
    }));
    const sign = block.direction === "left" ? -1 : 1;
    const render = (progress: number) => {
      const local = remap01(progress, range[0], range[1]);
      setTrack(sign * (local - 0.5) * block.travel);
      setPlate.forEach((plate, index) => {
        const phase = index * 0.72;
        plate.y(Math.sin(local * Math.PI * 1.4 + phase) * block.lift * (1 + (index % 3) * 0.35));
        plate.rotate(Math.sin(local * Math.PI + phase * 0.6) * 0.9);
      });
    };
    render(useExperienceStore.getState().runtimeProgress ?? useExperienceStore.getState().progress);
    const frame = cinematicProgress.subscribe(render);
    const store = useExperienceStore.subscribe((state) => {
      if (state.webglStatus !== "ready") render(state.runtimeProgress ?? state.progress);
    });
    return () => {
      frame();
      store();
      gsap.set([element, ...plates], { clearProps: "transform" });
    };
  }, [block.direction, block.lift, block.travel, range, reduced]);

  return (
    <div className="image-roll" aria-hidden="true">
      <div className="image-roll__track" ref={track}>
        {block.images.map((image, index) => (
          <figure className="image-roll__plate" key={`${image.src}-${index}`}>
            <img src={image.src} alt="" decoding="async" loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}
