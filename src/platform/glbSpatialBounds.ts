import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import type { Vec3 } from "@/src/types/experience";

export interface GlbSpatialNodeBound {
  index: number;
  name: string;
  min: Vec3;
  max: Vec3;
  center: Vec3;
  halfSize: Vec3;
  radius: number;
  animated: boolean;
}

export interface GlbSpatialBounds {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  halfSize: Vec3;
  radius: number;
  positionAccessors: number;
  nodes: GlbSpatialNodeBound[];
}

interface GltfPrimitive { attributes?: { POSITION?: number } }
interface GltfMesh { primitives?: GltfPrimitive[] }
interface GltfNode {
  name?: string;
  mesh?: number;
  children?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  matrix?: number[];
}
interface GltfAnimation { channels?: Array<{ target?: { node?: number } }> }
interface GltfJson {
  meshes?: GltfMesh[];
  nodes?: GltfNode[];
  accessors?: Array<{ min?: number[]; max?: number[] }>;
  animations?: GltfAnimation[];
}

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;

export function extractGlbSpatialBounds(input: ArrayBuffer): GlbSpatialBounds | null {
  const document = readGlbJson(input);
  if (!document) return null;

  const usedAccessors = new Set<number>();
  const meshBounds = (document.meshes ?? []).map((mesh) => {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    let used = 0;
    for (const primitive of mesh.primitives ?? []) {
      const index = primitive.attributes?.POSITION;
      if (!Number.isInteger(index)) continue;
      const accessor = document.accessors?.[index!];
      if (!accessor || !validVec(accessor.min) || !validVec(accessor.max)) continue;
      usedAccessors.add(index!);
      used += 1;
      unionMinMax(min, max, accessor.min, accessor.max);
    }
    return used ? { min, max } : null;
  });

  const rawNodes = document.nodes ?? [];
  const parents = new Map<number, number>();
  rawNodes.forEach((node, parent) => node.children?.forEach((child) => {
    if (Number.isInteger(child) && !parents.has(child)) parents.set(child, parent);
  }));
  const animatedNodes = new Set<number>();
  for (const animation of document.animations ?? []) {
    for (const channel of animation.channels ?? []) {
      const node = channel.target?.node;
      if (Number.isInteger(node)) animatedNodes.add(node!);
    }
  }

  const worldMatrices = new Map<number, Matrix4>();
  const resolving = new Set<number>();
  const resolveWorld = (index: number): Matrix4 => {
    const cached = worldMatrices.get(index);
    if (cached) return cached;
    if (resolving.has(index)) return new Matrix4();
    resolving.add(index);
    const local = localMatrix(rawNodes[index]);
    const parent = parents.get(index);
    const world = parent === undefined ? local : resolveWorld(parent).clone().multiply(local);
    resolving.delete(index);
    worldMatrices.set(index, world);
    return world;
  };

  const nodes: GlbSpatialNodeBound[] = [];
  rawNodes.forEach((node, index) => {
    if (!Number.isInteger(node.mesh)) return;
    const local = meshBounds[node.mesh!];
    if (!local) return;
    const transformed = transformMinMax(local.min, local.max, resolveWorld(index));
    nodes.push({
      index,
      name: node.name?.trim() || `node-${index}`,
      ...describeMinMax(transformed.min, transformed.max),
      animated: animatedNodes.has(index),
    });
  });

  if (!nodes.length) {
    const fallback = meshBounds.filter((bound): bound is { min: Vec3; max: Vec3 } => Boolean(bound));
    if (!fallback.length) return null;
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    fallback.forEach((bound) => unionMinMax(min, max, bound.min, bound.max));
    return { ...describeMinMax(min, max), positionAccessors: usedAccessors.size, nodes: [] };
  }

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  nodes.forEach((node) => unionMinMax(min, max, node.min, node.max));
  return { ...describeMinMax(min, max), positionAccessors: usedAccessors.size, nodes };
}

function readGlbJson(input: ArrayBuffer): GltfJson | null {
  if (input.byteLength < 20) return null;
  const view = new DataView(input);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) return null;
  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== input.byteLength) return null;
  let offset = 12;
  while (offset + 8 <= input.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > input.byteLength) return null;
    if (type === JSON_CHUNK) {
      const text = new TextDecoder().decode(new Uint8Array(input, start, length)).replace(/[\u0000\s]+$/g, "");
      return JSON.parse(text) as GltfJson;
    }
    offset = end;
  }
  return null;
}

function localMatrix(node: GltfNode | undefined) {
  if (!node) return new Matrix4();
  if (node.matrix?.length === 16 && node.matrix.every(Number.isFinite)) return new Matrix4().fromArray(node.matrix);
  const translation = validVec(node.translation) ? node.translation : [0, 0, 0];
  const scale = validVec(node.scale) ? node.scale : [1, 1, 1];
  const rotation = node.rotation?.length === 4 && node.rotation.every(Number.isFinite) ? node.rotation : [0, 0, 0, 1];
  return new Matrix4().compose(
    new Vector3(translation[0], translation[1], translation[2]),
    new Quaternion(rotation[0], rotation[1], rotation[2], rotation[3]),
    new Vector3(scale[0], scale[1], scale[2]),
  );
}

function transformMinMax(min: Vec3, max: Vec3, matrix: Matrix4) {
  const box = new Box3();
  box.makeEmpty();
  const point = new Vector3();
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    point.set(x, y, z).applyMatrix4(matrix);
    box.expandByPoint(point);
  }
  return { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 };
}

function describeMinMax(min: Vec3, max: Vec3) {
  const center: Vec3 = [(min[0] + max[0]) * 0.5, (min[1] + max[1]) * 0.5, (min[2] + max[2]) * 0.5];
  const halfSize: Vec3 = [(max[0] - min[0]) * 0.5, (max[1] - min[1]) * 0.5, (max[2] - min[2]) * 0.5];
  return { min: [...min] as Vec3, max: [...max] as Vec3, center, halfSize, radius: Math.hypot(...halfSize) };
}

function unionMinMax(targetMin: Vec3, targetMax: Vec3, min: Vec3, max: Vec3) {
  for (let axis = 0; axis < 3; axis += 1) {
    targetMin[axis] = Math.min(targetMin[axis], min[axis]);
    targetMax[axis] = Math.max(targetMax[axis], max[axis]);
  }
}

function validVec(value: number[] | Vec3 | undefined): value is Vec3 {
  return Boolean(value && value.length >= 3 && value.slice(0, 3).every(Number.isFinite));
}
