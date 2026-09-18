"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { getSceneIndex } from "@/src/lib/experience";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { getMediaPanelWindow, sampleMediaPanel } from "@/src/lib/mediaPanels";
import { createCssMaskStyle, createMaskReveal, resolveMaskBackend } from "@/src/lib/maskReveal";
import { useExperienceStore } from "@/src/store/experienceStore";
import { remap01 } from "@/src/lib/math";
import { sampleSceneMotion } from "@/src/lib/motionSequencer";
import { dispatchForgeInteraction } from "@/src/runtime/interactionEvents";
import { MediaShader } from "@/src/components/dom/MediaShader";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function CinematicMedia() {
  const experience = useExperienceConfig();
  const root = useRef<HTMLDivElement>(null);
  const preview = useExperienceStore((state) => state.mediaPreview);
  const reduced = useExperienceStore((state) => state.reducedMotion);
  const quality = useExperienceStore((state) => state.quality);
  const webglStatus = useExperienceStore((state) => state.webglStatus);
  const [active, setActive] = useState(0);
  const progress = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const update = (value: number) => {
      progress.current = value;
      setActive(getSceneIndex(value, experience));
    };
    const state = useExperienceStore.getState();
    update(state.runtimeProgress ?? state.progress);
    const frame = cinematicProgress.subscribe(update);
    const fallback = useExperienceStore.subscribe((next) => {
      if (next.webglStatus !== "ready") update(next.runtimeProgress ?? next.progress);
    });
    return () => {
      frame();
      fallback();
    };
  }, [experience, reduced]);

  // Before paint, not after. This effect re-runs whenever the active chapter changes, which is
  // exactly when a panel mounts: with useEffect the browser painted one frame of the new panel
  // at its CSS defaults -- fully opaque, unmasked, untransformed -- which measured as an
  // isolated jump nearly ten times its neighbouring frames.
  useIsomorphicLayoutEffect(() => {
    const element = root.current;
    if (!element || reduced) return;
    const compact = matchMedia("(max-width: 760px)");
    const panels = Array.from(element.querySelectorAll<HTMLElement>("[data-media-panel]"));
    const tracks = panels.map((panel) => {
      const index = Number(panel.dataset.mediaPanel);
      const scene = experience.scenes[index];
      const image = panel.querySelector<HTMLElement>(".media-panel__inner")!;
      // The shade is a full-frame vignette sitting over the image for legibility. It is a
      // sibling of the masked element, so it used to arrive at full strength the moment the
      // panel became visible, while the photograph behind it was still entirely masked: a dark
      // overlay snapping on ahead of every handover. It now carries the same mask, so it
      // reveals in the same shape. It is deliberately not transformed -- the vignette belongs
      // to the frame, not to the drifting image.
      const shade = panel.querySelector<HTMLElement>(".media-panel__shade");
      const video = panel.querySelector("video");
      let playing = false;
      const mask = scene.media?.transition === "mask"
        ? createMaskReveal(scene.media.mask?.preset ?? "linear-soft", scene.media.mask ?? { softness: scene.media.maskSoftness })
        : null;
      return {
        panel,
        image,
        shade,
        video,
        mask,
        scene,
        window: getMediaPanelWindow(experience.scenes, index),
        panelY: gsap.quickSetter(panel, "yPercent"),
        panelX: gsap.quickSetter(panel, "xPercent"),
        // Travel and scale share one matrix on the image, so they are composed in a single
        // write. Separate transform setters on the same element contend and drop components.
        frame(xPercent: number, yPercent: number, scale: number) {
          image.style.transform =
            `translate(${xPercent.toFixed(3)}%, ${yPercent.toFixed(3)}%) scale(${scale.toFixed(5)})`;
        },
        playback(visible: boolean) {
          const play = visible && !document.hidden;
          if (!video || play === playing) return;
          playing = play;
          if (play) void video.play().catch(() => { /* Poster remains when autoplay is blocked. */ });
          else video.pause();
        },
      };
    });

    const videoListeners = tracks.flatMap((track) => {
      if (!track.video) return [];
      const onTime = () => {
        const duration = Number.isFinite(track.video!.duration) ? track.video!.duration : 0;
        const time = Number.isFinite(track.video!.currentTime) ? track.video!.currentTime : 0;
        dispatchForgeInteraction({
          type: "video-time",
          target: track.scene.id,
          payload: {
            time,
            duration,
            progress: duration > 0 ? Math.max(0, Math.min(1, time / duration)) : 0,
          },
        });
      };
      track.video.addEventListener("timeupdate", onTime);
      return [{ video: track.video, onTime }];
    });

    const render = (value: number) => {
      for (const track of tracks) {
        const state = sampleMediaPanel(value, track.window, compact.matches);
        const motion = sampleSceneMotion(
          track.scene,
          remap01(value, track.scene.range[0], track.scene.range[1]),
          compact.matches,
        ).media;
        const reveal = motion.reveal ?? state.reveal;
        track.panel.style.visibility = state.visible ? "visible" : "hidden";
        track.panel.style.opacity = String(motion.opacity ?? state.opacity);
        track.panel.style.filter = `blur(${state.blur}px)`;
        // Curtains close on their own axis; a wipe crosses the frame from the authored side.
        const c = state.clip, half = c / 2;
        track.panel.style.clipPath = state.transition === "curtain"
          ? state.clipAxis === "x" ? `inset(0 ${half}% 0 ${half}%)` : `inset(${half}% 0 ${half}% 0)`
          : state.transition === "wipe"
            ? state.clipAxis === "x"
              ? state.clipSign > 0 ? `inset(0 ${c}% 0 0)` : `inset(0 0 0 ${c}%)`
              : state.clipSign > 0 ? `inset(0 0 ${c}% 0)` : `inset(${c}% 0 0 0)`
            : "none";
        if (track.mask) {
          const css = createCssMaskStyle(reveal, track.mask);
          const image = String(css.maskImage ?? "");
          const size = String(css.maskSize ?? "100% 100%");
          const repeat = String(css.maskRepeat ?? "no-repeat");
          const position = String(css.maskPosition ?? "center");
          for (const target of [track.image, track.shade]) {
            if (!target) continue;
            target.style.webkitMaskImage = image;
            target.style.maskImage = image;
            target.style.webkitMaskSize = size;
            target.style.maskSize = size;
            target.style.webkitMaskRepeat = repeat;
            target.style.maskRepeat = repeat;
            target.style.webkitMaskPosition = position;
            target.style.maskPosition = position;
          }
          track.panel.dataset.maskPreset = track.mask.preset;
          track.panel.style.setProperty("--mask-edge-color", track.mask.edgeColor);
          track.panel.style.setProperty("--mask-edge-width", `${track.mask.edgeWidth}%`);
        } else {
          for (const target of [track.image, track.shade]) {
            if (!target) continue;
            target.style.webkitMaskImage = "";
            target.style.maskImage = "";
          }
          delete track.panel.dataset.maskPreset;
        }
        track.panelY(state.panelY);
        track.panelX(state.panelX);
        track.frame(state.imageX, state.imageY, state.scale);
        track.playback(state.visible);
      }
    };
    const refresh = () => render(progress.current);
    const frame = cinematicProgress.subscribe(render);
    const fallback = useExperienceStore.subscribe((state) => {
      if (state.webglStatus !== "ready") render(state.runtimeProgress ?? state.progress);
    });
    compact.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      frame();
      fallback();
      compact.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
      videoListeners.forEach(({ video, onTime }) => video.removeEventListener("timeupdate", onTime));
      tracks.forEach((track) => track.video?.pause());
    };
  }, [active, experience, preview, reduced, quality, webglStatus]);

  if (reduced) return null;
  return <div ref={root} className="cinematic-media" aria-hidden="true">
    {experience.scenes.map((scene, index) => {
      if (Math.abs(index - active) > 1 || (!scene.media && !preview)) return null;
      const media = scene.media;
      const mask = media?.transition === "mask"
        ? createMaskReveal(media.mask?.preset ?? "linear-soft", media.mask ?? { softness: media.maskSoftness })
        : null;
      // MaskedMediaLayer declines any plate it has no texture to sample, so a colour or shader
      // field stays on this path whatever its mask resolves to. Skipping it here as well left
      // those chapters painting nothing at all on a high-quality device.
      const drawn = !!media?.src && media.kind !== "color" && media.kind !== "shader";
      if (drawn && mask && resolveMaskBackend(mask, { quality, webglStatus, reducedMotion: reduced }) === "webgl") return null;
      // The scrim follows the copy: its centre sits on the side this chapter's words are on, and
      // its weight is authored per chapter against how bright that photograph actually is.
      const align = scene.copy.align ?? "left";
      const scrimX = align === "right" ? "76%" : align === "center" ? "50%" : "24%";
      return <div key={`${scene.id}-${preview}`} className="media-panel" data-media-panel={index}
        style={{ zIndex: index, "--scrim": media?.scrim ?? 0.62, "--scrim-x": scrimX } as CSSProperties}>
        <div
          className="media-panel__inner"
          data-transition={media?.transition ?? "slide"}
          style={{
            "--media-position": `${media?.position[0] ?? 50}% ${media?.position[1] ?? 50}%`,
            "--media-position-mobile": `${media?.mobilePosition[0] ?? 50}% ${media?.mobilePosition[1] ?? 50}%`,
            "--media-blend": media?.blendColor ?? "transparent",
            "--media-mask-softness": `${media?.maskSoftness ?? 18}%`,
          } as CSSProperties}
        >
          {media ? media.kind === "video"
            ? <video src={media.poster ? media.src : undefined} poster={media.poster} muted playsInline loop preload="none" />
            : media.kind === "color"
              ? <div className="media-panel__fill" style={{ background: media.fill }} />
              : media.kind === "shader"
                ? <div className="media-panel__fill" style={{ background: media.fill }}>
                    <MediaShader shader={media.shader!} deep={media.fill!} light={media.shaderTint ?? media.fill!} />
                  </div>
                : <img src={media.src} alt="" decoding="async" />
            : <div className={`media-fixture media-fixture--${index % 3}`}><span>MEDIA STUDY / {String(index + 1).padStart(2, "0")}</span><i /><b /></div>}
        </div>
        <div className="media-panel__shade" />
      </div>;
    })}
  </div>;
}
