import type { Vec3 } from "@/src/types/experience";

export interface GlbSpatialBounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  halfSize: Vec3;
  radius: number;
  positionAccessors: number;
}

interface GltfJson {
  meshes?: Array<{ primitives?: Array<{ attributes?: { POSITION?: number } }> }>;
  accessors?: Array<{ min?: number[]; max?: number[] }>;
}

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

export function extractGlbSpatialBounds(input: ArrayBuffer): GlbSpatialBounds | null {
  if (input.byteLength < 20) return null;
  const view = new DataView(input);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) return null;
  let offset = 12;
  let document: GltfJson | null = null;
  while (offset + 8 <= input.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > input.byteLength) return null;
    if (type === JSON_CHUNK && !document) {
      const text = new TextDecoder().decode(new Uint8Array(input, start, length)).replace(/[\u0000\s]+$/g, "");
      document = JSON.parse(text) as GltfJson;
    }
    offset = end;
  }
  if (!document) return null;
  const indices = new Set<number>();
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const index = primitive.attributes?.POSITION;
      if (Number.isInteger(index)) indices.add(index!);
    }
  }
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let used = 0;
  for (const index of indices) {
    const accessor = document.accessors?.[index];
    if (!accessor || !validVec(accessor.min) || !validVec(accessor.max)) continue;
    used += 1;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], accessor.min![axis]);
      max[axis] = Math.max(max[axis], accessor.max![axis]);
    }
  }
  if (!used || !validVec(min) || !validVec(max)) return null;
  const center: Vec3 = [(min[0] + max[0]) * 0.5, (min[1] + max[1]) * 0.5, (min[2] + max[2]) * 0.5];
  const halfSize: Vec3 = [(max[0] - min[0]) * 0.5, (max[1] - min[1]) * 0.5, (max[2] - min[2]) * 0.5];
  return { min, max, center, halfSize, radius: Math.hypot(...halfSize), positionAccessors: used };
}

function validVec(value: number[] | Vec3 | undefined): value is Vec3 {
  return Boolean(value && value.length >= 3 && value.slice(0, 3).every(Number.isFinite));
}
