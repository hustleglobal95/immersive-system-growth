"use client";
import { Suspense, lazy } from "react";
import manifest from "@/config/asset-manifest.json";
import { planSceneAssets } from "@/src/lib/assetPlan";
import { experience } from "@/src/lib/experience";
import type { SceneAsset } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { AssetBoundary } from "@/src/components/three/AssetBoundary";
import { GLTFModel } from "@/src/components/three/GLTFModel";
import { ScrubbedGLTF } from "@/src/components/three/ScrubbedGLTF";
const VideoPlane = lazy(() =>
  import("./VideoPlane").then((m) => ({ default: m.VideoPlane })),
);
const ScrubbedVideoPlane = lazy(() =>
  import("./ScrubbedVideoPlane").then((m) => ({
    default: m.ScrubbedVideoPlane,
  })),
);
const ImagePlane = lazy(() =>
  import("./ImagePlane").then((m) => ({ default: m.ImagePlane })),
);
const PanoramaDome = lazy(() =>
  import("./PanoramaDome").then((m) => ({ default: m.PanoramaDome })),
);
const EnvironmentMap = lazy(() =>
  import("./EnvironmentMap").then((m) => ({ default: m.EnvironmentMap })),
);
function Asset({ asset }: { asset: SceneAsset }) {
  const quality = useExperienceStore((s) => s.quality);
  const props = {
    position: asset.position,
    rotation: asset.rotation,
    scale: asset.scale,
  };
  if (asset.kind === "model") {
    const url = quality === "low" && asset.lowUrl ? asset.lowUrl : asset.url;
    return asset.animation ? (
      <ScrubbedGLTF
        url={url}
        sceneId={asset.animation.sceneId}
        clip={asset.animation.clip}
        {...props}
      />
    ) : (
      <GLTFModel url={url} {...props} />
    );
  }
  return (
    <group {...props}>
      <Suspense fallback={null}>
        {asset.kind === "image" ? (
          <ImagePlane src={asset.url} />
        ) : asset.kind === "panorama" ? (
          <PanoramaDome texture={asset.url} />
        ) : asset.kind === "environment" ? (
          <EnvironmentMap file={asset.url} />
        ) : asset.sceneId ? (
          <ScrubbedVideoPlane src={asset.url} sceneId={asset.sceneId} />
        ) : (
          <VideoPlane src={asset.url} />
        )}
      </Suspense>
    </group>
  );
}
export function SceneAssets() {
  const active = useExperienceStore((s) => s.activeScene);
  return (
    <>
      {planSceneAssets(
        experience,
        active,
        Object.fromEntries(manifest.models.map((m) => [m.path, m.bytes])),
      ).map((a) => {
        const indices = a.scenes?.map((id) =>
          experience.scenes.findIndex((s) => s.id === id),
        );
        const nearby =
          !indices || indices.some((i) => Math.abs(i - active) <= 1);
        if (!a.persist && !nearby) return null;
        const visible = a.persist || !indices || indices.includes(active);
        return (
          <group key={a.id} visible={visible}>
            <AssetBoundary id={a.id}>
              <Asset asset={a} />
            </AssetBoundary>
          </group>
        );
      })}
    </>
  );
}
