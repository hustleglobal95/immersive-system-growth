import { inferPromptIntelligence } from "@/src/platform/autonomy/promptIntelligence";
import { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";
import {
  parseInteractive3DBlueprint,
  type Interactive3DBlueprint,
  type Interactive3DScene,
} from "@/src/platform/interactive3dBlueprint";
import { evaluateInteractive3DBlueprintPolicy } from "@/src/platform/interactive3dPolicy";
import { parseExperience } from "@/src/lib/configSchema";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import type { AssetManifest } from "@/src/types/assets";
import { parseStudioReferences, studioReferencesToBlueprintReferences, studioReferencesToDirectorReferences, type StudioReference } from "@/src/platform/studioReference";

export interface Interactive3DHeroAssetInput {
  id?: string;
  label: string;
  type: "model" | "image" | "video";
  source: string;
}

export interface Interactive3DPromptPlan {
  blueprint: Interactive3DBlueprint;
  promptIntelligence: ReturnType<typeof inferPromptIntelligence>;
  director: ReturnType<typeof runDirectorIntelligence>;
  decisions: string[];
}

export function planInteractive3DFromPrompt(input: {
  prompt: string;
  projectName: string;
  experience: unknown;
  manifest: unknown;
  heroAsset?: Interactive3DHeroAssetInput;
  references?: StudioReference[];
}): Interactive3DPromptPlan {
  const experience = parseExperience(input.experience);
  const manifest = parseAssetManifest(input.manifest);
  if (experience.scenes.length < 2 || experience.scenes.length > 16) {
    throw new Error("Interactive 3D autonomous planning requires an ExperienceConfig template with 2-16 scenes.");
  }
  const projectReferences=parseStudioReferences(input.references ?? []);
  const promptIntelligence = inferPromptIntelligence({
    prompt: input.prompt,
    projectName: input.projectName,
    sceneCount: Math.max(4, Math.min(8, experience.scenes.length)),
    manifest,
  });
  const directorReferences=studioReferencesToDirectorReferences(projectReferences);
  const director = runDirectorIntelligence({ brief: { ...promptIntelligence.brief, references:[...promptIntelligence.brief.references,...directorReferences] } });
  const treatment = director.report.treatment;
  const archetype = chooseArchetype(promptIntelligence.brief.projectType, input.prompt);
  const sceneCount = sceneCountForArchetype(archetype);
  const signatureIndex = signatureSceneIndex(treatment.emotionalArc, sceneCount);
  const signatureMoment = signatureMomentFor({
    archetype,
    projectType: promptIntelligence.brief.projectType,
    projectName: input.projectName,
    prompt: input.prompt,
    directorFallback: treatment.signatureMoment.description,
  });
  const assets = blueprintAssets({
    archetype,
    projectName: input.projectName,
    visualWorld: director.creativeDNA?.northStar ?? treatment.artBible.northStar,
    heroAsset: input.heroAsset,
  });
  const scenes = Array.from({ length: sceneCount }, (_, index) =>
    planScene({
      id: sceneIdFor(archetype, index),
      index,
      count: sceneCount,
      signatureIndex,
      archetype,
      treatment,
      prompt: input.prompt,
      heroAssetId: assets.find((asset) => asset.heroCandidate)?.id ?? "hero",
      projectName: input.projectName,
      signatureMoment,
    }),
  );
  const palette = paletteFor(promptIntelligence.brief.projectType, archetype);
  const blueprint = parseInteractive3DBlueprint({
    version: 1,
    project: {
      name: input.projectName,
      projectType: promptIntelligence.brief.projectType,
      tier: promptIntelligence.brief.tier,
      audience: promptIntelligence.brief.audience,
      objective: promptIntelligence.brief.objective,
      primaryAction: promptIntelligence.brief.primaryAction,
      brandTruth: promptIntelligence.brief.brandTruth,
      differentiators: promptIntelligence.brief.differentiators,
      constraints: [
        ...promptIntelligence.brief.constraints,
        "Do not inherit client-specific copy, media, hotspots or conversion claims from the template ExperienceConfig.",
        "Prove the signature scene before expanding ornamental complexity.",
      ],
    },
    experience: {
      archetype,
      thesis: treatment.thesis,
      visualWorld: director.creativeDNA?.northStar ?? treatment.artBible.world,
      interactionModel: interactionModelFor(archetype),
      signatureMoment,
      signatureSceneId: scenes[signatureIndex].id,
      scenes,
    },
    renderer: {
      strategy: "webgl",
      rationale: "Use Forge's existing persistent React Three Fiber/Three.js WebGL runtime and adaptive render governor. WebGPU remains a separately verified enhancement.",
    },
    artDirection: {
      palette,
      typography: bounded(director.artDirection?.typeSystem?.join(" ") ?? treatment.artBible.typographyCharacter, 600),
      lighting: bounded(director.artDirection?.lightingSystem?.join(" ") ?? treatment.grammar.lighting.join(" "), 600),
      material: bounded(director.artDirection?.materialSystem?.join(" ") ?? treatment.artBible.materialLogic, 600),
      composition: bounded(director.artDirection?.sceneFrames?.map((frame) => frame.composition).slice(0, 3).join(" ") ?? treatment.grammar.composition.join(" "), 600),
    },
    assets,
    references: studioReferencesToBlueprintReferences(projectReferences),
    performance: {
      targetFps: 60,
      initialCriticalMb: archetype === "world-explorer" ? 8 : 6,
      maxActiveMb: archetype === "world-explorer" ? 96 : 72,
      maxDrawCalls: archetype === "world-explorer" ? 100 : 90,
      maxTriangles: archetype === "world-explorer" ? 900000 : 650000,
    },
    accessibility: {
      semanticFallback: "Every heading, supporting statement and primary action remains semantic DOM; Canvas carries depth, material, transformation and atmosphere only.",
      reducedMotion: "Preserve scene order, copy, product/place proof and signature-state meaning using stable compositions and discrete transitions instead of continuous camera travel.",
      keyboardPath: "Essential navigation and actions remain keyboard reachable; any essential 3D state also has a semantic control or deterministic scroll path.",
    },
  });
  const policy = evaluateInteractive3DBlueprintPolicy(blueprint);
  if (!policy.passed) {
    throw new Error("Prompt planner produced an invalid interactive 3D blueprint: " + policy.blockers.map((item) => item.message).join("; "));
  }
  return {
    blueprint,
    promptIntelligence,
    director,
    decisions: [
      "Archetype: " + archetype,
      "Signature scene: " + blueprint.experience.signatureSceneId,
      "Hero asset: " + assets.find((asset) => asset.heroCandidate)?.label,
      "Production renderer: WebGL",
      "Reference intelligence: " + studioReferencesToBlueprintReferences(projectReferences).length + " evidence-directed project reference(s)",
      "Template client-specific content will be discarded during materialization.",
    ],
  };
}

function sceneCountForArchetype(archetype: Interactive3DBlueprint["experience"]["archetype"]) {
  if (archetype === "spatial-story" || archetype === "world-explorer") return 7;
  if (archetype === "product-reveal") return 6;
  if (archetype === "configurator") return 5;
  return 5;
}

function sceneIdFor(archetype: Interactive3DBlueprint["experience"]["archetype"], index: number) {
  const sequences: Record<Interactive3DBlueprint["experience"]["archetype"], string[]> = {
    "product-reveal": ["arrival","reveal","construction","signature","detail","action"],
    "spatial-story": ["arrival","context","threshold","material","signature","horizon","action"],
    "editorial-depth": ["arrival","thesis","depth","signature","action"],
    "interactive-gallery": ["arrival","collection","focus","signature","action"],
    "configurator": ["arrival","inspect","configure","signature","action"],
    "data-sculpture": ["arrival","system","signal","signature","action"],
    "world-explorer": ["arrival","orientation","threshold","journey","signature","destination","action"],
  };
  return sequences[archetype][index] ?? "chapter-" + (index + 1);
}

function chooseArchetype(
  projectType: Interactive3DBlueprint["project"]["projectType"],
  prompt: string,
): Interactive3DBlueprint["experience"]["archetype"] {
  const lower = prompt.toLowerCase();
  if (/\b(configur|customiz|build your|choose your)\b/.test(lower)) return "configurator";
  if (/\b(data|metric|network|system map|visuali[sz]ation)\b/.test(lower) && projectType === "saas") return "data-sculpture";
  if (/\b(coffee|cup|roastery|watch|shoe|sneaker|bottle|perfume|device|headphone|speaker)\b/.test(lower)) return "product-reveal";
  if (projectType === "product" || projectType === "automotive") return "product-reveal";
  if (projectType === "property" || projectType === "hospitality") {
    const explicitExplorer = /\b(free[- ]?roam|open world|walkthrough|navigate the world|explore the world|interactive environment|world explorer)\b/.test(lower);
    return explicitExplorer ? "world-explorer" : "spatial-story";
  }
  if (/\b(free[- ]?roam|open world|walkthrough|navigate the world|explore the world|interactive environment|spatial world)\b/.test(lower)) return "world-explorer";
  if (projectType === "portfolio" || projectType === "commerce") return "interactive-gallery";
  if (projectType === "saas") return "data-sculpture";
  return "editorial-depth";
}

function planScene(input: {
  id: string;
  index: number;
  count: number;
  signatureIndex: number;
  archetype: Interactive3DBlueprint["experience"]["archetype"];
  treatment: ReturnType<typeof runDirectorIntelligence>["report"]["treatment"];
  prompt: string;
  heroAssetId: string;
  projectName: string;
  signatureMoment: string;
}): Interactive3DScene {
  const beat = input.treatment.emotionalArc[
    Math.min(
      input.treatment.emotionalArc.length - 1,
      Math.round((input.index / Math.max(1, input.count - 1)) * (input.treatment.emotionalArc.length - 1)),
    )
  ];
  const shots = input.treatment.shotBible ?? [];
  const shot = shots[
    Math.min(shots.length - 1, Math.round((input.index / Math.max(1, input.count - 1)) * Math.max(0, shots.length - 1)))
  ];
  const signature = input.index === input.signatureIndex;
  const medium: Interactive3DScene["medium"] =
    input.archetype === "editorial-depth" && !signature && input.index % 3 === 2 ? "dom" : "hybrid";
  const depthStrategy = depthFor(input.archetype, signature, input.index);
  const camera = cameraFor(input.archetype, signature, input.index, shot?.movement ?? "");
  const interaction = interactionFor(input.archetype, signature, beat?.interactionLevel ?? 4);
  const label = bounded(beat?.label || shot?.title || "Chapter " + (input.index + 1), 180);
  const subject = bounded(shot?.subject || dominantSubjectFor(input.archetype, input.prompt, signature), 600);
  const purpose = bounded(beat?.purpose || shot?.purpose || "Advance the experience while preserving one dominant spatial subject.", 600);
  const copyRole = bounded(
    shot?.copyRelationship ||
      (signature
        ? "Semantic copy frames the signature subject without competing with it."
        : "Semantic copy explains this chapter while the spatial layer supplies visual evidence."),
    600,
  );
  return {
    id: input.id,
    label,
    purpose,
    dominantSubject: subject,
    copyRole,
    copy: {
      eyebrow: bounded(input.projectName.toUpperCase(), 100),
      headline: bounded(shot?.title || beat?.label || label, 120),
      body: bounded(
        signature
          ? input.signatureMoment
          : shot?.subject
            ? shot.subject
            : beat?.purpose || purpose,
        800,
      ),
    },
    medium,
    depthStrategy,
    camera: {
      move: camera,
      lens: camera === "macro" ? "macro" : input.archetype === "spatial-story" ? "wide" : "normal",
      rationale: bounded(
        shot?.movement
          ? "Translate the Director shot intent into a registered Forge move: " + shot.movement
          : cameraRationale(camera, input.archetype),
        600,
      ),
    },
    interaction,
    transition: bounded(
      shot?.transitionOut || transitionFor(input.archetype, signature),
      600,
    ),
    mobile: mobileFor(input.archetype, camera, signature),
    prewarm: medium === "dom"
      ? []
      : signature
        ? [input.heroAssetId, "signature camera/material pipelines", "environment lighting", "critical fonts"]
        : ["scene-visible assets", "camera/material pipelines"],
  };
}

function blueprintAssets(input: {
  archetype: Interactive3DBlueprint["experience"]["archetype"];
  projectName: string;
  visualWorld: string;
  heroAsset?: Interactive3DHeroAssetInput;
}): Interactive3DBlueprint["assets"] {
  if (input.heroAsset) {
    return [{
      id: input.heroAsset.id ?? slug(input.heroAsset.label),
      label: input.heroAsset.label,
      type: input.heroAsset.type,
      status: "existing",
      role: "Owned hero asset for the signature slice.",
      source: input.heroAsset.source,
      heroCandidate: true,
    }];
  }
  const heroType: "model" | "image" =
    ["product-reveal", "spatial-story", "configurator", "world-explorer"].includes(input.archetype)
      ? "model"
      : "image";
  return [
    {
      id: "hero-" + slug(input.projectName),
      label: input.projectName + " hero " + (heroType === "model" ? "model" : "image"),
      type: heroType,
      status: "generate",
      role: "Signature-critical hero asset. It must be generated from the project-specific art direction, then promoted through the Forge Asset Vault before release.",
      heroCandidate: true,
    },
    {
      id: "support-" + slug(input.projectName),
      label: input.projectName + " supporting image",
      type: "image",
      status: "generate",
      role: "Supporting visual plate that reinforces the visual world without replacing the hero subject. Direction: " + bounded(input.visualWorld, 260),
      heroCandidate: false,
    },
  ];
}

function signatureMomentFor(input: {
  archetype: Interactive3DBlueprint["experience"]["archetype"];
  projectType: Interactive3DBlueprint["project"]["projectType"];
  projectName: string;
  prompt: string;
  directorFallback: string;
}) {
  const subject = projectSubjectFor(input.prompt, input.projectName, input.projectType);
  const moments: Record<Interactive3DBlueprint["experience"]["archetype"], string> = {
    "product-reveal":
      input.projectName + " peaks when " + subject + " moves from a withheld or separated construction state into one complete, inspectable form; the camera settles into material-scale detail instead of adding a second spectacle.",
    "spatial-story":
      input.projectName + " peaks at an authored threshold where " + subject + " opens from compression into the clearest sense of place, scale or view; camera direction, horizon and light carry continuously through the reveal.",
    "editorial-depth":
      input.projectName + " peaks when the editorial field briefly gives spatial priority to " + subject + "; typography, image depth and camera pressure resolve into one legible composition before returning to stillness.",
    "interactive-gallery":
      input.projectName + " peaks when " + subject + " leaves the collection rhythm and becomes the single spatial focus; selection, camera and surrounding works quiet down so the chosen piece earns the frame.",
    "configurator":
      input.projectName + " peaks when a deliberate user choice produces a clearly visible state change on " + subject + "; the result remains inspectable and reversible rather than becoming an ornamental animation.",
    "data-sculpture":
      input.projectName + " peaks when the governing data change reorganizes " + subject + " into a materially different spatial state while the semantic explanation remains readable beside it.",
    "world-explorer":
      input.projectName + " peaks when the visitor crosses a deliberate spatial threshold in " + subject + " and the environment reveals a new scale, destination or relationship; navigation remains authored rather than free-camera spectacle.",
  };
  const authored = bounded(moments[input.archetype], 600);
  const genericFallback = /competitors could not credibly own|signature moment demonstrates|memorable behavior/i.test(input.directorFallback);
  if (genericFallback) return authored;
  return bounded(authored + " Director intent: " + input.directorFallback, 600);
}

function projectSubjectFor(
  prompt: string,
  projectName: string,
  projectType: Interactive3DBlueprint["project"]["projectType"],
) {
  const lower = prompt.toLowerCase();
  if (/\bwatch|timepiece|mechanical\b/.test(lower)) return "the mechanical timepiece and its construction";
  if (/\bcoffee|cup|roastery|espresso|bean\b/.test(lower)) return "the coffee ritual, hero cup and material detail";
  if (/\bshoe|sneaker|footwear\b/.test(lower)) return "the hero footwear form, sole and material system";
  if (/\bperfume|fragrance|bottle\b/.test(lower)) return "the hero bottle, glass and liquid/material relationship";
  if (/\bcar|vehicle|automotive|roadster|sedan|suv\b/.test(lower)) return "the vehicle form and engineering detail";
  if (/\bresidence|property|tower|architecture|waterfront|hotel|resort|interior\b/.test(lower)) return projectName + "'s architecture, thresholds, materials and view";
  if (/\bfashion|couture|collection|garment|apparel|lookbook\b/.test(lower)) return "the collection silhouette, image direction and material detail";
  if (/\bportfolio|case stud|project work|gallery\b/.test(lower)) return projectName + "'s selected work";
  if (/\bdata|metric|network|system map|visuali[sz]ation\b/.test(lower)) return "the project data and its spatial relationships";
  if (projectType === "saas") return projectName + "'s product mechanism";
  return projectName + "'s primary subject";
}

function signatureSceneIndex(beats: ReturnType<typeof runDirectorIntelligence>["report"]["treatment"]["emotionalArc"], sceneCount: number) {
  let best = 0;
  for (let index = 1; index < beats.length; index++) {
    if (beats[index].intensity > beats[best].intensity) best = index;
  }
  if (beats.length <= 1) return Math.min(sceneCount - 1, Math.floor(sceneCount * 0.45));
  return Math.min(sceneCount - 1, Math.round((best / (beats.length - 1)) * (sceneCount - 1)));
}

function depthFor(
  archetype: Interactive3DBlueprint["experience"]["archetype"],
  signature: boolean,
  index: number,
): Interactive3DScene["depthStrategy"] {
  if (signature) return archetype === "editorial-depth" ? "perspective" : "full-3d";
  if (archetype === "product-reveal" || archetype === "configurator") return index % 2 ? "material" : "perspective";
  if (archetype === "spatial-story" || archetype === "world-explorer") return index % 2 ? "atmospheric" : "full-3d";
  if (archetype === "data-sculpture") return index % 2 ? "full-3d" : "layered-dom";
  return index % 2 ? "parallax" : "layered-dom";
}

function cameraFor(
  archetype: Interactive3DBlueprint["experience"]["archetype"],
  signature: boolean,
  index: number,
  movement: string,
): Interactive3DScene["camera"]["move"] {
  const lower = movement.toLowerCase();
  if (/\bmacro|close|detail\b/.test(lower)) return "macro";
  if (/\borbit|arc\b/.test(lower)) return "orbit";
  if (/\bcrane|rise|lift|vertical\b/.test(lower)) return "crane";
  if (/\btruck|lateral|side\b/.test(lower)) return "truck";
  if (/\bpull|reveal|retreat\b/.test(lower)) return "reveal";
  if (/\bdolly|push|approach|forward\b/.test(lower)) return "dolly";
  if (signature) return archetype === "product-reveal" || archetype === "configurator" ? "macro" : "reveal";
  const patterns: Record<Interactive3DBlueprint["experience"]["archetype"], Interactive3DScene["camera"]["move"][]> = {
    "product-reveal": ["reveal", "macro", "orbit", "truck"],
    "spatial-story": ["dolly", "crane", "truck", "reveal"],
    "editorial-depth": ["static", "truck", "reveal", "dolly"],
    "interactive-gallery": ["truck", "reveal", "static", "orbit"],
    "configurator": ["reveal", "orbit", "macro", "static"],
    "data-sculpture": ["reveal", "orbit", "truck", "static"],
    "world-explorer": ["dolly", "crane", "reveal", "truck"],
  };
  const list = patterns[archetype];
  return list[index % list.length];
}

function interactionFor(
  archetype: Interactive3DBlueprint["experience"]["archetype"],
  signature: boolean,
  level: number,
): Interactive3DScene["interaction"] {
  if (!signature && level <= 2) {
    return { input: "scroll", physicalQuantity: "progress", behavior: "Normalized narrative progress advances one authored scene state without decorative cursor motion." };
  }
  if (archetype === "configurator") {
    return { input: "mixed", physicalQuantity: "orientation", behavior: "Scroll establishes the authored state; direct manipulation changes bounded product orientation for inspection." };
  }
  if (archetype === "interactive-gallery") {
    return { input: "mixed", physicalQuantity: "proximity", behavior: "Scroll controls chapter progress while pointer/touch proximity reveals depth only around the active work." };
  }
  if (archetype === "data-sculpture") {
    return { input: "mixed", physicalQuantity: "progress", behavior: "Normalized progress changes the data/spatial state; pointer input is secondary and bounded." };
  }
  return {
    input: signature ? "mixed" : "scroll",
    physicalQuantity: "progress",
    behavior: signature
      ? "Scroll progress drives the protected transformation; pointer/touch may add bounded secondary parallax after scene readiness."
      : "Normalized scroll progress advances the authored camera/subject state deterministically.",
  };
}

function interactionModelFor(archetype: Interactive3DBlueprint["experience"]["archetype"]) {
  const rows: Record<Interactive3DBlueprint["experience"]["archetype"], string> = {
    "product-reveal": "Scroll is the narrative clock; the product remains the persistent anchor and direct manipulation is reserved for inspection after the reveal.",
    "spatial-story": "Scroll crosses authored spatial thresholds; camera motion communicates arrival, scale and material rather than behaving like a free-roam game.",
    "editorial-depth": "Semantic typography and media own meaning while bounded WebGL depth, masks and camera pressure reinforce hierarchy.",
    "interactive-gallery": "Scroll establishes collection rhythm; pointer/touch proximity and selection expose depth without hiding navigation or project facts.",
    "configurator": "Semantic controls own configuration state while 3D provides reversible visual inspection and feedback.",
    "data-sculpture": "Data and normalized progress alter a spatial representation while a semantic DOM summary remains authoritative.",
    "world-explorer": "Authored navigation zones create a coherent world while mobile and reduced-motion modes preserve the same narrative sequence.",
  };
  return rows[archetype];
}

function dominantSubjectFor(archetype: Interactive3DBlueprint["experience"]["archetype"], prompt: string, signature: boolean) {
  const base = bounded(prompt.replace(/^(create|build|make)\s+/i, ""), 180);
  return signature ? "Signature subject: " + base : archetype.replace(/-/g, " ") + " chapter subject derived from: " + base;
}
function transitionFor(archetype: Interactive3DBlueprint["experience"]["archetype"], signature: boolean) {
  if (signature) return "Carry the dominant subject, camera direction or light state across the boundary so the signature moment feels causal rather than cut together.";
  if (archetype === "editorial-depth") return "Use typography baseline, media edge or depth continuity rather than a generic full-screen effect.";
  return "Carry one visible state—subject, horizon, light or geometry—into the next chapter.";
}
function mobileFor(archetype: Interactive3DBlueprint["experience"]["archetype"], move: Interactive3DScene["camera"]["move"], signature: boolean) {
  return [
    "Preserve the same narrative idea on mobile.",
    move === "orbit" || move === "crane" ? "Reduce camera travel and favor a stable three-quarter composition." : "Shorten camera travel and reduce parallax amplitude.",
    signature ? "Keep the signature state change, but lower render cost before removing meaning." : "Prefer stillness between authored beats.",
    archetype === "world-explorer" ? "Replace free spatial exploration with deterministic chapter jumps." : "",
  ].filter(Boolean).join(" ");
}
function cameraRationale(move: Interactive3DScene["camera"]["move"], archetype: Interactive3DBlueprint["experience"]["archetype"]) {
  return "Use a registered " + move + " move because it supports the " + archetype.replace(/-/g, " ") + " narrative without introducing unbounded camera coordinates.";
}
function paletteFor(
  projectType: Interactive3DBlueprint["project"]["projectType"],
  archetype: Interactive3DBlueprint["experience"]["archetype"],
): Interactive3DBlueprint["artDirection"]["palette"] {
  const palettes: Record<string, Interactive3DBlueprint["artDirection"]["palette"]> = {
    product: { background:"#0a0a0a",foreground:"#f4f1ea",accent:"#c99a62",fog:"#101010" },
    automotive: { background:"#07090c",foreground:"#f2f5f7",accent:"#7ea9c9",fog:"#0b1016" },
    property: { background:"#15110d",foreground:"#f4eee5",accent:"#c9a06f",fog:"#1b1510" },
    hospitality: { background:"#15120e",foreground:"#f6efe4",accent:"#bda272",fog:"#1c1711" },
    fashion: { background:"#090909",foreground:"#f7f4ee",accent:"#d8d0c5",fog:"#0d0d0d" },
    commerce: { background:"#0d0d0d",foreground:"#f6f4ef",accent:"#d6a96e",fog:"#111111" },
    saas: { background:"#071015",foreground:"#edf7fa",accent:"#73bfd1",fog:"#09151b" },
    portfolio: { background:"#0b0b0b",foreground:"#f6f2ea",accent:"#c7b08b",fog:"#101010" },
    campaign: { background:"#0a090b",foreground:"#f7f3ee",accent:"#d59d6f",fog:"#100e12" },
    brand: { background:"#0b0b0c",foreground:"#f7f4ed",accent:"#c9a879",fog:"#111113" },
  };
  if (archetype === "data-sculpture") return { background:"#061015",foreground:"#edf8fa",accent:"#6fc4d6",fog:"#08171e" };
  return palettes[projectType] ?? palettes.brand;
}
function bounded(value: string, max: number) {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  return clean.slice(0, max) || "Directed interactive 3D chapter.";
}
function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "project";
}
