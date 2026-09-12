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

export interface CameraDirectorPlan {
  sceneId: string;
  intent: CameraIntent;
  shot: CameraChoreographyName;
  shotLabel: string;
  confidence: number;
  rationale: string;
  metrics: CameraDirectorMetrics;
  scores: Record<CameraChoreographyName, number>;
  tracks: MotionTrack[];
}

export interface CameraDirectorResult {
  experience: ExperienceConfig;
  plan: CameraDirectorPlan;
  replacedTracks: number;
}

export function directCamera(config: ExperienceConfig, sceneIndex: number): CameraDirectorPlan {
  const scene = config.scenes[sceneIndex];
  if (!scene) throw new RangeError(`Unknown scene index ${sceneIndex}`);
  const metrics = measureScene(config, scene);
  const semantics = semanticText(scene);
  const intent = inferIntent(semantics, metrics, sceneIndex, config.scenes.length);
  const scores = initialScores();

  scoreIntent(scores, intent);
  scoreSemantics(scores, semantics);
  scoreGeometry(scores, metrics);
  scoreNarrativePosition(scores, sceneIndex, config.scenes.length);

  const ranked = cameraChoreographyCatalog
    .map((item) => ({ item, score: scores[item.id] }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  const top = ranked[0];
  const second = ranked[1];
  const gap = Math.max(0, top.score - second.score);
  const confidence = clamp(0.55 + gap * 0.08 + Math.min(0.12, top.score * 0.012), 0.55, 0.96);
  const rationale = explainChoice(intent, top.item.id, metrics, semantics);

  return {
    sceneId: scene.id,
    intent,
    shot: top.item.id,
    shotLabel: top.item.label,
    confidence,
    rationale,
    metrics,
    scores,
    tracks: createCameraChoreography(top.item.id, config, sceneIndex),
  };
}

export function applyCameraDirector(config: ExperienceConfig, sceneIndex: number): CameraDirectorResult {
  const plan = directCamera(config, sceneIndex);
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

function explainChoice(intent: CameraIntent, shot: CameraChoreographyName, metrics: CameraDirectorMetrics, text: string) {
  const reasons: string[] = [`${intent} intent`];
  if (metrics.approach > 0.5) reasons.push("camera closes on the subject");
  else if (metrics.approach < -0.5) reasons.push("camera opens away from the subject");
  if (metrics.lateral > metrics.vertical * 1.6 && metrics.lateral > 0.5) reasons.push("strong lateral travel");
  if (metrics.vertical > metrics.lateral * 0.8 && metrics.vertical > 0.5) reasons.push("meaningful vertical travel");
  if (metrics.heroRotation > 0.35) reasons.push("subject rotation supports dimensional reveal");
  if (metrics.activeAssets + metrics.hotspots + metrics.blocks >= 5) reasons.push("scene has multiple visual beats");
  if (hasAny(text, ["detail", "material", "texture", "ingredient"])) reasons.push("copy calls for close inspection");
  const label = cameraChoreographyCatalog.find((item) => item.id === shot)?.label.replace("Director · ", "") ?? shot;
  return `${label} selected from ${reasons.slice(0, 4).join(", ")}.`;
}

function semanticText(scene: SceneDefinition) {
  const blocks = scene.blocks.map((block) => {
    if (block.type === "statement") return `${block.title} ${block.body ?? ""} ${block.accent ?? ""}`;
    if (block.type === "brand-band") return block.text;
    if (block.type === "menu-grid") return `${block.title} ${block.items.map((item) => `${item.name} ${item.description}`).join(" ")}`;
    return `${block.title} ${block.cta.label}`;
  }).join(" ");
  return `${scene.id} ${scene.label} ${scene.copy.eyebrow ?? ""} ${scene.copy.headline} ${scene.copy.body} ${blocks}`.toLowerCase();
}

function hasAny(text: string, words: string[]) { return words.some((word) => text.includes(word)); }
function distance(a: Vec3, b: Vec3) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function midpoint(a: Vec3, b: Vec3): Vec3 { return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
