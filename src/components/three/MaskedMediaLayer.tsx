"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  Texture,
  Vector2,
} from "three";
import { experience } from "@/src/lib/experience";
import { getMediaPanelWindow, sampleMediaPanel } from "@/src/lib/mediaPanels";
import { createMaskReveal, resolveMaskBackend } from "@/src/lib/maskReveal";
import {
  maskDirectionIndex,
  maskPresetIndex,
  maskRevealFragmentShader,
  maskRevealVertexShader,
} from "@/src/lib/maskShader";
import type { MaskRevealDefinition } from "@/src/types/experience";
import { useExperienceStore } from "@/src/store/experienceStore";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { useImageTexture } from "@/src/components/three/useImageTexture";
import { useVideoResource } from "@/src/components/three/useVideoResource";
import { AssetBoundary } from "@/src/components/three/AssetBoundary";

export function MaskedMediaLayer() {
  const active = useExperienceStore((state) => state.activeScene);
  const quality = useExperienceStore((state) => state.quality);
  const webglStatus = useExperienceStore((state) => state.webglStatus);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  return (
    <>
      {experience.scenes.map((scene, index) => {
        const media = scene.media;
        if (!media || media.transition !== "mask" || Math.abs(index - active) > 1) return null;
        const mask = createMaskReveal(
          media.mask?.preset ?? "linear-soft",
          media.mask ?? { softness: media.maskSoftness },
        );
        if (resolveMaskBackend(mask, { quality, webglStatus, reducedMotion }) !== "webgl") return null;
        return (
          <AssetBoundary key={scene.id} id={`mask-media-${scene.id}`}>
            <Suspense fallback={null}>
              {media.kind === "video" ? (
                <MaskedVideoPanel
                  src={media.src}
                  poster={media.poster!}
                  sceneIndex={index}
                  mask={mask}
                />
              ) : (
                <MaskedImagePanel src={media.src} sceneIndex={index} mask={mask} />
              )}
            </Suspense>
          </AssetBoundary>
        );
      })}
    </>
  );
}

function MaskedImagePanel({
  src,
  sceneIndex,
  mask,
}: {
  src: string;
  sceneIndex: number;
  mask: MaskRevealDefinition;
}) {
  const texture = useImageTexture(src);
  return <MaskedPlane texture={texture} sceneIndex={sceneIndex} mask={mask} />;
}

function MaskedVideoPanel({
  src,
  poster,
  sceneIndex,
  mask,
}: {
  src: string;
  poster: string;
  sceneIndex: number;
  mask: MaskRevealDefinition;
}) {
  const fallback = useImageTexture(poster);
  const media = useVideoResource(src, true, true);
  return <MaskedPlane texture={media?.texture ?? fallback} sceneIndex={sceneIndex} mask={mask} />;
}

function MaskedPlane({
  texture,
  sceneIndex,
  mask,
}: {
  texture: Texture;
  sceneIndex: number;
  mask: MaskRevealDefinition;
}) {
  const mesh = useRef<Mesh>(null);
  const frame = useCinematicFrame();
  const viewport = useThree((state) => state.size);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: maskRevealVertexShader,
        fragmentShader: maskRevealFragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
        uniforms: {
          uMap: { value: texture },
          uProgress: { value: 0 },
          uPreset: { value: maskPresetIndex(mask.preset) },
          uDirection: { value: maskDirectionIndex(mask.direction) },
          uOrigin: { value: new Vector2(mask.origin[0] / 100, mask.origin[1] / 100) },
          uSoftness: { value: mask.softness / 100 },
          uScale: { value: mask.scale },
          uRotation: { value: (mask.rotation * Math.PI) / 180 },
          uIntensity: { value: mask.intensity },
          uSeed: { value: mask.seed },
          uInvert: { value: mask.invert ? 1 : 0 },
          uEdgeColor: { value: new Color(mask.edgeColor) },
          uEdgeWidth: { value: mask.edgeWidth / 100 },
          uViewport: { value: new Vector2(viewport.width, viewport.height) },
          uTextureSize: { value: textureDimensions(texture) },
          uPanelOpacity: { value: 1 },
        },
      }),
    [mask, texture, viewport.height, viewport.width],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera, size }) => {
    if (!mesh.current || !(camera instanceof PerspectiveCamera)) return;
    const panel = sampleMediaPanel(
      frame.progress,
      getMediaPanelWindow(experience.scenes, sceneIndex),
      size.width <= 760,
    );
    mesh.current.visible = panel.visible;
    material.uniforms.uMap.value = texture;
    material.uniforms.uProgress.value = panel.reveal;
    material.uniforms.uPanelOpacity.value = panel.opacity;
    material.uniforms.uViewport.value.set(size.width, size.height);
    material.uniforms.uTextureSize.value.copy(textureDimensions(texture));
    const distance = camera.near + 0.012;
    const height = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
    mesh.current.position.copy(camera.position);
    mesh.current.quaternion.copy(camera.quaternion);
    mesh.current.translateZ(-distance);
    mesh.current.scale.set(height * (size.width / Math.max(1, size.height)), height, 1);
  });

  return (
    <mesh ref={mesh} renderOrder={10_000 + sceneIndex} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function textureDimensions(texture: Texture) {
  const image = texture.image as
    | { width?: number; height?: number; videoWidth?: number; videoHeight?: number }
    | undefined;
  return new Vector2(
    image?.videoWidth ?? image?.width ?? 1,
    image?.videoHeight ?? image?.height ?? 1,
  );
}
