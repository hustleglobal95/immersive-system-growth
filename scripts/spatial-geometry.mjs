import fs from "node:fs";
import path from "node:path";
import { extractGlbSpatialBounds } from "../src/platform/glbSpatialBounds.ts";
import { spatialRoleForAsset } from "../src/lib/spatialCamera.ts";

const BLOCKER_TERMS = [
  "wall", "column", "pillar", "partition", "bench", "plinth", "counter", "table", "desk",
  "stair", "railing", "barrier", "front-left", "front-right", "cabinet", "island", "shelf",
];
const NON_BLOCKER_TERMS = ["floor", "roof", "ceiling", "door", "gate", "window", "glass", "curtain"];

export function collectGeometryBounds(config) {
  const bounds = [];
  const hero = config.heroModel ? readGlbBounds(config.heroModel) : null;
  if (hero) {
    bounds.push({ id: "hero", min: hero.min, max: hero.max, role: "subject", source: "geometry" });
    for (const node of hero.nodes) {
      bounds.push({
        id: `subject:hero:${slug(node.name)}-${node.index}`,
        min: node.min,
        max: node.max,
        role: "subject",
        source: "geometry",
      });
    }
  }

  for (const asset of config.assets) {
    if (asset.kind !== "model") continue;
    const local = readGlbBounds(asset.url);
    if (!local) continue;
    const role = spatialRoleForAsset(asset);
    const root = transformBounds(local.min, local.max, asset.position, asset.rotation, asset.scale);
    bounds.push({ id: `asset:${asset.id}`, min: root.min, max: root.max, role, source: "geometry" });

    if (role !== "set") continue;
    for (const node of local.nodes) {
      if (!isStructuralBlocker(node)) continue;
      const world = transformBounds(node.min, node.max, asset.position, asset.rotation, asset.scale);
      bounds.push({
        id: `set:${asset.id}:${slug(node.name)}-${node.index}`,
        min: world.min,
        max: world.max,
        role: "obstacle",
        source: "geometry",
      });
    }
  }
  return bounds;
}

export function readGlbBounds(url) {
  if (!url.startsWith("/") || !url.toLowerCase().endsWith(".glb")) return null;
  const candidates = [path.join(process.cwd(), "public", url), path.join(process.cwd(), url)];
  const filename = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filename) return null;
  const bytes = fs.readFileSync(filename);
  return extractGlbSpatialBounds(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

export function transformBounds(min, max, position, rotation, scale) {
  const outMin = [Infinity, Infinity, Infinity];
  const outMax = [-Infinity, -Infinity, -Infinity];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const rotated = rotateXYZ([x * scale, y * scale, z * scale], rotation);
    const point = [rotated[0] + position[0], rotated[1] + position[1], rotated[2] + position[2]];
    for (let axis = 0; axis < 3; axis += 1) {
      outMin[axis] = Math.min(outMin[axis], point[axis]);
      outMax[axis] = Math.max(outMax[axis], point[axis]);
    }
  }
  return { min: outMin, max: outMax };
}

function isStructuralBlocker(node) {
  const name = node.name.toLowerCase();
  if (node.animated || NON_BLOCKER_TERMS.some((term) => name.includes(term))) return false;
  return BLOCKER_TERMS.some((term) => name.includes(term));
}

function rotateXYZ(point, rotation) {
  const [rx, ry, rz] = rotation;
  let [x, y, z] = point;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  const cy = Math.cos(ry), sy = Math.sin(ry);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const cz = Math.cos(rz), sz = Math.sin(rz);
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  return [x, y, z];
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "node";
}
