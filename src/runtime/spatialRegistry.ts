import { Box3, Mesh, Object3D } from "three";
import type { LiveSpatialBoundInput, SpatialRole } from "@/src/lib/spatialCamera";
import type { Vec3 } from "@/src/types/experience";

interface RegistryEntry extends LiveSpatialBoundInput {
  updatedAt: number;
}

const BLOCKER_TERMS = [
  "wall", "column", "pillar", "partition", "bench", "plinth", "counter", "table", "desk",
  "stair", "railing", "barrier", "front-left", "front-right", "cabinet", "island", "shelf",
];
const NON_BLOCKER_TERMS = ["floor", "roof", "ceiling", "door", "gate", "window", "glass", "curtain"];
const registry = new Map<string, RegistryEntry>();
const box = new Box3();

export function captureSpatialObject(id: string, object: Object3D, role: SpatialRole) {
  object.updateWorldMatrix(true, true);
  return captureBox(id, object, role);
}

export function captureSpatialSet(id: string, object: Object3D) {
  object.updateWorldMatrix(true, true);
  return captureMeshGroup(`set:${id}:`, object, "obstacle", (_mesh, name) => isStructuralBlocker(name));
}

export function captureSpatialSubjectParts(id: string, object: Object3D) {
  object.updateWorldMatrix(true, true);
  return captureMeshGroup(`subject:${id}:`, object, "subject", (mesh) => mesh.visible);
}

export function releaseSpatialObject(id: string) {
  registry.delete(id);
}

export function releaseSpatialSet(id: string) {
  releasePrefix(`set:${id}:`);
}

export function releaseSpatialSubjectParts(id: string) {
  releasePrefix(`subject:${id}:`);
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

function captureMeshGroup(
  prefix: string,
  object: Object3D,
  role: SpatialRole,
  include: (mesh: Mesh, name: string) => boolean,
) {
  const active = new Set<string>();
  let index = 0;
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const name = (child.name || `mesh-${index}`).toLowerCase();
    const key = `${prefix}${slug(name)}-${index}`;
    index += 1;
    if (!include(child, name)) return;
    if (captureBox(key, child, role)) active.add(key);
  });
  for (const key of registry.keys()) {
    if (key.startsWith(prefix) && !active.has(key)) registry.delete(key);
  }
  return active.size;
}

function captureBox(id: string, object: Object3D, role: SpatialRole) {
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

function releasePrefix(prefix: string) {
  for (const key of registry.keys()) if (key.startsWith(prefix)) registry.delete(key);
}

function isStructuralBlocker(name: string) {
  if (NON_BLOCKER_TERMS.some((term) => name.includes(term))) return false;
  return BLOCKER_TERMS.some((term) => name.includes(term));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "node";
}

function performanceNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}
