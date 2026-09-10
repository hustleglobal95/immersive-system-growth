"use client";

import { Html } from "@react-three/drei";
import { experience } from "@/src/lib/experience";
import { useExperienceStore } from "@/src/store/experienceStore";

export function Hotspots() {
  const activeScene = useExperienceStore((state) => state.activeScene);
  const setSelected = useExperienceStore((state) => state.setSelectedHotspot);
  const activeId = experience.scenes[activeScene]?.id;
  const hotspots = experience.hotspots.filter(
    (hotspot) => hotspot.sceneId === activeId,
  );

  return (
    <>
      {hotspots.map((hotspot) => (
        <group key={hotspot.id} position={hotspot.position}>
          <mesh
            onClick={(event) => {
              event.stopPropagation();
              setSelected(hotspot.id);
            }}
          >
            <sphereGeometry args={[0.085, 24, 24]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <Html center distanceFactor={7} style={{ pointerEvents: "none" }}>
            <span className="hotspot-label">{hotspot.label}</span>
          </Html>
        </group>
      ))}
    </>
  );
}
