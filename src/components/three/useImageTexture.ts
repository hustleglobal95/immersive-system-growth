"use client";
import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace, type Texture } from "three";
const owners = new Map<
  Texture,
  { count: number; texture: Texture; timer?: ReturnType<typeof setTimeout> }
>();
const latest = new Map<string, Texture>();
export function useImageTexture(url: string) {
  const source = useTexture(url);
  const texture = useMemo(() => {
    const t = source.clone();
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [source]);
  useEffect(() => {
    const resource = owners.get(source) ?? { count: 0, texture: source };
    clearTimeout(resource.timer);
    resource.count++;
    owners.set(source, resource);
    latest.set(url, source);
    return () => {
      texture.dispose();
      resource.count--;
      resource.timer = setTimeout(() => {
        if (resource.count) return;
        resource.texture.dispose();
        if (latest.get(url) === source) {
          useTexture.clear(url);
          latest.delete(url);
        }
        owners.delete(source);
      }, 500);
    };
  }, [url, source, texture]);
  return texture;
}
