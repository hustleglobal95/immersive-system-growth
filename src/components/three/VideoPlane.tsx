"use client";
import type { Vec3 } from "@/src/types/experience";
import { useVideoResource } from "@/src/components/three/useVideoResource";
export function VideoPlane({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1.6, 0.9, 1],
  loop = true,
}: {
  src: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  loop?: boolean;
}) {
  const media = useVideoResource(src, true, loop);
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={media?.texture ?? null}
        color={media ? "white" : "#252525"}
        toneMapped={false}
      />
    </mesh>
  );
}
