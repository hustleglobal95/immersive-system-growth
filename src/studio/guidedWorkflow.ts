import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export type GuidedProjectKind = "real-estate" | "product" | "hospitality" | "automotive" | "fashion" | "custom";

export interface GuidedBrief {
  projectName: string;
  kind: GuidedProjectKind;
  objective: string;
  audience: string;
  mood: string;
}

const BRIEF_KEY = "forge-guided-brief-v1";
const STEP_KEY = "forge-guided-step-v1";

export const defaultGuidedBrief: GuidedBrief = {
  projectName: "Untitled Experience",
  kind: "custom",
  objective: "Create a memorable immersive experience that makes the main idea immediately clear.",
  audience: "A design-aware visitor evaluating the brand, product or place.",
  mood: "Cinematic, premium, restrained and memorable.",
};

export function saveGuidedBrief(brief: GuidedBrief) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
}

export function loadGuidedBrief(): GuidedBrief | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRIEF_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<GuidedBrief>;
    if (!value.projectName || !value.kind || !value.objective || !value.audience || !value.mood) return null;
    return value as GuidedBrief;
  } catch {
    return null;
  }
}

export function saveGuidedStep(step: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STEP_KEY, String(Math.max(0, Math.min(4, step))));
}

export function loadGuidedStep() {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(STEP_KEY));
  return Number.isFinite(value) ? Math.max(0, Math.min(4, value)) : 0;
}

export function buildGuidedIntent(brief: GuidedBrief) {
  return [
    `Project: ${brief.projectName}.`,
    `Type: ${brief.kind.replace("-", " ")}.`,
    `Primary outcome: ${brief.objective}`,
    `Audience: ${brief.audience}`,
    `Creative tone: ${brief.mood}`,
    "Choose the smartest production path, concentrate craft into one signature moment, protect mobile performance, and avoid unnecessary technical complexity.",
  ].join(" ");
}

export function makeGuidedStarterExperience(base: ExperienceConfig, brief: GuidedBrief): ExperienceConfig {
  const labels = sceneLabels[brief.kind];
  const scenes = labels.map((label, index) => makeScene(base.scenes[0], label, index, labels.length, brief));
  return parseExperience({
    ...structuredClone(base),
    meta: {
      ...base.meta,
      name: brief.projectName,
      description: `${brief.projectName} — Forge guided production project.`,
    },
    heroModel: "",
    heroVisible: false,
    assets: [],
    scenes,
    hotspots: [],
    productRig: undefined,
  });
}

function makeScene(source: SceneDefinition, label: string, index: number, total: number, brief: GuidedBrief): SceneDefinition {
  const scene = structuredClone(source);
  scene.id = slug(label) || `scene-${index + 1}`;
  scene.label = label;
  scene.range = [index / total, (index + 1) / total];
  scene.motionTracks = [];
  scene.blocks = [];
  delete scene.media;
  scene.copy = {
    eyebrow: `${String(index + 1).padStart(2, "0")} / ${brief.kind.replace("-", " ").toUpperCase()}`,
    headline: index === 0 ? brief.projectName : label,
    body: guidedSceneBody(index, label, brief),
    align: "left",
  };
  return scene;
}

function guidedSceneBody(index: number, label: string, brief: GuidedBrief) {
  if (index === 0) return brief.objective;
  if (index === 1) return `Build context and credibility for ${brief.audience.toLowerCase()}.`;
  if (index === 2) return `Make ${label.toLowerCase()} the strongest proof or signature moment in the experience.`;
  if (index === 3) return "Resolve the story with useful detail instead of adding another climax.";
  return "End with a clear next action and a calm production-ready state.";
}

const sceneLabels: Record<GuidedProjectKind, string[]> = {
  "real-estate": ["Arrival", "Architecture", "Residence", "Amenities", "Enquire"],
  product: ["Hero", "Design Detail", "Signature Reveal", "Proof", "Action"],
  hospitality: ["Arrival", "Atmosphere", "Signature Space", "Experience", "Reserve"],
  automotive: ["Reveal", "Exterior Design", "Signature Detail", "Performance", "Configure"],
  fashion: ["Opening Look", "Collection", "Signature Look", "Craft", "Shop"],
  custom: ["Opening", "Context", "Signature Moment", "Proof", "Action"],
};

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}
