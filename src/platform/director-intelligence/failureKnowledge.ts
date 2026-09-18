import type { DirectorTreatment } from "@/src/platform/directorSchema";

export interface ImmersiveFailureLesson {
  id: string;
  title: string;
  signals: string[];
  patternIds: string[];
  sourceReferenceIds: string[];
  failure: string;
  diagnosis: string;
  recovery: string[];
  confidence: number;
}

/**
 * Evidence-backed failures, rejected approaches and production dead-ends.
 *
 * Great references are useful because of what shipped. They are even more useful
 * when teams explain what they tried and rejected. Forge uses these lessons to
 * avoid repeating expensive dead ends before implementation begins.
 */
export const immersiveFailureKnowledge: ImmersiveFailureLesson[] = [
  {
    id: "realtime-fidelity-overreach",
    title: "Do not force offline-render fidelity into realtime when the interaction does not need it",
    signals: ["luxury", "product", "crystal", "reflection", "raytracing", "photoreal", "cgi"],
    patternIds: ["pre-rendered-sequence-for-fidelity", "simulated-expensive-lighting", "choose-medium-by-capability"],
    sourceReferenceIds: ["unseen-letter", "hello-monday-google-cloud"],
    failure: "Realtime lighting/reflection or ray-traced-look attempts consume too much frame budget while still missing the offline reference quality.",
    diagnosis: "The desired value is authored visual fidelity, but the visitor is not gaining enough viewpoint freedom or physical interaction to justify solving the look live.",
    recovery: [
      "Switch the signature shot to a scroll/drag-controlled pre-rendered sequence or baked representation.",
      "Keep realtime 3D only where direct inspection or perspective freedom creates a real capability.",
      "Bake shadows/reflections/material detail that the camera does not need to recompute.",
    ],
    confidence: 0.99,
  },
  {
    id: "scroll-video-seek-instability",
    title: "Do not assume delivery video is scrub-ready",
    signals: ["video", "scrub", "scroll", "frame", "product film", "sequence"],
    patternIds: ["scrubbable-media-delivery", "pre-rendered-sequence-for-fidelity"],
    sourceReferenceIds: ["codrops-optikka-frame-sequences", "codrops-kai-design-dept"],
    failure: "Ordinary HTML video seeking stutters, misses intended frames or degrades image quality when tightly bound to scroll/drag, especially on mobile.",
    diagnosis: "The media was encoded for linear playback rather than deterministic random access.",
    recovery: [
      "Re-encode a scrub master with short keyframe intervals and verify real browser seek latency.",
      "If native seeking is still unstable, use a frame sequence or a decode path designed for direct frame access.",
      "Stage/prefetch the active frame neighborhood instead of eagerly loading the full sequence.",
    ],
    confidence: 0.995,
  },
  {
    id: "flat-design-spatialization-failure",
    title: "A strong 2D composition may fail when turned into a camera world",
    signals: ["figma", "2d", "3d", "camera", "spatial", "layout", "wireframe"],
    patternIds: ["authored-camera-corridor", "storyboard-before-wireframe", "design-grid-runtime-contract"],
    sourceReferenceIds: ["dogstudio-adobe-taking-shape"],
    failure: "Flat concepts that look strong as isolated screens become awkward, unreadable or impossible to connect once a camera must travel through them.",
    diagnosis: "The design was authored as independent frames without considering reachable camera volume, depth, occlusion and transition direction.",
    recovery: [
      "Prototype camera corridors and scene-to-scene continuity before polishing final layouts.",
      "Storyboard dominant subject, copy plane, depth layers and transition anchor for each chapter.",
      "Keep editorial grid rules, but re-author the spatial composition around actual camera constraints.",
    ],
    confidence: 0.98,
  },
  {
    id: "one-tool-for-every-effect",
    title: "Do not keep a prototype tool after it becomes the creative ceiling",
    signals: ["prototype", "no-code", "effect", "shader", "webgl", "custom"],
    patternIds: ["prototype-prune-converge", "choose-medium-by-capability"],
    sourceReferenceIds: ["codrops-gentle-rain"],
    failure: "Early visual tooling is fast for exploration but becomes brittle when the final direction needs effects, combinations or performance controls it cannot express.",
    diagnosis: "The prototype environment is being treated as production architecture even though its abstraction no longer matches the required effect.",
    recovery: [
      "Keep the prototype as reference and rebuild only the effect-critical portion in the existing Forge runtime.",
      "Escalate to custom shader/render work only after the simpler path is proven insufficient.",
      "Preserve editable DOM/CMS content around the custom rendering path.",
    ],
    confidence: 0.97,
  },
  {
    id: "all-scenes-full-rate-during-transition",
    title: "Do not render every overlapping heavy scene at full cadence by default",
    signals: ["transition", "worlds", "multiple scenes", "fbo", "render", "performance"],
    patternIds: ["transition-render-decimation", "multi-subscene-transition-budget", "render-pass-ownership"],
    sourceReferenceIds: ["active-theory-chile20", "codrops-shader-se"],
    failure: "Cross-world transitions exceed the frame budget because both source and destination run complete expensive render pipelines simultaneously.",
    diagnosis: "The transition requires two visual outputs, but not every underlying simulation/render pass needs full-rate refresh throughout the overlap.",
    recovery: [
      "Prewarm the destination before overlap.",
      "Skip inactive subpasses and reduce secondary-scene refresh cadence while motion/occlusion masks the difference.",
      "Restore full cadence before either scene settles or receives precise interaction.",
    ],
    confidence: 0.99,
  },
  {
    id: "gpu-upload-on-first-reveal",
    title: "Do not make first visibility equal first GPU use",
    signals: ["shader", "texture", "transition", "first scroll", "stutter", "compile", "upload"],
    patternIds: ["prewarm-signature-systems", "transition-readiness-gate", "scene-neighborhood-window"],
    sourceReferenceIds: ["hello-monday-google-cloud", "source-bruno-simon-folio-2025"],
    failure: "The first pass through a scene stutters while textures upload, shaders compile or render targets allocate, even though later passes are smooth.",
    diagnosis: "Critical visual states are lazily initialized on the exact frame the visitor first sees them.",
    recovery: [
      "Render representative states before visitor handoff.",
      "Upload/init critical textures and compile material variants before the transition starts.",
      "Compare cold-scroll and warm-scroll traces; a second-pass-only success is still a failure.",
    ],
    confidence: 0.995,
  },
  {
    id: "desktop-motion-copied-to-mobile",
    title: "Do not scale desktop choreography into portrait and call it responsive",
    signals: ["mobile", "responsive", "portrait", "camera", "scroll", "3d"],
    patternIds: ["responsive-authored-compositions", "mobile-medium-substitution", "mobile-preserve-concept"],
    sourceReferenceIds: ["source-basement-grotesque", "source-abigail-bloom-room", "codrops-stefan-vitasovic-2025"],
    failure: "Desktop coordinates, travel distances, hover assumptions and smooth-scroll behavior create poor framing or awkward interaction on touch/portrait devices.",
    diagnosis: "The implementation preserved code paths instead of preserving the creative idea.",
    recovery: [
      "Author separate portrait framing, offsets and chapter distances.",
      "Replace hover/custom-scroll behavior where native touch interaction is better.",
      "If necessary, change rendering medium while preserving motion grammar and narrative outcome.",
    ],
    confidence: 0.995,
  },
  {
    id: "effect-density-destroys-hierarchy",
    title: "Do not let every section compete to be the signature moment",
    signals: ["premium", "immersive", "motion", "effects", "distortion", "camera", "particles"],
    patternIds: ["single-signature-peak", "density-rhythm-and-silence", "effect-strength-vs-clarity"],
    sourceReferenceIds: ["codrops-oryzo-ai", "codrops-they-call-me-giulio", "codrops-4wide"],
    failure: "Constant maximal motion/effects flatten hierarchy, reduce comprehension and make the site feel like a technique reel.",
    diagnosis: "Visual intensity has no editorial rhythm and no protected peak.",
    recovery: [
      "Name one strongest signature beat.",
      "Make surrounding chapters quieter and more stable.",
      "Remove effects whose only purpose is to keep something moving.",
    ],
    confidence: 0.97,
  },
  {
    id: "free-camera-on-authored-scroll-story",
    title: "Do not imply game controls when the input is a one-dimensional scroll story",
    signals: ["camera", "scroll", "orbit", "curve", "world", "cinematic"],
    patternIds: ["authored-camera-corridor", "directional-cut-continuity", "scroll-distance-pacing"],
    sourceReferenceIds: ["codrops-forged-build", "lusion-turn-of-the-screw"],
    failure: "Curved/freeform camera travel feels like the wrong control scheme when the visitor only controls one-dimensional scroll progress.",
    diagnosis: "The camera path is physically possible but interaction semantics do not explain the extra degrees of freedom.",
    recovery: [
      "Use one dominant movement axis per scroll chapter.",
      "Use a deterministic film cut where physically connecting spaces would create confusing motion.",
      "Reserve direct orbit/free camera for explicit inspection or exploration modes.",
    ],
    confidence: 0.99,
  },
  {
    id: "ugc-world-without-density-plan",
    title: "Do not design a live community world only for launch-day content density",
    signals: ["ugc", "community", "map", "globe", "live", "content", "messages"],
    patternIds: ["data-drives-world-state", "context-layer-over-world", "networked-presence-as-atmosphere"],
    sourceReferenceIds: ["unit9-casa-de-papel", "makemepulse-hennessy-nba"],
    failure: "A spatial content world that looks good with a few launch items becomes unreadable as community/event content accumulates.",
    diagnosis: "The spatial data model lacks clustering, filtering, density scaling or editorial prioritization for growth.",
    recovery: [
      "Design content density tiers and clustering/filter rules before launch.",
      "Keep a semantic/direct content route outside the spatial view.",
      "Treat new content as data feeding the world, not as new hard-coded scene objects.",
    ],
    confidence: 0.95,
  },
  {
    id: "novel-navigation-without-teaching",
    title: "Do not make visitors reverse-engineer the controls",
    signals: ["horizontal", "drag", "cursor", "unusual", "navigation", "gesture"],
    patternIds: ["teach-nonstandard-navigation", "semantic-input-actions"],
    sourceReferenceIds: ["codrops-motoyoshi-takamitsu", "source-bruno-simon-folio-2025"],
    failure: "A novel navigation pattern creates friction because visitors cannot infer how to move, even when the visual execution is strong.",
    diagnosis: "The experience removes familiar affordances before teaching the replacement behavior.",
    recovery: [
      "Use a short first-run motion cue or obvious orientation signal.",
      "Map wheel/touch/keyboard into shared semantic actions where reasonable.",
      "Keep direct navigation available for high-intent visitors.",
    ],
    confidence: 0.96,
  },
  {
    id: "rendering-medium-chosen-for-status",
    title: "Do not use realtime 3D as a status symbol",
    signals: ["3d", "webgl", "shader", "premium", "immersive", "hero"],
    patternIds: ["choose-medium-by-capability", "immersive-without-webgl", "content-intensity-render-mode"],
    sourceReferenceIds: ["codrops-84-24", "unseen-letter", "codrops-stas-bondar-2025"],
    failure: "The project pays the complexity/performance cost of realtime 3D even though authored media, DOM or a simple shader would communicate the idea more clearly.",
    diagnosis: "Technology was chosen before the capability requirement was defined.",
    recovery: [
      "Define the required capability first: viewpoint freedom, material response, spatial interaction, deterministic cinematography or editorial layout.",
      "Choose the lightest medium that supplies that capability.",
      "Reserve realtime 3D for chapters where the visitor gains something visible from it.",
    ],
    confidence: 0.995,
  },
  {
    id: "api-support-is-not-performance-proof",
    title: "Do not treat WebGL/WebGPU support as proof that the device can sustain the experience",
    signals: ["webgl", "webgpu", "device", "capability", "quality", "performance", "fallback"],
    patternIds: ["adaptive-fidelity-not-removal", "choose-medium-by-capability", "single-canvas-multi-view"],
    sourceReferenceIds: ["14islands-progressive-webgl", "active-theory-neve"],
    failure: "The browser reports rendering API support, but the device still cannot sustain the intended scene/postprocessing workload.",
    diagnosis: "Feature detection answers whether an API exists, not whether this scene can meet its frame, memory and thermal budgets.",
    recovery: [
      "Start from a conservative quality tier and promote only after measured runtime evidence.",
      "Keep expensive postprocessing and dense scene features independently disableable.",
      "Preserve semantic content and the signature idea when quality is reduced.",
    ],
    confidence: 0.99,
  },
  {
    id: "parallel-preload-decode-contention",
    title: "Do not preload every heavy media asset at once",
    signals: ["preload", "video", "media", "decode", "boot", "assets", "loading"],
    patternIds: ["staged-resource-boot", "scene-neighborhood-window", "transition-preload-race"],
    sourceReferenceIds: ["codrops-self-doubt-game", "codrops-shopify-spring26"],
    failure: "Aggressive parallel preloading makes network, decode and main-thread work collide, creating a worse first experience than staged loading.",
    diagnosis: "The loader optimizes for 'all bytes requested' instead of first meaningful state, likely next state and decoder/CPU contention.",
    recovery: [
      "Load the first meaningful visual state first, then sequence heavy media according to scene proximity and likelihood.",
      "Keep the next transition neighborhood warm rather than the entire experience.",
      "Measure CPU/decode contention as well as network completion time.",
    ],
    confidence: 0.98,
  },
  {
    id: "multiple-canvas-context-proliferation",
    title: "Do not create a WebGL context for every immersive section",
    signals: ["canvas", "webgl", "section", "multiple", "context", "renderer", "page"],
    patternIds: ["single-canvas-multi-view", "dom-proxy-spatial-alignment", "render-pass-ownership"],
    sourceReferenceIds: ["codrops-ink-games", "source-14islands-r3f-scroll-rig"],
    failure: "Section-by-section canvases multiply contexts, resource ownership, event bridges and render loops while making transitions between sections harder to coordinate.",
    diagnosis: "Local implementation convenience is being optimized at the expense of page-level rendering coherence.",
    recovery: [
      "Use one persistent renderer and give section-owned scenes explicit viewport/scissor or layer ownership.",
      "Track DOM proxy bounds and visibility to render only the active spatial regions.",
      "Keep section scene resources disposable even when renderer ownership is global.",
    ],
    confidence: 0.995,
  },
  {
    id: "high-frequency-react-layout-thrash",
    title: "Do not route per-frame visual state through reconciliation or repeated layout measurement",
    signals: ["react", "scroll", "pointer", "getboundingclientrect", "layout", "frame", "uniform"],
    patternIds: ["imperative-hot-path-state", "dom-proxy-spatial-alignment", "input-work-on-demand"],
    sourceReferenceIds: ["codrops-shopify-spring26", "source-14islands-r3f-scroll-rig"],
    failure: "Per-frame state updates and layout reads create unnecessary reconciliation/layout cost exactly where scroll, pointer and WebGL work are already busiest.",
    diagnosis: "Stable layout geometry and transient visual state are being treated as the same kind of reactive data.",
    recovery: [
      "Measure stable DOM geometry on layout/reflow and combine it with shared scroll state instead of rereading layout every frame.",
      "Keep shader uniforms, camera offsets and transient transforms in imperative runtime state/refs.",
      "Keep semantic outcomes such as selection/navigation declarative.",
    ],
    confidence: 0.995,
  },
  {
    id: "content-trapped-in-spatial-ui",
    title: "Do not make spatial exploration the only way to reach essential information",
    signals: ["hotspot", "world", "navigation", "content", "explore", "3d", "accessibility"],
    patternIds: ["context-layer-over-world", "dom-webgl-contract", "content-intensity-render-mode"],
    sourceReferenceIds: ["dogstudio-dept-pioneer", "dogstudio-virgin-galactic", "dept-expo-dubai"],
    failure: "High-intent visitors must hunt through a 3D world for information that should be directly reachable, turning immersion into friction.",
    diagnosis: "The spatial metaphor has taken ownership of information architecture instead of enhancing it.",
    recovery: [
      "Keep direct semantic routes, menus or content panels alongside exploration.",
      "Use hotspots to add spatial context, not to make basic product/case-study information inaccessible elsewhere.",
      "Let dense/practical chapters switch to a quieter information mode without abandoning the world identity.",
    ],
    confidence: 0.99,
  },
  {
    id: "mid-scene-loading-breaks-story",
    title: "Do not reveal a cinematic chapter before its critical media state is ready",
    signals: ["loading", "mid-scene", "assets", "transition", "stutter", "preload", "cinematic"],
    patternIds: ["transition-readiness-gate", "scene-neighborhood-window", "staged-resource-boot", "prewarm-signature-systems"],
    sourceReferenceIds: ["codrops-the-spark", "codrops-shopify-spring26"],
    failure: "Assets or scene systems visibly load in the middle of a directed sequence, breaking the sense that the experience is one continuous authored world.",
    diagnosis: "The experience starts the chapter based on scroll position alone instead of combining narrative position with destination readiness.",
    recovery: [
      "Start loading likely destination state before the chapter boundary and gate the visual handoff on critical readiness.",
      "Expose a preload option or smaller initial quality path when bandwidth differences are large.",
      "Move pure preparation/decode work off the main thread where profiling shows it collides with the transition.",
    ],
    confidence: 0.985,
  }
];

export function failureLessonsForTreatment(
  treatment: DirectorTreatment,
  activePatternIds: string[],
  limit = 6,
) {
  const selectedTerritory = treatment.territories.find(
    (territory) => territory.id === treatment.selectedTerritoryId,
  );
  const text = [
    treatment.projectType,
    treatment.thesis,
    treatment.signatureMoment.name,
    treatment.signatureMoment.description,
    selectedTerritory?.visualPremise ?? "",
    ...treatment.grammar.composition,
    ...treatment.grammar.motion,
    ...treatment.grammar.transitions,
    ...treatment.grammar.interaction,
    ...treatment.grammar.spatial,
  ].join(" ").toLowerCase();
  const active = new Set(activePatternIds);

  return immersiveFailureKnowledge
    .map((lesson) => {
      let score = lesson.confidence;
      for (const patternId of lesson.patternIds) {
        if (active.has(patternId)) score += 1.5;
      }
      for (const signal of lesson.signals) {
        if (text.includes(signal.toLowerCase())) score += 0.35;
      }
      return { lesson, score };
    })
    .filter(({ score }) => score > 1.2)
    .sort((a, b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id))
    .slice(0, limit)
    .map(({ lesson }) => lesson);
}
