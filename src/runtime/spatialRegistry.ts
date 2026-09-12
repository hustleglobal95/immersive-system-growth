import { Box3, Object3D } from "three";
import type { LiveSpatialBoundInput, SpatialRole } from "@/src/lib/spatialCamera";
import type { Vec3 } from "@/src/types/experience";

interface RegistryEntry extends LiveSpatialBoundInput {
  updatedAt: number;
}

const registry = new Map<string, RegistryEntry>();
const box = new Box3();

export function captureSpatialObject(id: string, object: Object3D, role: SpatialRole) {
  object.updateWorldMatrix(true, true);
  box.setFromObject(object, true);
  if (box.isEmpty()) {
    registry.delete(id);
    return false;
  }
  const min = box.min;
  const max = box.max;
  if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    registry.delete(id);
    return false;
  }
  registry.set(id, {
    id,
    min: [min.x, min.y, min.z] as Vec3,
    max: [max.x, max.y, max.z] as Vec3,
    role,
    source: "live",
    updatedAt: performanceNow(),
  });
  return true;
}

export function releaseSpatialObject(id: string) {
  registry.delete(id);
}

export function getSpatialBoundsSnapshot(maxAgeMs = 5000): LiveSpatialBoundInput[] {
  const now = performanceNow();
  return [...registry.values()]
    .filter((entry) => now - entry.updatedAt <= maxAgeMs)
    .map((entry) => ({ id: entry.id, min: [...entry.min] as Vec3, max: [...entry.max] as Vec3, role: entry.role, source: entry.source }));
}

export function clearSpatialRegistry() {
  registry.clear();
}

function performanceNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}
