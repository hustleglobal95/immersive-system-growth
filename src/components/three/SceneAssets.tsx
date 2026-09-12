"use client";
import { Suspense, lazy, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import manifest from "@/config/asset-manifest.json";
import { planSceneAssets } from "@/src/lib/assetPlan";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import type { SceneAsset } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { AssetBoundary } from "@/src/components/three/AssetBoundary";
import { GLTFModel } from "@/src/components/three/GLTFModel";
import { ScrubbedGLTF } from "@/src/components/three/ScrubbedGLTF";
import { useThreeInteraction } from "@/src/components/three/useThreeInteraction";
import { captureSpatialObject, releaseSpatialObject } from "@/src/runtime/spatialRegistry";
const VideoPlane = lazy(() =>
  import("./VideoPlane").then((module) => ({ default: module.VideoPlane })),
);
const ScrubbedVideoPlane = lazy(() =>
  import("./ScrubbedVideoPlane").then((module) => ({
    default: module.ScrubbedVideoPlane,
  })),
);
const ImagePlane = lazy(() =>
  import("./ImagePlane").then((module) => ({ default: module.ImagePlane })),
);
const PanoramaDome = lazy(() =>
  import("./PanoramaDome").then((module) => ({ default: module.PanoramaDome })),
);
const EnvironmentMap = lazy(() =>
  import("./EnvironmentMap").then((module) => ({ default: module.EnvironmentMap })),
);

function Asset({ asset }: { asset: SceneAsset }) {
  const quality = useExperienceStore((state) => state.quality);
  if (asset.kind === "model") {
    const url = quality === "low" && asset.lowUrl ? asset.lowUrl : asset.url;
    return asset.animation ? (
      <ScrubbedGLTF
        url={url}
        sceneId={asset.animation.sceneId}
        clip={asset.animation.clip}
        shaderTarget={`asset:${asset.id}`}
      />
    ) : (
      <GLTFModel url={url} shaderTarget={`asset:${asset.id}`} />
    );
  }
  return (
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
  );
}

function InteractiveAsset({ asset, visible }: { asset: SceneAsset; visible: boolean }) {
  const root = useRef<Group>(null);
  const frameCounter = useRef(0);
  const target = `asset:${asset.id}`;
  const interaction = useThreeInteraction(target);
  const spatial = asset.kind !== "environment" && asset.kind !== "panorama";
  useEffect(() => () => releaseSpatialObject(target), [target]);
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const orbit = useExperienceStore.getState().orbit;
    group.position.set(...asset.position);
    group.rotation.set(
      asset.rotation[0] + (orbit.target === target ? orbit.pitch : 0),
      asset.rotation[1] + (orbit.target === target ? orbit.yaw : 0),
      asset.rotation[2],
    );
    group.scale.setScalar(asset.scale);
    if (!spatial || !visible) {
      releaseSpatialObject(target);
      return;
    }
    frameCounter.current = (frameCounter.current + 1) % 12;
    if (frameCounter.current === 0) captureSpatialObject(target, group, "obstacle");
  });
  return (
    <group
      ref={root}
      visible={visible}
      position={asset.position}
      rotation={asset.rotation}
      scale={asset.scale}
      {...interaction}
    >
      <AssetBoundary id={asset.id}>
        <Asset asset={asset} />
      </AssetBoundary>
    </group>
  );
}

export function SceneAssets() {
  const experience = useExperienceConfig();
  const active = useExperienceStore((state) => state.activeScene);
  return (
    <>
      {planSceneAssets(
        experience,
        active,
        Object.fromEntries(manifest.models.map((model) => [model.path, model.bytes])),
      ).map((asset) => {
        const indices = asset.scenes?.map((id) =>
          experience.scenes.findIndex((scene) => scene.id === id),
        );
        const nearby = !indices || indices.some((index) => Math.abs(index - active) <= 1);
        if (!asset.persist && !nearby) return null;
        const visible = asset.persist || !indices || indices.includes(active);
        return <InteractiveAsset key={asset.id} asset={asset} visible={visible} />;
      })}
    </>
  );
}
