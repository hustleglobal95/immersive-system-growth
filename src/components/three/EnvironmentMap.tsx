"use client";

import { Environment } from "@react-three/drei";

export function EnvironmentMap({
  file,
  background = false,
}: {
  file?: string;
  background?: boolean;
}) {
  if (!file) return null;
  return <Environment files={file} background={background} />;
}
