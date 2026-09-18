"use client";

import { useEffect, useRef } from "react";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { remap01 } from "@/src/lib/math";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { SceneBlock } from "@/src/types/experience";

type Roll = Extract<SceneBlock, { type: "image-roll" }>;

const TAU = Math.PI * 2;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => { const v = clamp01(t); return v * v * (3 - 2 * v); };
const span = (t: number, a: number, b: number) => clamp01((t - a) / Math.max(1e-6, b - a));

/**
 * A carousel of square plates orbiting an invisible vertical axis in front of the reader.
 *
 * Every plate's place comes from its angle on that axis rather than from a flex row, so the
 * ring is evenly spaced by construction, wraps with no seam, and depth-sorts itself: the plate
 * at the front is nearest, largest and brightest, the ones either side turn away and dim, and
 * the back half is not drawn at all. Scroll turns the ring and the reader can also hold and
 * slide it. Leaving the section, plates rise off one at a time from the leading edge, each
 * stopping as it meets the top of the screen.
 */
export function ImageRoll({ block, range }: { block: Roll; range: readonly [number, number] }) {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useExperienceStore((state) => state.reducedMotion);

  useEffect(() => {
    const element = stage.current;
    if (!element || reduced) return;
    const plates = Array.from(element.querySelectorAll<HTMLElement>(".image-roll__plate"));
    const count = plates.length;
    if (!count) return;

    const direction = block.direction === "left" ? 1 : -1;
    const drag = { slots: 0 };
    let last = 0;
    let geometry = { radius: 420, plate: 240, arch: 90 };
    const measure = () => {
      const plate = plates[0].offsetWidth || 240;
      const chord = Math.sin(Math.PI / count) * 2;
      geometry = {
        plate,
        // Radius set from the chord between neighbours, so they clear the front plate rather
        // than colliding with it however many images the section carries.
        radius: Math.max(plate, (plate * 1.08) / Math.max(0.35, chord)),
        arch: plate * 0.3 * block.curve,
      };
    };
    measure();
    window.addEventListener("resize", measure);

    const FADE_IN = 0.05, GONE = 0.78;
    const SWEEP_END = block.sweep, HOLD_END = block.exit;
    const EXIT_LEAN = 0.18, EXIT_TURN = 20, EXIT_SEQUENCE = 0.78;

    // The ring follows scroll through a damped lerp rather than tracking it rigidly, and keeps
    // a slow bob of its own, so it reads as floating and settles instead of stopping dead.
    const ease = { current: 0, target: 0, clock: 0, last: undefined as number | undefined };
    let raf = 0;
    let visible = false;
    const tick = (time: number) => {
      raf = 0;
      const step = ease.last === undefined ? 16 : Math.min(48, time - ease.last);
      ease.last = time;
      ease.clock += step / 1000;
      ease.current += (ease.target - ease.current) * Math.min(1, step / 1000 * 6.5);
      paint();
      if (visible) raf = requestAnimationFrame(tick);
    };
    const pump = () => { if (visible && !raf) raf = requestAnimationFrame(tick); };

    const render = (progress: number) => {
      last = progress;
      const local = clamp01(remap01(progress, range[0], range[1]));
      const entering = smooth(span(local, 0, FADE_IN));
      // The ring turns across the section, then holds while the section is still on screen.
      const advance = smooth(span(local, FADE_IN * 0.5, SWEEP_END)) * (block.travel / 100) * count;
      ease.target = direction * advance + drag.slots;
      state = { local, entering };
      pump();
    };

    let state = { local: 0, entering: 0 };
    const paint = () => {
      const { local, entering } = state;
      const offset = ease.current;
      const stageTop = element.getBoundingClientRect().top;

      for (let index = 0; index < count; index += 1) {
        const plate = plates[index];
        // Wrapped place on the ring: 0 is dead front, half way round is directly behind.
        const slot = (((index + offset) % count) + count) % count;
        const angle = (slot / count) * TAU;
        const facing = Math.cos(angle);
        const front = Math.max(0, facing);
        const x = Math.sin(angle) * geometry.radius;
        const z = (facing - 1) * geometry.radius;
        // Lowest at the front, lifting away to both sides: the ring reads as a smile.
        // A slow bob per plate, on its own phase, so the ring never sits perfectly still.
        const bob = Math.sin(ease.clock * 0.55 + index * 0.9) * geometry.plate * 0.028;
        const arch = (facing - 0.45) * geometry.arch + bob;

        // Plates leave in the order they sit, the leading edge first.
        const queued = clamp01((x / geometry.radius + 1) / 2);
        const slotWindow = (GONE - HOLD_END) * (1 - EXIT_SEQUENCE);
        const opens = HOLD_END + queued * (GONE - HOLD_END) * EXIT_SEQUENCE;
        const exit = smooth(span(local, opens, opens + slotWindow));
        const rise = exit * Math.max(0, stageTop + arch + geometry.plate / 2);

        const scale = (0.82 + front * 0.26) * (1 - exit * 0.2);
        plate.style.transform =
          `translate3d(${(x - rise * EXIT_LEAN).toFixed(2)}px, ${(arch - rise).toFixed(2)}px, ${z.toFixed(2)}px) ` +
          `rotateY(${((angle * 180) / Math.PI).toFixed(2)}deg) ` +
          `rotate(${(-exit * EXIT_TURN).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        plate.style.opacity = (entering * (0.3 + front * 0.7) * smooth(front * 1.5 + 0.12) * (1 - exit)).toFixed(3);
        plate.style.zIndex = String(Math.round(front * 100));
      }
    };

    // Hold and slide to turn the ring by hand. It is a loop, so there is nothing to clamp to.
    let pointer: number | null = null;
    let lastX = 0;
    const perSlot = () => Math.max(1, geometry.radius * Math.sin(Math.PI / count) * 2);
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointer = event.pointerId;
      lastX = event.clientX;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "true";
    };
    const onMove = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      drag.slots -= (event.clientX - lastX) / perSlot();
      lastX = event.clientX;
      render(last);
      pump();
    };
    const onUp = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      delete element.dataset.dragging;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);

    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) pump();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; ease.last = undefined; }
    }, { rootMargin: "20% 0px" });
    watcher.observe(element);

    const store = useExperienceStore.getState();
    render(store.runtimeProgress ?? store.progress);
    ease.current = ease.target;
    paint();
    const frame = cinematicProgress.subscribe(render);
    const fallback = useExperienceStore.subscribe((state) => {
      if (state.webglStatus !== "ready") render(state.runtimeProgress ?? state.progress);
    });
    return () => {
      frame();
      fallback();
      window.removeEventListener("resize", measure);
      watcher.disconnect();
      if (raf) cancelAnimationFrame(raf);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
      plates.forEach((plate) => {
        plate.style.transform = "";
        plate.style.opacity = "";
        plate.style.zIndex = "";
      });
    };
  }, [block.curve, block.direction, block.exit, block.sweep, block.travel, range, reduced]);

  return (
    <div className="image-roll" aria-hidden="true">
      <div className="image-roll__stage" ref={stage}>
        {[...block.images, ...block.images, ...block.images].map((image, index) => (
          <figure className="image-roll__plate" key={`${image.src}-${index}`}>
            <img src={image.src} alt="" decoding="async" loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}
