"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Material, Mesh, type Group, type MeshPhysicalMaterial } from "three";
import { useExperienceConfig } from "@/src/components/runtime/ExperienceConfigContext";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { useModelInstance } from "@/src/components/three/useModelInstance";
import { useExperienceStore } from "@/src/store/experienceStore";
import { ProductRig } from "@/src/components/three/ProductRig";
import { applyHeroMaterial, captureHeroMaterial } from "@/src/lib/heroMaterial";
export function HeroFallback() {
  const quality = useExperienceStore((s) => s.quality);
  const frame = useCinematicFrame();
  const material = useRef<MeshPhysicalMaterial>(null);
  const tint = useRef(new Color());
  const baseline = useRef({ color: new Color("#f97316"), metalness: .72, roughness: .16, clearcoat: 1 });
  useFrame(() => {
    if (!material.current) return;
    tint.current.set(frame.current.material.tint);
    applyHeroMaterial(material.current, baseline.current, frame.current.material, tint.current);
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
  const quality=useExperienceStore(s=>s.quality);
  const group = useRef<Group>(null),
    frame = useCinematicFrame();
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const h = frame.current.hero;
    g.position.set(...h.position);
    g.rotation.set(...h.rotation);
    g.scale.setScalar(h.scale);
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
    <group ref={group}>
      {experience.heroModel ? (
        <StyledHeroModel url={quality==="low"&&experience.heroLowModel?experience.heroLowModel:experience.heroModel} />
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
  useEffect(() => () => prepared.owned.forEach((material) => material.dispose()), [prepared]);
  useFrame(() => {
    tint.current.set(frame.current.material.tint);
    prepared.baselines.forEach((baseline, material) => applyHeroMaterial(material, baseline, frame.current.material, tint.current));
  });
  return <primitive object={scene} dispose={null} />;
}
