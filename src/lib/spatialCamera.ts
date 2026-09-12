import { sampleMotionTrack } from "@/src/lib/motionSequencer";
import type { ExperienceConfig, MotionTrack, SceneAsset, SceneDefinition, Vec3 } from "@/src/types/experience";

export type SpatialRole = "subject" | "obstacle" | "set";
export type SpatialSource = "live" | "geometry" | "proxy";

export interface SpatialBound {
  id: string;
  center: Vec3;
  halfSize: Vec3;
  role: SpatialRole;
  source: SpatialSource;
}

export interface SpatialSubject {
  id: string;
  fromCenter: Vec3;
  toCenter: Vec3;
  fromCollisionRadius: number;
  toCollisionRadius: number;
  fromFramingRadius: number;
  toFramingRadius: number;
  fromCollisionHalfSize?: Vec3;
  toCollisionHalfSize?: Vec3;
  collidable: boolean;
  source: SpatialSource;
}

export interface SpatialScene {
  sceneId: string;
  subject: SpatialSubject;
  subjectParts: SpatialBound[];
  obstacles: SpatialBound[];
  sets: SpatialBound[];
  floorY: number;
  desiredClearance: number;
}

export interface SpatialCameraEvaluation {
  score: number;
  hardInvalid: boolean;
  minClearance: number;
  collisionSamples: number;
  occlusionSamples: number;
  framingViolations: number;
  floorViolations: number;
  maxTurnDegrees: number;
  averageSubjectFill: number;
  pathLength: number;
  samples: number;
}

export interface SpatialRepairResult {
  tracks: MotionTrack[];
  evaluation: SpatialCameraEvaluation;
  reroutes: number;
}

export interface LiveSpatialBoundInput {
  id: string;
  min: Vec3;
  max: Vec3;
  role: SpatialRole;
  source?: SpatialSource;
}

const SET_TERMS = [
  "pavilion", "building", "architecture", "architectural", "house", "home", "property",
  "interior", "room", "apartment", "venue", "restaurant", "office", "store", "stage",
  "environment", "world", "landscape", "showroom", "gallery", "lobby", "cabin-space",
];

export function spatialRoleForAsset(asset: SceneAsset): SpatialRole {
  if (asset.kind === "environment" || asset.kind === "panorama") return "set";
  const semantic = `${asset.id} ${asset.url}`.toLowerCase();
  return SET_TERMS.some((term) => semantic.includes(term)) ? "set" : "obstacle";
}

export function buildSpatialScene(
  config: ExperienceConfig,
  sceneIndex: number,
  liveBounds: LiveSpatialBoundInput[] = [],
): SpatialScene {
  const scene = config.scenes[sceneIndex];
  if (!scene) throw new RangeError(`Unknown scene index ${sceneIndex}`);
  const live = new Map(liveBounds.map((bound) => [bound.id, normalizeLiveBound(bound)]));
  const activeAssets = config.assets.filter((asset) => !asset.scenes || asset.scenes.includes(scene.id));
  const setAssets = activeAssets.filter((asset) => spatialRoleForAsset(asset) === "set");
  const navigableSet = !config.heroVisible
    ? setAssets.find((asset) => asset.kind === "model")
    : undefined;
  const fallbackSubjectAsset = !config.heroVisible && !navigableSet
    ? activeAssets.find((asset) => asset.kind === "model")
    : undefined;
  const subjectParts = config.heroVisible
    ? [...live.values()].filter((bound) => bound.role === "subject" && bound.id.startsWith("subject:hero:"))
    : [];

  const setRoot = navigableSet ? boundForAsset(navigableSet, live) : undefined;
  const baseSubject = config.heroVisible
    ? subjectFromHero(config, sceneIndex, live.get("hero"))
    : navigableSet
      ? subjectFromNavigableSet(scene, setRoot?.source ?? "proxy")
      : fallbackSubjectAsset
        ? subjectFromAsset(fallbackSubjectAsset, live, scene)
        : subjectFromFocus(scene, "proxy");
  const subject = subjectParts.length ? { ...baseSubject, collidable: false } : baseSubject;

  const ordinaryObstacles = activeAssets
    .filter((asset) => asset.kind !== "environment" && asset.kind !== "panorama")
    .filter((asset) => asset.id !== navigableSet?.id && asset.id !== fallbackSubjectAsset?.id)
    .map((asset) => boundForAsset(asset, live))
    .filter((bound) => bound.role === "obstacle");

  const consumedIds = new Set<string>([
    "hero",
    ...activeAssets.flatMap((asset) => [asset.id, `asset:${asset.id}`]),
  ]);
  const auxiliaryObstacles = [...live.values()]
    .filter((bound) => bound.role === "obstacle" && !consumedIds.has(bound.id))
    .filter((bound) => auxiliaryBoundApplies(bound.id, activeAssets));
  const obstacles = dedupeBounds([...ordinaryObstacles, ...auxiliaryObstacles]);
  const sets = dedupeBounds([
    ...setAssets.map((asset) => boundForAsset(asset, live)),
    ...[...live.values()].filter((bound) => bound.role === "set" && !consumedIds.has(bound.id)),
  ]);

  const physicalRadius = Math.max(
    0.18,
    Math.min(
      subject.fromCollisionRadius || subject.fromFramingRadius,
      subject.toCollisionRadius || subject.toFramingRadius,
    ),
  );
  return {
    sceneId: scene.id,
    subject,
    subjectParts,
    obstacles,
    sets,
    floorY: -1.25,
    desiredClearance: Math.max(0.14, Math.min(0.45, physicalRadius * 0.12)),
  };
}

export function evaluateSpatialCameraTracks(
  tracks: MotionTrack[],
  spatial: SpatialScene,
  viewport: "desktop" | "mobile" = "desktop",
  samples = 64,
): SpatialCameraEvaluation {
  const positionTrack = cameraTrack(tracks, "camera.position", viewport);
  const targetTrack = cameraTrack(tracks, "camera.target", viewport);
  const fovTrack = cameraTrack(tracks, "camera.fov", viewport);
  if (!positionTrack || !targetTrack || !fovTrack) return invalidEvaluation(samples);
  let collisionSamples = 0;
  let occlusionSamples = 0;
  let framingViolations = 0;
  let floorViolations = 0;
  let minClearance = 1000;
  let fillTotal = 0;
  let pathLength = 0;
  let maxTurnDegrees = 0;
  let previous: Vec3 | null = null;
  let previousDirection: Vec3 | null = null;

  for (let index = 0; index <= samples; index += 1) {
    const at = index / samples;
    const position = sampleMotionTrack(positionTrack, at) as Vec3;
    const target = sampleMotionTrack(targetTrack, at) as Vec3;
    const fov = sampleMotionTrack(fovTrack, at) as number;
    if (!finiteVec(position) || !finiteVec(target) || !Number.isFinite(fov)) return invalidEvaluation(samples);
    const subjectCenter = lerpVec(spatial.subject.fromCenter, spatial.subject.toCenter, at);
    const collisionRadius = lerp(spatial.subject.fromCollisionRadius, spatial.subject.toCollisionRadius, at);
    const framingRadius = lerp(spatial.subject.fromFramingRadius, spatial.subject.toFramingRadius, at);
    let sampleCollision = false;
    let sampleOcclusion = false;

    if (spatial.subject.collidable) {
      const subjectClearance = subjectClearanceAt(position, subjectCenter, collisionRadius, spatial.subject, at);
      minClearance = Math.min(minClearance, subjectClearance);
      if (subjectClearance < spatial.desiredClearance) sampleCollision = true;
    }
    for (const part of spatial.subjectParts) {
      const clearance = pointAabbClearance(position, part);
      minClearance = Math.min(minClearance, clearance);
      if (clearance < spatial.desiredClearance) sampleCollision = true;
    }
    for (const obstacle of spatial.obstacles) {
      const clearance = pointAabbClearance(position, obstacle);
      minClearance = Math.min(minClearance, clearance);
      if (clearance < spatial.desiredClearance) sampleCollision = true;
      if (segmentIntersectsExpandedAabb(position, subjectCenter, obstacle, 0.04)) sampleOcclusion = true;
    }
    if (sampleCollision) collisionSamples += 1;
    if (sampleOcclusion) occlusionSamples += 1;
    if (position[1] < spatial.floorY + 0.08) floorViolations += 1;

    const framing = projectSubject(
      position,
      target,
      fov,
      viewport === "mobile" ? 9 / 16 : 16 / 9,
      subjectCenter,
      framingRadius,
    );
    fillTotal += framing.fill;
    if (!framing.visible || framing.safeZonePenalty > 0 || framing.fill > 0.94 || framing.fill < 0.018) framingViolations += 1;

    if (previous) {
      const step = sub(position, previous);
      pathLength += magnitude(step);
      const direction = normalize(step);
      if (previousDirection && magnitude(direction) > 0 && magnitude(previousDirection) > 0) {
        maxTurnDegrees = Math.max(maxTurnDegrees, angleDegrees(previousDirection, direction));
      }
      if (magnitude(direction) > 0) previousDirection = direction;
    }
    previous = position;
  }

  const denominator = samples + 1;
  const collisionRate = collisionSamples / denominator;
  const occlusionRate = occlusionSamples / denominator;
  const framingRate = framingViolations / denominator;
  const floorRate = floorViolations / denominator;
  const physicalClearance = minClearance === 1000 ? 999 : minClearance;
  const clearancePenalty = physicalClearance < spatial.desiredClearance
    ? Math.min(18, (spatial.desiredClearance - physicalClearance) * 8)
    : 0;
  const turnPenalty = Math.max(0, maxTurnDegrees - 34) * 0.07;
  const score = 8
    - collisionRate * 36
    - occlusionRate * 24
    - framingRate * 14
    - floorRate * 40
    - clearancePenalty
    - turnPenalty;
  const hardInvalid = floorViolations > 0 || collisionRate > 0.08 || occlusionRate > 0.24 || framingRate > 0.4;
  return {
    score,
    hardInvalid,
    minClearance: physicalClearance,
    collisionSamples,
    occlusionSamples,
    framingViolations,
    floorViolations,
    maxTurnDegrees,
    averageSubjectFill: fillTotal / denominator,
    pathLength,
    samples: denominator,
  };
}

export function repairSpatialCameraTracks(
  tracks: MotionTrack[],
  spatial: SpatialScene,
  maxReroutes = 3,
): SpatialRepairResult {
  let current = structuredClone(tracks) as MotionTrack[];
  let reroutes = 0;
  for (const viewport of ["desktop", "mobile"] as const) {
    for (let attempt = 0; attempt < maxReroutes; attempt += 1) {
      const evaluation = evaluateSpatialCameraTracks(current, spatial, viewport, 48);
      if (evaluation.collisionSamples === 0 && evaluation.floorViolations === 0 && evaluation.occlusionSamples === 0) break;
      const issue = firstSpatialIssue(current, spatial, viewport, 48);
      if (!issue) break;
      const index = current.findIndex((track) => track.id === issue.track.id);
      if (index < 0) break;
      current[index] = insertDetour(issue.track, issue.at, issue.offset, attempt + 1);
      reroutes += 1;
    }
  }
  const desktop = evaluateSpatialCameraTracks(current, spatial, "desktop");
  const mobile = evaluateSpatialCameraTracks(current, spatial, "mobile");
  return { tracks: current, evaluation: worseEvaluation(desktop, mobile), reroutes };
}

export function spatialBoundFromMinMax(
  id: string,
  min: Vec3,
  max: Vec3,
  role: SpatialRole = "obstacle",
  source: SpatialSource = "geometry",
): SpatialBound {
  return {
    id,
    center: [(min[0] + max[0]) * 0.5, (min[1] + max[1]) * 0.5, (min[2] + max[2]) * 0.5],
    halfSize: [Math.max(0.001, (max[0] - min[0]) * 0.5), Math.max(0.001, (max[1] - min[1]) * 0.5), Math.max(0.001, (max[2] - min[2]) * 0.5)],
    role,
    source,
  };
}

export function transformSpatialBound(bound: SpatialBound, position: Vec3, scale: number): SpatialBound {
  return {
    ...bound,
    center: [bound.center[0] * scale + position[0], bound.center[1] * scale + position[1], bound.center[2] * scale + position[2]],
    halfSize: [bound.halfSize[0] * scale, bound.halfSize[1] * scale, bound.halfSize[2] * scale],
  };
}

function subjectFromHero(config: ExperienceConfig, sceneIndex: number, exact?: SpatialBound): SpatialSubject {
  const scene = config.scenes[sceneIndex];
  const baseHalfSize = exact?.halfSize ?? [1.05, 1.05, 1.05] as Vec3;
  const liveWorld = exact?.source === "live";
  const fromHalfSize = liveWorld
    ? [...baseHalfSize] as Vec3
    : rotateHalfSize(mulComponents(baseHalfSize, scene.hero.from.scale), scene.hero.from.rotation);
  const toHalfSize = liveWorld
    ? [...baseHalfSize] as Vec3
    : rotateHalfSize(mulComponents(baseHalfSize, scene.hero.to.scale), scene.hero.to.rotation);
  const fromCollisionRadius = Math.max(0.18, Math.min(...fromHalfSize));
  const toCollisionRadius = Math.max(0.18, Math.min(...toHalfSize));
  const fromPhysicalExtent = Math.max(...fromHalfSize);
  const toPhysicalExtent = Math.max(...toHalfSize);
  return {
    id: "hero",
    fromCenter: [...scene.hero.from.position],
    toCenter: [...scene.hero.to.position],
    fromCollisionRadius,
    toCollisionRadius,
    fromFramingRadius: adaptiveFramingRadius(scene.camera.from, fromPhysicalExtent, 0.52),
    toFramingRadius: adaptiveFramingRadius(scene.camera.to, toPhysicalExtent, 0.52),
    fromCollisionHalfSize: fromHalfSize,
    toCollisionHalfSize: toHalfSize,
    collidable: true,
    source: exact?.source ?? "proxy",
  };
}

function subjectFromNavigableSet(scene: SceneDefinition, source: SpatialSource): SpatialSubject {
  return {
    id: "set-focus",
    fromCenter: [...scene.camera.from.target],
    toCenter: [...scene.camera.to.target],
    fromCollisionRadius: 0,
    toCollisionRadius: 0,
    fromFramingRadius: adaptiveFramingRadius(scene.camera.from, 1.35, 0.24),
    toFramingRadius: adaptiveFramingRadius(scene.camera.to, 1.35, 0.24),
    collidable: false,
    source,
  };
}

function subjectFromFocus(scene: SceneDefinition, source: SpatialSource): SpatialSubject {
  return {
    id: "camera-focus",
    fromCenter: [...scene.camera.from.target],
    toCenter: [...scene.camera.to.target],
    fromCollisionRadius: 0,
    toCollisionRadius: 0,
    fromFramingRadius: adaptiveFramingRadius(scene.camera.from, 1, 0.22),
    toFramingRadius: adaptiveFramingRadius(scene.camera.to, 1, 0.22),
    collidable: false,
    source,
  };
}

function subjectFromAsset(asset: SceneAsset, live: Map<string, SpatialBound>, scene: SceneDefinition): SpatialSubject {
  const bound = boundForAsset(asset, live);
  const extent = boundExtent(bound);
  const collisionRadius = Math.max(0.18, Math.min(...bound.halfSize));
  return {
    id: `asset:${asset.id}`,
    fromCenter: [...bound.center],
    toCenter: [...bound.center],
    fromCollisionRadius: collisionRadius,
    toCollisionRadius: collisionRadius,
    fromFramingRadius: adaptiveFramingRadius(scene.camera.from, extent, 0.52),
    toFramingRadius: adaptiveFramingRadius(scene.camera.to, extent, 0.52),
    fromCollisionHalfSize: [...bound.halfSize] as Vec3,
    toCollisionHalfSize: [...bound.halfSize] as Vec3,
    collidable: true,
    source: bound.source,
  };
}

function boundForAsset(asset: SceneAsset, live: Map<string, SpatialBound>): SpatialBound {
  const exact = live.get(`asset:${asset.id}`) ?? live.get(asset.id);
  const role = spatialRoleForAsset(asset);
  if (exact) return { ...exact, id: asset.id, role };
  const halfSize: Vec3 = asset.kind === "model"
    ? [1.1 * asset.scale, 1.1 * asset.scale, 1.1 * asset.scale]
    : [1.55 * asset.scale, 0.9 * asset.scale, 0.08 * asset.scale];
  return { id: asset.id, center: [...asset.position] as Vec3, halfSize, role, source: "proxy" };
}

function firstSpatialIssue(
  tracks: MotionTrack[],
  spatial: SpatialScene,
  viewport: "desktop" | "mobile",
  samples: number,
): { track: Extract<MotionTrack, { type: "vector" }>; at: number; offset: Vec3 } | null {
  const positionTrack = cameraTrack(tracks, "camera.position", viewport);
  const targetTrack = cameraTrack(tracks, "camera.target", viewport);
  if (!positionTrack || positionTrack.type !== "vector" || !targetTrack) return null;
  for (let index = 1; index < samples; index += 1) {
    const at = index / samples;
    const position = sampleMotionTrack(positionTrack, at) as Vec3;
    const target = sampleMotionTrack(targetTrack, at) as Vec3;
    const subjectCenter = lerpVec(spatial.subject.fromCenter, spatial.subject.toCenter, at);
    const subjectRadius = lerp(spatial.subject.fromCollisionRadius, spatial.subject.toCollisionRadius, at);
    if (spatial.subject.collidable && subjectClearanceAt(position, subjectCenter, subjectRadius, spatial.subject, at) < spatial.desiredClearance) {
      const halfSize = lerpOptionalHalfSize(spatial.subject.fromCollisionHalfSize, spatial.subject.toCollisionHalfSize, at)
        ?? [subjectRadius, subjectRadius, subjectRadius];
      return { track: positionTrack, at, offset: bestDetourOffset(position, target, subjectCenter, halfSize, spatial) };
    }
    for (const part of spatial.subjectParts) {
      if (pointAabbClearance(position, part) < spatial.desiredClearance) {
        return { track: positionTrack, at, offset: bestDetourOffset(position, target, part.center, part.halfSize, spatial) };
      }
    }
    if (position[1] < spatial.floorY + 0.08) {
      return { track: positionTrack, at, offset: [0, spatial.floorY + spatial.desiredClearance + 0.2 - position[1], 0] };
    }
    for (const obstacle of spatial.obstacles) {
      if (pointAabbClearance(position, obstacle) < spatial.desiredClearance) {
        return { track: positionTrack, at, offset: bestDetourOffset(position, target, obstacle.center, obstacle.halfSize, spatial) };
      }
    }
    for (const obstacle of spatial.obstacles) {
      if (segmentIntersectsExpandedAabb(position, subjectCenter, obstacle, 0.04)) {
        return { track: positionTrack, at, offset: bestDetourOffset(position, target, obstacle.center, obstacle.halfSize, spatial) };
      }
    }
  }
  return null;
}

function bestDetourOffset(
  position: Vec3,
  target: Vec3,
  center: Vec3,
  halfSize: Vec3,
  spatial: SpatialScene,
): Vec3 {
  const forward = normalize(sub(target, position));
  let right = normalize(cross(forward, [0, 1, 0]));
  if (magnitude(right) < 0.001) right = [1, 0, 0];
  const up: Vec3 = [0, 1, 0];
  const radius = Math.max(...halfSize) + spatial.desiredClearance + 0.35;
  const away = normalize(sub(position, center));
  const candidates: Vec3[] = [
    mul(right, radius), mul(right, -radius), mul(up, radius),
    add(mul(right, radius * 0.7), mul(up, radius * 0.7)),
    add(mul(right, -radius * 0.7), mul(up, radius * 0.7)),
    mul(away, radius),
  ];
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const offset of candidates) {
    const point = add(position, offset);
    let clearance = 999;
    if (spatial.subject.collidable) {
      const subjectCenter = lerpVec(spatial.subject.fromCenter, spatial.subject.toCenter, 0.5);
      const subjectRadius = Math.max(spatial.subject.fromCollisionRadius, spatial.subject.toCollisionRadius);
      clearance = subjectClearanceAt(point, subjectCenter, subjectRadius, spatial.subject, 0.5);
    }
    for (const part of spatial.subjectParts) clearance = Math.min(clearance, pointAabbClearance(point, part));
    for (const obstacle of spatial.obstacles) clearance = Math.min(clearance, pointAabbClearance(point, obstacle));
    const floor = point[1] - spatial.floorY;
    const score = Math.min(clearance, floor) - magnitude(offset) * 0.08 + offset[1] * 0.05;
    if (score > bestScore) { best = offset; bestScore = score; }
  }
  return best;
}

function insertDetour(
  track: Extract<MotionTrack, { type: "vector" }>,
  at: number,
  offset: Vec3,
  attempt: number,
): Extract<MotionTrack, { type: "vector" }> {
  const beforeAt = clamp(at - 0.075, 0.03, 0.94);
  const afterAt = clamp(at + 0.075, 0.06, 0.97);
  const additions = [
    { id: `${track.id}-avoid-${attempt}-a`, at: beforeAt, value: sampleMotionTrack(track, beforeAt) as Vec3, easing: "smooth" as const },
    { id: `${track.id}-avoid-${attempt}-b`, at, value: add(sampleMotionTrack(track, at) as Vec3, offset), easing: "smooth" as const },
    { id: `${track.id}-avoid-${attempt}-c`, at: afterAt, value: sampleMotionTrack(track, afterAt) as Vec3, easing: "smooth" as const },
  ];
  const occupied = new Set(track.keyframes.map((key) => key.at.toFixed(5)));
  const keyframes = [...track.keyframes, ...additions.filter((key) => !occupied.has(key.at.toFixed(5)))]
    .sort((a, b) => a.at - b.at)
    .filter((key, index, all) => index === 0 || Math.abs(key.at - all[index - 1].at) > 0.00001);
  return { ...track, keyframes };
}

function cameraTrack(
  tracks: MotionTrack[],
  target: "camera.position" | "camera.target" | "camera.fov",
  viewport: "desktop" | "mobile",
) {
  return tracks.find((track) => track.target === target && track.viewport === viewport)
    ?? tracks.find((track) => track.target === target && track.viewport === "all");
}

function subjectClearanceAt(
  point: Vec3,
  center: Vec3,
  radius: number,
  subject: SpatialSubject,
  at: number,
) {
  const halfSize = lerpOptionalHalfSize(subject.fromCollisionHalfSize, subject.toCollisionHalfSize, at);
  if (!halfSize) return distance(point, center) - radius;
  return pointAabbClearance(point, { id: subject.id, center, halfSize, role: "subject", source: subject.source });
}

function pointAabbClearance(point: Vec3, bound: SpatialBound) {
  const q: Vec3 = [
    Math.abs(point[0] - bound.center[0]) - bound.halfSize[0],
    Math.abs(point[1] - bound.center[1]) - bound.halfSize[1],
    Math.abs(point[2] - bound.center[2]) - bound.halfSize[2],
  ];
  const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  const inside = Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0);
  return outside + inside;
}

function segmentIntersectsExpandedAabb(from: Vec3, to: Vec3, bound: SpatialBound, expand: number) {
  const min: Vec3 = [bound.center[0] - bound.halfSize[0] - expand, bound.center[1] - bound.halfSize[1] - expand, bound.center[2] - bound.halfSize[2] - expand];
  const max: Vec3 = [bound.center[0] + bound.halfSize[0] + expand, bound.center[1] + bound.halfSize[1] + expand, bound.center[2] + bound.halfSize[2] + expand];
  const direction = sub(to, from);
  let tMin = 0;
  let tMax = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(direction[axis]) < 1e-8) {
      if (from[axis] < min[axis] || from[axis] > max[axis]) return false;
      continue;
    }
    const inverse = 1 / direction[axis];
    let a = (min[axis] - from[axis]) * inverse;
    let b = (max[axis] - from[axis]) * inverse;
    if (a > b) [a, b] = [b, a];
    tMin = Math.max(tMin, a);
    tMax = Math.min(tMax, b);
    if (tMin > tMax) return false;
  }
  return tMax > 0.02 && tMin < 0.98;
}

function projectSubject(position: Vec3, target: Vec3, fov: number, aspect: number, subject: Vec3, radius: number) {
  const forward = normalize(sub(target, position));
  let right = normalize(cross(forward, [0, 1, 0]));
  if (magnitude(right) < 0.001) right = [1, 0, 0];
  const up = normalize(cross(right, forward));
  const relative = sub(subject, position);
  const depth = dot(relative, forward);
  if (depth <= 0.01) return { visible: false, fill: 2, safeZonePenalty: 2 };
  const tanY = Math.tan(fov * Math.PI / 360);
  const ndcX = dot(relative, right) / (depth * tanY * aspect);
  const ndcY = dot(relative, up) / (depth * tanY);
  const fill = radius / Math.max(0.001, depth * tanY);
  const xLimit = Math.max(0.2, 0.88 - fill * 0.42);
  const yLimit = Math.max(0.2, 0.82 - fill * 0.42);
  const safeZonePenalty = Math.max(0, Math.abs(ndcX) - xLimit) + Math.max(0, Math.abs(ndcY) - yLimit);
  return { visible: Math.abs(ndcX) <= 1 + fill && Math.abs(ndcY) <= 1 + fill, fill, safeZonePenalty };
}

function adaptiveFramingRadius(
  camera: { position: Vec3; target: Vec3; fov: number },
  physicalExtent: number,
  desiredFill: number,
) {
  const distanceToFocus = Math.max(0.05, distance(camera.position, camera.target));
  const visibleHalfHeight = distanceToFocus * Math.tan(camera.fov * Math.PI / 360);
  return clamp(visibleHalfHeight * desiredFill, 0.14, Math.max(0.16, physicalExtent * 0.92));
}

function rotateHalfSize(halfSize: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  const m00 = cz * cy;
  const m01 = cz * sy * sx - sz * cx;
  const m02 = cz * sy * cx + sz * sx;
  const m10 = sz * cy;
  const m11 = sz * sy * sx + cz * cx;
  const m12 = sz * sy * cx - cz * sx;
  const m20 = -sy;
  const m21 = cy * sx;
  const m22 = cy * cx;
  return [
    Math.abs(m00) * halfSize[0] + Math.abs(m01) * halfSize[1] + Math.abs(m02) * halfSize[2],
    Math.abs(m10) * halfSize[0] + Math.abs(m11) * halfSize[1] + Math.abs(m12) * halfSize[2],
    Math.abs(m20) * halfSize[0] + Math.abs(m21) * halfSize[1] + Math.abs(m22) * halfSize[2],
  ];
}

function lerpOptionalHalfSize(from: Vec3 | undefined, to: Vec3 | undefined, at: number): Vec3 | undefined {
  if (!from || !to) return undefined;
  return lerpVec(from, to, at);
}

function auxiliaryBoundApplies(id: string, activeAssets: SceneAsset[]) {
  if (!id.startsWith("set:")) return true;
  const assetId = id.split(":")[1];
  return activeAssets.some((asset) => asset.id === assetId);
}

function dedupeBounds(bounds: SpatialBound[]) {
  return [...new Map(bounds.map((bound) => [bound.id, bound])).values()];
}

function worseEvaluation(a: SpatialCameraEvaluation, b: SpatialCameraEvaluation): SpatialCameraEvaluation {
  if (a.hardInvalid !== b.hardInvalid) return a.hardInvalid ? a : b;
  return a.score <= b.score ? a : b;
}

function invalidEvaluation(samples: number): SpatialCameraEvaluation {
  return { score: -1000, hardInvalid: true, minClearance: -1, collisionSamples: samples, occlusionSamples: samples, framingViolations: samples, floorViolations: samples, maxTurnDegrees: 180, averageSubjectFill: 0, pathLength: 0, samples };
}

function normalizeLiveBound(bound: LiveSpatialBoundInput): SpatialBound {
  return spatialBoundFromMinMax(bound.id, bound.min, bound.max, bound.role, bound.source ?? "live");
}

function boundExtent(bound: SpatialBound) { return Math.max(...bound.halfSize); }
function finiteVec(value: Vec3) { return value.every(Number.isFinite); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a: Vec3, scalar: number): Vec3 { return [a[0] * scalar, a[1] * scalar, a[2] * scalar]; }
function mulComponents(a: Vec3, scalar: number): Vec3 { return [a[0] * scalar, a[1] * scalar, a[2] * scalar]; }
function dot(a: Vec3, b: Vec3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a: Vec3, b: Vec3): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function magnitude(a: Vec3) { return Math.hypot(...a); }
function normalize(a: Vec3): Vec3 { const length = magnitude(a); return length > 1e-8 ? mul(a, 1 / length) : [0, 0, 0]; }
function distance(a: Vec3, b: Vec3) { return magnitude(sub(a, b)); }
function angleDegrees(a: Vec3, b: Vec3) { return Math.acos(clamp(dot(normalize(a), normalize(b)), -1, 1)) * 180 / Math.PI; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
