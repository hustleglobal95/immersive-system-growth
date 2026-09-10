"use client";

import { MeshTransmissionMaterial } from "@react-three/drei";

export function ForgeChrome({ color = "#d7d9dd" }: { color?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.95}
      roughness={0.1}
      clearcoat={0.8}
    />
  );
}

export function ForgeMatte({ color = "#1b1b1b" }: { color?: string }) {
  return (
    <meshStandardMaterial color={color} metalness={0.08} roughness={0.72} />
  );
}

export function ForgeGlass({ tint = "#ffffff" }: { tint?: string }) {
  return (
    <MeshTransmissionMaterial
      color={tint}
      transmission={1}
      thickness={0.35}
      ior={1.48}
      roughness={0.08}
      chromaticAberration={0.018}
      anisotropy={0.08}
    />
  );
}

export function ForgeEmissive({
  color = "#f97316",
  intensity = 2,
}: {
  color?: string;
  intensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      toneMapped={false}
    />
  );
}
