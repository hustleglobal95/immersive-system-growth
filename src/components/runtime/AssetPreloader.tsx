"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import manifest from "@/config/asset-manifest.json";

function pathOf(item: string | { path?: string }) {
  return typeof item === "string" ? item : (item.path ?? "");
}

export function AssetPreloader() {
  useEffect(() => {
    for (const item of manifest.models) {
      const path = pathOf(item);
      if (path) useGLTF.preload(path);
    }
  }, []);
  return null;
}
