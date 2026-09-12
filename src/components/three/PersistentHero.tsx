"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Material, Mesh, type Group, type MeshPhysicalMaterial } from "three";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { useThreeInteraction } from "@/src/components/three/useThreeInteraction";
import { useExperienceStore } from "@/src/store/experienceStore";
import { ProductRig } from "@/src/components/three/ProductRig";
import { applyHeroMaterial, captureHeroMaterial } from "@/src/lib/heroMaterial";
import { registerMaterialShaderTarget, reapplyShaderTarget } from "@/src/runtime/shaderRegistry";
import {
  captureSpatialObject,
  captureSpatialSubjectParts,
  releaseSpatialObject,
  releaseSpatialSubjectParts,
} from "@/src/runtime/spatialRegistry";

export function HeroFallback() {
  const quality = useExperienceStore((state) => state.quality);
  const frame = useCinematicFrame();
  const material = useRef<MeshPhysicalMaterial>(null);
  const tint = useRef(new Color());
  const baseline = useRef({ color: new Color("#f97316"), metalness: .72, roughness: .16, clearcoat: 1 });
  useEffect(() => {
    if (!material.current) return;
    return registerMaterialShaderTarget("hero", material.current);
  }, []);
  useFrame(() => {
    if (!material.current) return;
    tint.current.set(frame.current.material.tint);
    applyHeroMaterial(material.current, baseline.current, frame.current.material, tint.current);
    reapplyShaderTarget("hero");
  });
  return (
    <mesh castShadow receiveShadow>
      <torusKnotGeometry
        args={[
          0.85,
          0.22,
          quality === "low" ? 64 : 160,
          quality === "low" ? 8 : 20,
        ]}
      />
      <meshPhysicalMaterial
        ref={material}
        color="#f97316"
        metalness={0.72}
        roughness={0.16}
        clearcoat={1}
      />
    </mesh>
  );
}

export function PersistentHero() {
  const experience = useExperienceConfig();
  const quality = useExperienceStore((state) => state.quality);
  const group = useRef<Group>(null);
  const frameCounter = useRef(0);
  const frame = useCinematicFrame();
  const interaction = useThreeInteraction("hero");
  useEffect(() => () => {
    releaseSpatialObject("hero");
    releaseSpatialSubjectParts("hero");
  }, []);
  useFrame(() => {
    const root = group.current;
    if (!root) return;
    const hero = frame.current.hero;
    const orbit = useExperienceStore.getState().orbit;
    root.position.set(...hero.position);
    root.rotation.set(
      hero.rotation[0] + (orbit.target === "hero" ? orbit.pitch : 0),
      hero.rotation[1] + (orbit.target === "hero" ? orbit.yaw : 0),
      hero.rotation[2],
    );
    root.scale.setScalar(hero.scale);
    frameCounter.current = (frameCounter.current + 1) % 12;
    if (frameCounter.current === 0) {
      captureSpatialObject("hero", root, "subject");
      captureSpatialSubjectParts("hero", root);
    }
  });
  if (!experience.heroVisible) return null;
  if (experience.productRig && experience.heroModel)
    return (
      <ProductRig
        url={quality === "low" && experience.heroLowModel ? experience.heroLowModel : experience.heroModel}
        rig={experience.productRig}
      />
    );
  return (
    <group ref={group} {...interaction}>
      {experience.heroModel ? (
        <StyledHeroModel url={quality === "low" && experience.heroLowModel ? experience.heroLowModel : experience.heroModel} />
      ) : (
        <HeroFallback />
      )}
    </group>
  );
}

function StyledHeroModel({ url }: { url: string }) {
  const { scene } = useModelInstance(url);
  const frame = useCinematicFrame();
  const tint = useRef(new Color());
  const prepared = useMemo(() => {
    const owned = new Set<Material>();
    const baselines = new Map<Material, ReturnType<typeof captureHeroMaterial>>();
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const materials = source.map((material) => {
        const clone = material.clone();
        owned.add(clone);
        baselines.set(clone, captureHeroMaterial(clone));
        return clone;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
    });
    return { owned, baselines };
  }, [scene]);
  useEffect(() => {
    const unregister = [...prepared.owned].map((material) => registerMaterialShaderTarget("hero", material));
    return () => {
      unregister.forEach((dispose) => dispose());
      prepared.owned.forEach((material) => material.dispose());
    };
  }, [prepared]);
  useFrame(() => {
    tint.current.set(frame.current.material.tint);
    prepared.baselines.forEach((baseline, material) => applyHeroMaterial(material, baseline, frame.current.material, tint.current));
    reapplyShaderTarget("hero");
  });
  return <primitive object={scene} dispose={null} />;
}
