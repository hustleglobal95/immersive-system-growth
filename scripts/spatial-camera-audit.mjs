import fs from "node:fs";
import path from "node:path";
import { parseExperience } from "../src/lib/configSchema.ts";
import { extractGlbSpatialBounds } from "../src/platform/glbSpatialBounds.ts";
import { directCamera } from "../src/platform/cameraDirector.ts";

const files = ["config/experience.json", ...fs.readdirSync("recipes").filter((name) => name.endsWith(".json")).map((name) => `recipes/${name}`)];
let errors = 0;
let warnings = 0;
let scenes = 0;
let rejectedCandidates = 0;
let reroutes = 0;

for (const filename of files) {
  const config = parseExperience(JSON.parse(fs.readFileSync(filename, "utf8")));
  const geometryBounds = collectGeometryBounds(config);
  for (let sceneIndex = 0; sceneIndex < config.scenes.length; sceneIndex += 1) {
    scenes += 1;
    const plan = directCamera(config, sceneIndex, { liveBounds: geometryBounds });
    const spatial = plan.spatial.evaluation;
    rejectedCandidates += plan.spatial.rejectedCandidates;
    reroutes += plan.spatial.reroutes;
    if (spatial.hardInvalid) {
      errors += 1;
      console.error(`ERROR ${filename} / ${plan.sceneId}: selected ${plan.shotLabel} remains spatially invalid after ${plan.spatial.reroutes} reroutes. collisions=${spatial.collisionSamples}, occlusion=${spatial.occlusionSamples}, framing=${spatial.framingViolations}, floor=${spatial.floorViolations}`);
      continue;
    }
    if (spatial.occlusionSamples > 0 || spatial.framingViolations > 0 || spatial.minClearance < 0.2) {
      warnings += 1;
      console.warn(`WARN ${filename} / ${plan.sceneId}: ${plan.shotLabel}; clearance=${spatial.minClearance.toFixed(2)}, occlusion=${spatial.occlusionSamples}/${spatial.samples}, framing=${spatial.framingViolations}/${spatial.samples}`);
    }
  }
}

console.log(`Spatial camera audit: ${errors} errors, ${warnings} warnings across ${scenes} directed scenes; ${rejectedCandidates} unsafe candidate shots rejected, ${reroutes} path reroutes authored.`);
if (errors) process.exitCode = 1;

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
  return extractGlbSpatialBounds(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
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
