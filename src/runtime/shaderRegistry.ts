import {
  Color,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
} from "three";

export type ForgeShaderValue = number | string | boolean;

interface ShaderBinding {
  read: (parameter: string) => ForgeShaderValue | undefined;
  write: (parameter: string, value: ForgeShaderValue) => boolean;
}

const targets = new Map<string, Set<ShaderBinding>>();

export function registerShaderBinding(target: string, binding: ShaderBinding) {
  const bucket = targets.get(target) ?? new Set<ShaderBinding>();
  bucket.add(binding);
  targets.set(target, bucket);
  return () => {
    const current = targets.get(target);
    current?.delete(binding);
    if (!current?.size) targets.delete(target);
  };
}

export function registerMaterialShaderTarget(target: string, material: Material) {
  const binding: ShaderBinding = {
    read: (parameter) => readMaterial(material, parameter),
    write: (parameter, value) => writeMaterial(material, parameter, value),
  };
  return registerShaderBinding(target, binding);
}

export function readShaderTarget(target: string, parameter: string) {
  const bucket = targets.get(target);
  if (!bucket?.size) return undefined;
  for (const binding of bucket) {
    const value = binding.read(parameter);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function writeShaderTarget(target: string, parameter: string, value: ForgeShaderValue) {
  const bucket = targets.get(target);
  if (!bucket?.size) return 0;
  let written = 0;
  for (const binding of bucket) if (binding.write(parameter, value)) written += 1;
  return written;
}

export function hasShaderTarget(target: string) {
  return Boolean(targets.get(target)?.size);
}

function readMaterial(material: Material, parameter: string): ForgeShaderValue | undefined {
  if (parameter === "opacity") return material.opacity;
  if (parameter === "visible") return material.visible;
  if (parameter === "color" && "color" in material && material.color instanceof Color) return `#${material.color.getHexString()}`;
  if (parameter === "emissive" && "emissive" in material && material.emissive instanceof Color) return `#${material.emissive.getHexString()}`;
  if (parameter === "roughness" && material instanceof MeshStandardMaterial) return material.roughness;
  if (parameter === "metalness" && material instanceof MeshStandardMaterial) return material.metalness;
  if (parameter === "emissiveIntensity" && material instanceof MeshStandardMaterial) return material.emissiveIntensity;
  if (material instanceof MeshPhysicalMaterial) {
    if (parameter === "clearcoat") return material.clearcoat;
    if (parameter === "transmission") return material.transmission;
    if (parameter === "ior") return material.ior;
    if (parameter === "thickness") return material.thickness;
  }
  if (material instanceof ShaderMaterial && parameter.startsWith("uniform:")) {
    const uniform = material.uniforms[parameter.slice(8)];
    const value = uniform?.value as unknown;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (value instanceof Color) return `#${value.getHexString()}`;
  }
  return undefined;
}

function writeMaterial(material: Material, parameter: string, value: ForgeShaderValue) {
  if (parameter === "opacity" && typeof value === "number") {
    material.opacity = clamp(value, 0, 1);
    material.transparent = material.opacity < 0.999;
    material.needsUpdate = true;
    return true;
  }
  if (parameter === "visible" && typeof value === "boolean") {
    material.visible = value;
    return true;
  }
  if (parameter === "color" && typeof value === "string" && "color" in material && material.color instanceof Color) {
    material.color.set(value);
    return true;
  }
  if (parameter === "emissive" && typeof value === "string" && "emissive" in material && material.emissive instanceof Color) {
    material.emissive.set(value);
    return true;
  }
  if (material instanceof MeshStandardMaterial) {
    if (parameter === "roughness" && typeof value === "number") material.roughness = clamp(value, 0, 1);
    else if (parameter === "metalness" && typeof value === "number") material.metalness = clamp(value, 0, 1);
    else if (parameter === "emissiveIntensity" && typeof value === "number") material.emissiveIntensity = Math.max(0, value);
    else if (material instanceof MeshPhysicalMaterial && parameter === "clearcoat" && typeof value === "number") material.clearcoat = clamp(value, 0, 1);
    else if (material instanceof MeshPhysicalMaterial && parameter === "transmission" && typeof value === "number") material.transmission = clamp(value, 0, 1);
    else if (material instanceof MeshPhysicalMaterial && parameter === "ior" && typeof value === "number") material.ior = clamp(value, 1, 2.333);
    else if (material instanceof MeshPhysicalMaterial && parameter === "thickness" && typeof value === "number") material.thickness = Math.max(0, value);
    else return false;
    material.needsUpdate = true;
    return true;
  }
  if (material instanceof ShaderMaterial && parameter.startsWith("uniform:")) {
    const uniform = material.uniforms[parameter.slice(8)];
    if (!uniform) return false;
    if (uniform.value instanceof Color && typeof value === "string") uniform.value.set(value);
    else uniform.value = value;
    return true;
  }
  return false;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
