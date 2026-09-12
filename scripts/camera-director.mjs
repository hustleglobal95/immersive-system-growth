import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { extractGlbSpatialBounds } from "../src/platform/glbSpatialBounds.ts";
import { applyCameraDirector, directCamera } from "../src/platform/cameraDirector.ts";

const args = process.argv.slice(2);
const file = valueAfter("--file") ?? "config/experience.json";
const write = args.includes("--write");
const all = args.includes("--all");
const sceneArg = valueAfter("--scene");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
let config = parseExperience(source);
const geometryBounds = collectGeometryBounds(config);

const indexes = all
  ? config.scenes.map((_, index) => index)
  : [resolveSceneIndex(config, sceneArg)];

const plans = indexes.map((sceneIndex) => directCamera(config, sceneIndex, { liveBounds: geometryBounds }));
for (const plan of plans) {
  const spatial = plan.spatial.evaluation;
  console.log([
    plan.sceneId,
    plan.intent,
    plan.shotLabel,
    `${Math.round(plan.confidence * 100)}%`,
    `bounds:${plan.spatial.boundsSource}`,
    `clearance:${spatial.minClearance.toFixed(2)}`,
    `occlusion:${spatial.occlusionSamples}/${spatial.samples}`,
    `framing:${spatial.framingViolations}/${spatial.samples}`,
    `reroutes:${plan.spatial.reroutes}`,
    `rejected:${plan.spatial.rejectedCandidates}`,
    plan.rationale,
  ].join(" | "));
}

if (write) {
  for (const sceneIndex of indexes) config = applyCameraDirector(config, sceneIndex, { liveBounds: geometryBounds }).experience;
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  console.log(`Camera Director authored ${indexes.length} scene${indexes.length === 1 ? "" : "s"} in ${file}.`);
} else {
  console.log(`Dry run only. Loaded ${geometryBounds.length} geometry bound${geometryBounds.length === 1 ? "" : "s"}. Add --write to replace camera motion tracks with the selected spatially validated choreography.`);
}

function collectGeometryBounds(config) {
  const bounds = [];
  const heroBounds = config.heroModel ? readGlbBounds(config.heroModel) : null;
  if (heroBounds) bounds.push({ id: "hero", min: heroBounds.min, max: heroBounds.max, role: "subject", source: "geometry" });
  for (const asset of config.assets) {
    if (asset.kind !== "model") continue;
    const local = readGlbBounds(asset.url);
    if (!local) continue;
    const world = transformBounds(local.min, local.max, asset.position, asset.rotation, asset.scale);
    bounds.push({ id: `asset:${asset.id}`, min: world.min, max: world.max, role: "obstacle", source: "geometry" });
  }
  return bounds;
}

function readGlbBounds(url) {
  if (!url.startsWith("/") || !url.toLowerCase().endsWith(".glb")) return null;
  const candidates = [path.join(process.cwd(), "public", url), path.join(process.cwd(), url)];
  const filename = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filename) return null;
  const bytes = fs.readFileSync(filename);
  const array = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return extractGlbSpatialBounds(array);
}

function transformBounds(min, max, position, rotation, scale) {
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

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function resolveSceneIndex(config, value) {
  if (value === undefined) return 0;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric < config.scenes.length) return numeric;
  const index = config.scenes.findIndex((scene) => scene.id === value);
  if (index >= 0) return index;
  throw new RangeError(`Unknown scene ${value}`);
}
