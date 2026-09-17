"use client";

import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Casa Lumen surfaces: Poly Haven CC0 material sets, downloaded to /textures/client, optimized by
 * `npm run assets:optimize` and registered in config/asset-manifest.json.
 * Colour maps are AVIF; normal and roughness maps stay WebP so channel data is not over-compressed.
 */
const SETS = {
  stone: {
    map: "/textures/client/marble_01_diff_1k.opt.avif",
    normalMap: "/textures/client/marble_01_nor_gl_1k.opt.webp",
    roughnessMap: "/textures/client/marble_01_rough_1k.opt.webp",
  },
  plaster: {
    map: "/textures/client/white_plaster_02_diff_1k.opt.avif",
    normalMap: "/textures/client/white_plaster_02_nor_gl_1k.opt.webp",
    roughnessMap: "/textures/client/white_plaster_02_rough_1k.opt.webp",
  },
  oak: {
    map: "/textures/client/white_oak_veneer_diff_1k.opt.avif",
    normalMap: "/textures/client/white_oak_veneer_nor_gl_1k.opt.webp",
    roughnessMap: "/textures/client/white_oak_veneer_rough_1k.opt.webp",
  },
} as const;

export type CasaSurfaceName = keyof typeof SETS;

const ALL = Object.values(SETS).flatMap((set) => Object.values(set));

/** Preloads every Casa Lumen surface so scenes do not pop in mid-journey. */
useTexture.preload(ALL);

export interface SurfaceMaps {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

/**
 * Returns the three shared texture sets. Textures are cloned per requested repeat so one surface
 * can tile at architectural scale while another stays fine, without mutating the cached originals.
 */
export function useCasaSurfaces(): (name: CasaSurfaceName, repeat?: number) => SurfaceMaps {
  const textures = useTexture(ALL as unknown as string[]);
  return useMemo(() => {
    const byUrl = new Map<string, Texture>();
    (ALL as readonly string[]).forEach((url, index) => byUrl.set(url, (textures as Texture[])[index]));
    const cache = new Map<string, SurfaceMaps>();
    return (name: CasaSurfaceName, repeat = 1) => {
      const key = `${name}:${repeat}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const set = SETS[name];
      const build = (url: string, srgb: boolean) => {
        const source = byUrl.get(url);
        if (!source) throw new Error(`Casa Lumen surface missing: ${url}`);
        const texture = source.clone();
        texture.needsUpdate = true;
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.repeat.set(repeat, repeat);
        texture.anisotropy = 8;
        if (srgb) texture.colorSpace = SRGBColorSpace;
        return texture;
      };
      const maps: SurfaceMaps = {
        map: build(set.map, true),
        normalMap: build(set.normalMap, false),
        roughnessMap: build(set.roughnessMap, false),
      };
      cache.set(key, maps);
      return maps;
    };
  }, [textures]);
}
