"use client";
import { useFrame } from "@react-three/fiber";
import { experience } from "@/src/lib/experience";
import { remap01 } from "@/src/lib/math";
import { seekTarget, shouldSeek } from "@/src/lib/media";
import { useCinematicFrame } from "@/src/components/three/CinematicFrame";
import { useVideoResource } from "@/src/components/three/useVideoResource";
import { useExperienceStore } from "@/src/store/experienceStore";
import type { Vec3 } from "@/src/types/experience";
export function ScrubbedVideoPlane({
  src,
  sceneId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1.6, 0.9, 1],
}: {
  src: string;
  sceneId: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}) {
  const media = useVideoResource(src, false, false),
    frame = useCinematicFrame(),
    scene = experience.scenes.find((s) => s.id === sceneId);
  useFrame(() => {
    if (!media || !scene || useExperienceStore.getState().reducedMotion) return;
    const v = media.video;
    if (v.readyState < 2 || !Number.isFinite(v.duration)) return;
    const target = seekTarget(
      remap01(frame.progress, ...scene.range),
      v.duration,
    );
    if (shouldSeek(v.currentTime, target, v.seeking)) v.currentTime = target;
  });
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
