import { sampleMotionTrack } from "@/src/lib/motionSequencer";
import {
  buildSpatialScene,
  repairSpatialCameraTracks,
  type LiveSpatialBoundInput,
  type SpatialCameraEvaluation,
  type SpatialScene,
} from "@/src/lib/spatialCamera";
import {
  repairSpatialCameraTracksWithPlanner,
  type SpatialPlannerStats,
} from "@/src/lib/spatialPathPlanner";
import { cameraChoreographyCatalog, createCameraChoreography, type CameraChoreographyName } from "@/src/platform/cameraChoreography";
import type { ExperienceConfig, MotionTrack, SceneDefinition, Vec3 } from "@/src/types/experience";

export type CameraIntent = "reveal" | "inspect" | "enter" | "environment" | "showcase" | "journey" | "convert";

export interface CameraDirectorMetrics {
  travel: number;
  focusFrom: number;
  focusTo: number;
  approach: number;
  lateral: number;
  vertical: number;
  heroTravel: number;
  heroRotation: number;
  heroScaleDelta: number;
  activeAssets: number;
  assetSpread: number;
  hotspots: number;
  blocks: number;
  hasMedia: boolean;
}

export interface CameraDirectorOptions {
  liveBounds?: LiveSpatialBoundInput[];
  spatialScene?: SpatialScene;
}

export interface CameraDirectorAlternative {
  shot: CameraChoreographyName;
  shotLabel: string;
  score: number;
  semanticScore: number;
  spatialScore: number;
  continuityPenalty: number;
  hardInvalid: boolean;
  reroutes: number;
  planner: SpatialPlannerStats;
}

export interface CameraDirectorSpatialPlan {
  evaluation: SpatialCameraEvaluation;
  reroutes: number;
  continuityPenalty: number;
  boundsSource: "live" | "mixed" | "proxy";
  rejectedCandidates: number;
  planner: SpatialPlannerStats;
}

export interface CameraDirectorPlan {
  sceneId: string;
  intent: CameraIntent;
  shot: CameraChoreographyName;
  shotLabel: string;
  confidence: number;
  rationale: string;
  metrics: CameraDirectorMetrics;
  scores: Record<CameraChoreographyName, number>;
  spatial: CameraDirectorSpatialPlan;
  alternatives: CameraDirectorAlternative[];
  tracks: MotionTrack[];
}

export interface CameraDirectorResult {
  experience: ExperienceConfig;
  plan: CameraDirectorPlan;
  replacedTracks: number;
}

export function directCamera(
  config: ExperienceConfig,
  sceneIndex: number,
  options: CameraDirectorOptions = {},
): CameraDirectorPlan {
  const scene = config.scenes[sceneIndex];
  if (!scene) throw new RangeError(`Unknown scene index ${sceneIndex}`);
  const metrics = measureScene(config, scene);
  const semantics = semanticText(scene);
  const intent = inferIntent(semantics, metrics, sceneIndex, config.scenes.length);
  const semanticScores = initialScores();
  scoreIntent(semanticScores, intent);
  scoreSemantics(semanticScores, semantics);
  scoreGeometry(semanticScores, metrics);
  scoreNarrativePosition(semanticScores, sceneIndex, config.scenes.length);
  const spatialScene = options.spatialScene ?? buildSpatialScene(config, sceneIndex, options.liveBounds ?? []);

  const candidates = cameraChoreographyCatalog.map((item) => {
    const baseTracks = createCameraChoreography(item.id, config, sceneIndex);
    const coarse = repairSpatialCameraTracks(baseTracks, spatialScene, 2);
    const planned = repairSpatialCameraTracksWithPlanner(coarse.tracks, spatialScene, 5);
    const reroutes = coarse.reroutes + planned.stats.reroutes;
    const continuityPenalty = cameraContinuityPenalty(config, sceneIndex, planned.tracks);
    const spatialScore = planned.evaluation.score - continuityPenalty;
    const invalidPenalty = planned.evaluation.hardInvalid ? 120 : 0;
    const planningPenalty = planned.stats.failedRoutes * 4 + planned.stats.routeWaypoints * 0.035;
    const score = semanticScores[item.id] + spatialScore * 0.72 - invalidPenalty - planningPenalty;
    return {
      item,
      score,
      semanticScore: semanticScores[item.id],
      spatialScore,
      continuityPenalty,
      repair: {
        tracks: planned.tracks,
        evaluation: planned.evaluation,
        reroutes,
        planner: planned.stats,
      },
    };
  }).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

  const top = candidates[0];
  const second = candidates[1];
  const gap = Math.max(0, top.score - second.score);
  const spatialConfidence = top.repair.evaluation.hardInvalid
    ? -0.18
    : Math.min(0.16, Math.max(0, top.repair.evaluation.score) * 0.012);
  const feasibilityBonus = top.repair.planner.failedRoutes === 0 ? 0.025 : -0.06;
  const confidence = clamp(0.56 + gap * 0.035 + spatialConfidence + feasibilityBonus, 0.5, 0.97);
  const rationale = explainChoice(
    intent,
    top.item.id,
    metrics,
    semantics,
    top.repair.evaluation,
    top.repair.reroutes,
    top.continuityPenalty,
    top.repair.planner,
  );
  const scores = Object.fromEntries(candidates.map((candidate) => [candidate.item.id, candidate.score])) as Record<CameraChoreographyName, number>;
  const alternatives = candidates.slice(0, 4).map((candidate) => ({
    shot: candidate.item.id,
    shotLabel: candidate.item.label,
    score: candidate.score,
    semanticScore: candidate.semanticScore,
    spatialScore: candidate.spatialScore,
    continuityPenalty: candidate.continuityPenalty,
    hardInvalid: candidate.repair.evaluation.hardInvalid,
    reroutes: candidate.repair.reroutes,
    planner: candidate.repair.planner,
  }));

  return {
    sceneId: scene.id,
    intent,
    shot: top.item.id,
    shotLabel: top.item.label,
    confidence,
    rationale,
    metrics,
    scores,
    spatial: {
      evaluation: top.repair.evaluation,
      reroutes: top.repair.reroutes,
      continuityPenalty: top.continuityPenalty,
      boundsSource: spatialBoundsSource(spatialScene),
      rejectedCandidates: candidates.filter((candidate) => candidate.repair.evaluation.hardInvalid).length,
      planner: top.repair.planner,
    },
    alternatives,
    tracks: top.repair.tracks,
  };
}

export function applyCameraDirector(
  config: ExperienceConfig,
  sceneIndex: number,
  options: CameraDirectorOptions = {},
): CameraDirectorResult {
  const plan = directCamera(config, sceneIndex, options);
  const scene = config.scenes[sceneIndex];
  const retained = scene.motionTracks.filter((track) => !isCameraTrack(track));
  const replacedTracks = scene.motionTracks.length - retained.length;
  const scenes = config.scenes.map((item, index) => index === sceneIndex ? { ...item, motionTracks: [...retained, ...plan.tracks] } : item);
  return { experience: { ...config, scenes }, plan, replacedTracks };
}

export function isCameraTrack(track: MotionTrack) {
  return track.target === "camera.position" || track.target === "camera.target" || track.target === "camera.fov";
}

function measureScene(config: ExperienceConfig, scene: SceneDefinition): CameraDirectorMetrics {
  const from = scene.camera.from;
  const to = scene.camera.to;
  const travel = distance(from.position, to.position);
  const focusFrom = distance(from.position, from.target);
  const focusTo = distance(to.position, to.target);
  const activeAssets = config.assets.filter((asset) => !asset.scenes || asset.scenes.includes(scene.id));
  const center = midpoint(scene.hero.from.position, scene.hero.to.position);
  const assetSpread = activeAssets.length
    ? Math.max(...activeAssets.map((asset) => distance(asset.position, center)))
    : 0;
  const rotation = sub(scene.hero.to.rotation, scene.hero.from.rotation);
  return {
    travel,
    focusFrom,
    focusTo,
    approach: focusFrom - focusTo,
    lateral: Math.abs(to.position[0] - from.position[0]),
    vertical: Math.abs(to.position[1] - from.position[1]),
    heroTravel: distance(scene.hero.from.position, scene.hero.to.position),
    heroRotation: Math.hypot(...rotation),
    heroScaleDelta: scene.hero.to.scale - scene.hero.from.scale,
    activeAssets: activeAssets.length,
    assetSpread,
    hotspots: config.hotspots.filter((hotspot) => hotspot.sceneId === scene.id).length,
    blocks: scene.blocks.length,
    hasMedia: Boolean(scene.media),
  };
}

function inferIntent(text: string, metrics: CameraDirectorMetrics, index: number, count: number): CameraIntent {
  if (hasAny(text, ["detail", "ingredient", "material", "texture", "feature", "macro", "craft", "precision"])) return "inspect";
  if (hasAny(text, ["enter", "inside", "threshold", "portal", "door", "through", "arrival path"])) return "enter";
  if (hasAny(text, ["room", "interior", "space", "environment", "venue", "cabin", "architecture", "landscape"])) return "environment";
  if (hasAny(text, ["order", "reserve", "contact", "discover", "book", "shop", "start", "cta"]) || index === count - 1) return "convert";
  if (hasAny(text, ["profile", "form", "silhouette", "showcase", "collection", "menu", "lineup", "360"])) return "showcase";
  if (hasAny(text, ["journey", "story", "sequence", "process", "system", "flow"]) || metrics.blocks + metrics.hotspots + metrics.activeAssets >= 5) return "journey";
  return "reveal";
}

function initialScores(): Record<CameraChoreographyName, number> {
  return Object.fromEntries(cameraChoreographyCatalog.map((item) => [item.id, 1])) as Record<CameraChoreographyName, number>;
}

function scoreIntent(scores: Record<CameraChoreographyName, number>, intent: CameraIntent) {
  const boosts: Record<CameraIntent, Partial<Record<CameraChoreographyName, number>>> = {
    reveal: { "director-precision-push": 4, "director-pullback-reveal": 2, "director-crane-reveal": 1 },
    inspect: { "director-macro-approach": 5, "director-parallax-truck": 2, "director-hero-orbit": 1.5 },
    enter: { "director-precision-push": 4, "director-dolly-zoom": 4, "director-macro-approach": 1 },
    environment: { "director-crane-reveal": 5, "director-pullback-reveal": 4, "director-s-curve": 1.5 },
    showcase: { "director-hero-orbit": 5, "director-parallax-truck": 4, "director-s-curve": 1 },
    journey: { "director-s-curve": 5, "director-parallax-truck": 2, "director-crane-reveal": 1.5 },
    convert: { "director-pullback-reveal": 4, "director-precision-push": 3, "director-crane-reveal": 1 },
  };
  for (const [name, amount] of Object.entries(boosts[intent])) scores[name as CameraChoreographyName] += amount ?? 0;
}

function scoreSemantics(scores: Record<CameraChoreographyName, number>, text: string) {
  if (hasAny(text, ["detail", "macro", "ingredient", "material", "texture"])) scores["director-macro-approach"] += 3;
  if (hasAny(text, ["profile", "side", "menu", "compare", "lineup"])) scores["director-parallax-truck"] += 3;
  if (hasAny(text, ["orbit", "360", "form", "shape", "sculpture"])) scores["director-hero-orbit"] += 3;
  if (hasAny(text, ["rise", "tower", "height", "overview", "architecture", "interior"])) scores["director-crane-reveal"] += 3;
  if (hasAny(text, ["reveal", "discover", "environment", "space", "world"])) scores["director-pullback-reveal"] += 2;
  if (hasAny(text, ["enter", "portal", "threshold", "through", "dramatic"])) scores["director-dolly-zoom"] += 2.5;
  if (hasAny(text, ["journey", "sequence", "flow", "story", "system"])) scores["director-s-curve"] += 2.5;
}

function scoreGeometry(scores: Record<CameraChoreographyName, number>, metrics: CameraDirectorMetrics) {
  const travel = Math.max(0.25, metrics.travel);
  const lateralRatio = metrics.lateral / travel;
  const verticalRatio = metrics.vertical / travel;
  if (lateralRatio > 0.55) scores["director-parallax-truck"] += 2.5;
  if (verticalRatio > 0.42) scores["director-crane-reveal"] += 2.5;
  if (metrics.approach > Math.max(0.5, metrics.focusFrom * 0.1)) {
    scores["director-macro-approach"] += 2;
    scores["director-precision-push"] += 1.5;
    scores["director-dolly-zoom"] += 1;
  }
  if (metrics.approach < -Math.max(0.5, metrics.focusFrom * 0.1)) scores["director-pullback-reveal"] += 2.5;
  if (metrics.heroRotation > 0.35) scores["director-hero-orbit"] += 2.5;
  if (metrics.heroScaleDelta > 0.12) scores["director-macro-approach"] += 1.5;
  if (metrics.heroScaleDelta < -0.12) scores["director-pullback-reveal"] += 1;
  const complexity = metrics.activeAssets + metrics.hotspots * 1.5 + metrics.blocks;
  if (complexity >= 5) scores["director-s-curve"] += 2;
  if (metrics.assetSpread > 4) {
    scores["director-crane-reveal"] += 1.5;
    scores["director-pullback-reveal"] += 1.5;
  }
  if (metrics.hasMedia) {
    scores["director-precision-push"] += 0.75;
    scores["director-s-curve"] += 0.75;
  }
}

function scoreNarrativePosition(scores: Record<CameraChoreographyName, number>, index: number, count: number) {
  if (index === 0) scores["director-precision-push"] += 1.75;
  if (index === count - 1) scores["director-pullback-reveal"] += 1.75;
  if (index > 0 && index < count - 1) scores["director-parallax-truck"] += 0.25;
}

function cameraContinuityPenalty(config: ExperienceConfig, sceneIndex: number, tracks: MotionTrack[]) {
  const position = tracks.find((track) => track.target === "camera.position" && track.viewport !== "mobile");
  if (!position) return 20;
  const start = sampleMotionTrack(position, 0) as Vec3;
  const early = sampleMotionTrack(position, 0.06) as Vec3;
  const late = sampleMotionTrack(position, 0.94) as Vec3;
  const end = sampleMotionTrack(position, 1) as Vec3;
  let penalty = 0;
  const previous = config.scenes[sceneIndex - 1];
  if (previous) {
    const incoming = sub(previous.camera.to.position, previous.camera.from.position);
    const outgoing = sub(early, start);
    if (magnitude(incoming) > 0.01 && magnitude(outgoing) > 0.01) penalty += Math.max(0, angleDegrees(incoming, outgoing) - 80) * 0.035;
  }
  const next = config.scenes[sceneIndex + 1];
  if (next) {
    const outgoing = sub(end, late);
    const nextDirection = sub(next.camera.to.position, next.camera.from.position);
    if (magnitude(outgoing) > 0.01 && magnitude(nextDirection) > 0.01) penalty += Math.max(0, angleDegrees(outgoing, nextDirection) - 80) * 0.035;
  }
  return penalty;
}

function spatialBoundsSource(spatial: SpatialScene): "live" | "mixed" | "proxy" {
  const sources = new Set([spatial.subject.source, ...spatial.obstacles.map((obstacle) => obstacle.source), ...spatial.sets.map((set) => set.source)]);
  if (sources.size === 1 && sources.has("live")) return "live";
  if (sources.size === 1 && sources.has("proxy")) return "proxy";
  return "mixed";
}

function explainChoice(
  intent: CameraIntent,
  shot: CameraChoreographyName,
  metrics: CameraDirectorMetrics,
  text: string,
  spatial: SpatialCameraEvaluation,
  reroutes: number,
  continuityPenalty: number,
  planner: SpatialPlannerStats,
) {
  const reasons: string[] = [`${intent} intent`];
  if (metrics.approach > 0.5) reasons.push("camera closes on the subject");
  else if (metrics.approach < -0.5) reasons.push("camera opens away from the subject");
  if (metrics.lateral > metrics.vertical * 1.6 && metrics.lateral > 0.5) reasons.push("strong lateral travel");
  if (metrics.vertical > metrics.lateral * 0.8 && metrics.vertical > 0.5) reasons.push("meaningful vertical travel");
  if (metrics.heroRotation > 0.35) reasons.push("subject rotation supports dimensional reveal");
  if (metrics.activeAssets + metrics.hotspots + metrics.blocks >= 5) reasons.push("scene has multiple visual beats");
  if (hasAny(text, ["detail", "material", "texture", "ingredient"])) reasons.push("copy calls for close inspection");
  if (planner.routeWaypoints > 0) reasons.push(`${planner.routeWaypoints} obstacle-aware route waypoint${planner.routeWaypoints === 1 ? "" : "s"}`);
  else if (reroutes > 0) reasons.push(`${reroutes} geometry avoidance correction${reroutes === 1 ? "" : "s"}`);
  if (planner.compositionRepairs > 0) reasons.push(`${planner.compositionRepairs} composition repair${planner.compositionRepairs === 1 ? "" : "s"}`);
  if (spatial.occlusionSamples === 0) reasons.push("clear subject sightline");
  if (spatial.framingViolations === 0) reasons.push("subject stays inside composition safe zones");
  if (continuityPenalty < 0.25) reasons.push("clean scene-to-scene heading continuity");
  const label = cameraChoreographyCatalog.find((item) => item.id === shot)?.label.replace("Director · ", "") ?? shot;
  return `${label} selected from ${reasons.slice(0, 6).join(", ")}.`;
}

function semanticText(scene: SceneDefinition) {
  const blocks = scene.blocks.map((block) => {
    if (block.type === "statement") return `${block.title} ${block.body ?? ""} ${block.accent ?? ""}`;
    if (block.type === "brand-band") return block.text;
    if (block.type === "menu-grid") return `${block.title} ${block.items.map((item) => `${item.name} ${item.description}`).join(" ")}`;
    // An image roll is decorative, so it contributes no semantic text.
    if (block.type === "image-roll") return "";
    return `${block.title} ${block.cta.label}`;
  }).join(" ");
  return `${scene.id} ${scene.label} ${scene.copy.eyebrow ?? ""} ${scene.copy.headline} ${scene.copy.body} ${blocks}`.toLowerCase();
}

function hasAny(text: string, words: string[]) { return words.some((word) => text.includes(word)); }
function distance(a: Vec3, b: Vec3) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function midpoint(a: Vec3, b: Vec3): Vec3 { return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function magnitude(a: Vec3) { return Math.hypot(...a); }
function normalize(a: Vec3): Vec3 { const length = magnitude(a); return length > 1e-8 ? [a[0] / length, a[1] / length, a[2] / length] : [0, 0, 0]; }
function dot(a: Vec3, b: Vec3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function angleDegrees(a: Vec3, b: Vec3) { return Math.acos(clamp(dot(normalize(a), normalize(b)), -1, 1)) * 180 / Math.PI; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
