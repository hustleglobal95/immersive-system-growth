"use client";
import { useEffect, useState } from "react";
import { SRGBColorSpace, VideoTexture } from "three";
import { useExperienceStore } from "@/src/store/experienceStore";
export function useVideoResource(
  src: string,
  autoplay: boolean,
  loop: boolean,
) {
  const [resource, setResource] = useState<{
    src: string;
    video: HTMLVideoElement;
    texture: VideoTexture;
  } | null>(null);
  const reducedMotion = useExperienceStore((s) => s.reducedMotion);
  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.loop = loop;
    video.preload = "auto";
    video.src = src;
    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;
    const fail = () =>
      useExperienceStore
        .getState()
        .setAssetError(
          src,
          "Video unavailable. Read the equivalent page content.",
        );
    const ready = () => {
      setResource({ src, video, texture });
      useExperienceStore.getState().setAssetError(src, null);
      if (autoplay && !reducedMotion) void video.play().catch(fail);
    };
    const visibility = () => {
      if (document.hidden) video.pause();
      else if (autoplay && !reducedMotion) void video.play().catch(fail);
    };
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", fail);
    document.addEventListener("visibilitychange", visibility);
    const timer = setTimeout(() => {
      if (video.readyState < 2) fail();
    }, 15000);
    video.load();
    return () => {
      clearTimeout(timer);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", visibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();
    };
  }, [src, autoplay, loop, reducedMotion]);
  return resource?.src === src ? resource : null;
}
