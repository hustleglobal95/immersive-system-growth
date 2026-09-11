import { Color, type Material, type MeshPhysicalMaterial, type MeshStandardMaterial } from "three";
import type { SceneDefinition } from "@/src/types/experience";

type PbrMaterial = MeshStandardMaterial & Partial<Pick<MeshPhysicalMaterial, "clearcoat">>;

export interface HeroMaterialBaseline {
  color?: Color;
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
}

export function captureHeroMaterial(material: Material): HeroMaterialBaseline {
  const pbr = material as Partial<PbrMaterial>;
  return {
    color: pbr.color?.clone(),
    metalness: pbr.metalness,
    roughness: pbr.roughness,
    clearcoat: pbr.clearcoat,
  };
}

export function applyHeroMaterial(
  material: Material,
  baseline: HeroMaterialBaseline,
  appearance: SceneDefinition["material"],
  tint: Color,
) {
  const pbr = material as Partial<PbrMaterial>;
  if (pbr.color && baseline.color) pbr.color.copy(baseline.color).lerp(tint, appearance.tintStrength);
  if (pbr.metalness !== undefined && baseline.metalness !== undefined)
    pbr.metalness = appearance.metalness ?? baseline.metalness;
  if (pbr.roughness !== undefined && baseline.roughness !== undefined)
    pbr.roughness = appearance.roughness ?? baseline.roughness;
  if (pbr.clearcoat !== undefined && baseline.clearcoat !== undefined)
    pbr.clearcoat = appearance.clearcoat ?? baseline.clearcoat;
}
