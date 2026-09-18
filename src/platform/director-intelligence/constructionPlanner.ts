import type { DirectorTreatment } from "@/src/platform/directorSchema";
import {
  buildConstructionDirectives,
  type ImmersiveConstructionDirectives,
} from "@/src/platform/director-intelligence/constructionKnowledge";

export type ImmersiveMedium =
  | "dom"
  | "media"
  | "shader"
  | "3d"
  | "hybrid";

export type ExperienceConstructionMode =
  | "editorial-immersive"
  | "cinematic-media"
  | "spatial-hybrid"
  | "multi-view-hybrid"
  | "persistent-world";

export interface SceneConstructionDecision {
  sceneId: string;
  medium: ImmersiveMedium;
  rationale: string;
  continuityAnchor: string;
  depthStrategy: string;
  motionStrategy: string;
  interactionStrategy: string;
  performancePolicy: string[];
  mobileTranslation: string[];
  evidencePatternIds: string[];
  precedentIds: string[];
}

export interface ImmersiveConstructionPlan {
  mode: ExperienceConstructionMode;
  persistentCanvasRecommended: boolean;
  maxSimultaneousHeavySystems: number;
  criticalBootStrategy: string[];
  sceneDecisions: SceneConstructionDecision[];
  globalRules: string[];
}

/**
 * Converts reference knowledge into actual construction decisions.
 *
 * This planner does not choose libraries. It decides which *medium* and
 * construction strategy each chapter needs so Forge can execute it with the
 * systems it already owns.
 */
export function planImmersiveConstruction(
  treatment: DirectorTreatment,
  directives: ImmersiveConstructionDirectives = buildConstructionDirectives(treatment),
): ImmersiveConstructionPlan {
  const assets = treatment.assets.filter((asset) =>
    ["use", "upgrade", "create"].includes(asset.productionDecision),
  );
  const hasModel = assets.some((asset) => /model|3d|glb|geometry/i.test(`${asset.label} ${asset.role}`));
  const hasVideo = assets.some((asset) => /video|film|footage|motion/i.test(`${asset.label} ${asset.role}`));
  const patternSet = new Set(directives.patternIds);
  const persistentWorld =
    patternSet.has("single-world-under-interface") ||
    patternSet.has("orthographic-diorama-staging") ||
    (
      patternSet.has("continuous-visual-anchor") &&
      hasModel &&
      ["product", "automotive", "property", "hospitality", "campaign"].includes(treatment.projectType)
    );
  const procedural =
    patternSet.has("procedural-field-as-hero") ||
    patternSet.has("responsive-organic-backdrop");
  const domFirst =
    patternSet.has("immersive-without-webgl") ||
    patternSet.has("type-is-interface") ||
    (!hasModel && !procedural);

  const mode: ExperienceConstructionMode = persistentWorld
    ? "persistent-world"
    : patternSet.has("single-canvas-multi-view") && (hasModel || procedural)
      ? "multi-view-hybrid"
      : hasModel || procedural
        ? "spatial-hybrid"
        : hasVideo
          ? "cinematic-media"
          : "editorial-immersive";

  const persistentCanvasRecommended =
    mode === "persistent-world" ||
    mode === "spatial-hybrid" ||
    mode === "multi-view-hybrid";

  const sceneDecisions = treatment.emotionalArc.map((beat, index) => {
    const shot =
      treatment.shotBible.find((candidate) => candidate.chapterId === beat.id) ??
      treatment.shotBible[index % treatment.shotBible.length];
    const signature = beat.intensity >= 9;
    const medium = chooseMedium({
      beat,
      signature,
      mode,
      hasModel,
      hasVideo,
      procedural,
      domFirst,
      patternSet,
      index,
      lastIndex: treatment.emotionalArc.length - 1,
    });
    const evidencePatternIds = chooseEvidencePatterns(
      medium,
      signature,
      directives.patternIds,
    );

    return {
      sceneId: beat.id,
      medium,
      rationale: mediumRationale({
        medium,
        signature,
        beat,
        shotSubject: shot.subject,
        mode,
      }),
      continuityAnchor: continuityAnchor(patternSet, mode, shot.subject, index),
      depthStrategy: depthStrategy(patternSet, medium),
      motionStrategy: motionStrategy(patternSet, medium, signature, beat.intensity),
      interactionStrategy: interactionStrategy(patternSet, beat.interactionLevel),
      performancePolicy: performancePolicy(patternSet, medium, signature),
      mobileTranslation: mobileTranslation(patternSet, medium, signature),
      evidencePatternIds,
      precedentIds: directives.referenceIds.slice(0, 5),
    } satisfies SceneConstructionDecision;
  });

  return {
    mode,
    persistentCanvasRecommended,
    maxSimultaneousHeavySystems:
      mode === "persistent-world"
        ? 2
        : mode === "spatial-hybrid" || mode === "multi-view-hybrid"
          ? 1
          : 0,
    criticalBootStrategy: criticalBootStrategy(patternSet, sceneDecisions),
    sceneDecisions,
    globalRules: globalRules(patternSet, directives),
  };
}

function chooseMedium(input: {
  beat: DirectorTreatment["emotionalArc"][number];
  signature: boolean;
  mode: ExperienceConstructionMode;
  hasModel: boolean;
  hasVideo: boolean;
  procedural: boolean;
  domFirst: boolean;
  patternSet: Set<string>;
  index: number;
  lastIndex: number;
}): ImmersiveMedium {
  const {
    beat,
    signature,
    mode,
    hasModel,
    hasVideo,
    procedural,
    domFirst,
    patternSet,
    index,
    lastIndex,
  } = input;

  if (patternSet.has("type-is-interface")) return "dom";

  // High-information chapters should not become 3D dashboards.
  if (beat.informationDensity >= 8 && !signature) {
    return mode === "persistent-world" ? "hybrid" : "dom";
  }

  if (mode === "persistent-world") {
    // The world can persist, but semantic information still lives in DOM.
    return "hybrid";
  }

  if (
    mode === "multi-view-hybrid" &&
    beat.intensity >= 6 &&
    beat.informationDensity <= 7
  ) {
    return "hybrid";
  }

  if (signature) {
    if (hasModel) return "hybrid";
    if (procedural) return "shader";
    if (hasVideo) return "media";
  }

  if (
    patternSet.has("immersive-rational-duality") &&
    beat.proofLevel >= 7
  ) {
    return "dom";
  }

  if (
    patternSet.has("procedural-field-as-hero") &&
    beat.informationDensity <= 6 &&
    beat.intensity >= 6
  ) {
    return "shader";
  }

  if (
    hasVideo &&
    (
      patternSet.has("pre-rendered-sequence-for-fidelity") ||
      patternSet.has("layered-video-state-machine") ||
      patternSet.has("shared-media-source-mapping")
    ) &&
    beat.intensity >= 5
  ) {
    return "media";
  }

  if (
    hasVideo &&
    (
      mode === "cinematic-media" ||
      patternSet.has("small-subject-big-environment")
    ) &&
    beat.intensity >= 5
  ) {
    return "media";
  }

  if (
    hasModel &&
    mode === "spatial-hybrid" &&
    beat.intensity >= 7 &&
    beat.informationDensity <= 6
  ) {
    return "hybrid";
  }

  if (domFirst || index === lastIndex) return "dom";
  return "dom";
}

function mediumRationale(input: {
  medium: ImmersiveMedium;
  signature: boolean;
  beat: DirectorTreatment["emotionalArc"][number];
  shotSubject: string;
  mode: ExperienceConstructionMode;
}) {
  const { medium, signature, beat, shotSubject, mode } = input;
  const role = signature ? "signature beat" : `${beat.intensity}/10 intensity beat`;
  const reasons: Record<ImmersiveMedium, string> = {
    dom: "Readable structure and editorial composition carry this chapter; heavier rendering would not improve its primary job.",
    media: "Authored cinematic motion provides the needed atmosphere and framing without paying for realtime geometry.",
    shader: "Procedural material/field behavior is the visual subject, so a shader is the lightest medium that provides the required response.",
    "3d": "The chapter requires perspective/spatial manipulation of the subject itself.",
    hybrid: "Semantic DOM and spatial rendering must coexist: DOM carries language/controls while the persistent or staged subject supplies depth.",
  };
  return `${role}; ${reasons[medium]} Subject: ${shotSubject}. Experience mode: ${mode}.`.slice(0, 500);
}

function continuityAnchor(
  patterns: Set<string>,
  mode: ExperienceConstructionMode,
  subject: string,
  index: number,
) {
  if (mode === "persistent-world") {
    return `Persistent world/subject remains the spatial reference; chapter ${index + 1} reframes it instead of resetting it.`;
  }
  if (patterns.has("persistent-device-metaphor")) {
    return "Persistent framing device remains stable while content changes inside it.";
  }
  if (patterns.has("subject-occludes-display-type")) {
    return `Carry the silhouette/position relationship between ${subject} and display type across the boundary.`;
  }
  if (patterns.has("atmosphere-as-layout")) {
    return "Carry atmosphere, horizon, light direction or color field across the boundary.";
  }
  if (patterns.has("type-media-countermotion")) {
    return "Carry a typography baseline or media edge so the next composition inherits a visible alignment.";
  }
  return "Carry one visible alignment, color, subject edge or motion direction across the boundary; do not hard-reset the frame.";
}

function depthStrategy(patterns: Set<string>, medium: ImmersiveMedium) {
  if (medium === "dom") {
    return patterns.has("split-stage-editorial")
      ? "Use a quiet information plane against one stronger visual plane; depth comes from overlap, crop, type scale and whitespace."
      : "Create depth with scale contrast, overlap, crop, negative space and controlled parallax before adding WebGL.";
  }
  if (medium === "media") {
    return "Use authored framing/crop as the primary depth source; DOM occupies a separate readable plane and foreground occlusion may bridge chapters.";
  }
  if (medium === "shader") {
    return "Keep the procedural field behind or around a stable semantic plane; use voids and gradients in the field to create readable depth.";
  }
  return "Use real perspective/material response for the subject, but preserve distinct background, subject, DOM and foreground/occluder planes.";
}

function motionStrategy(
  patterns: Set<string>,
  medium: ImmersiveMedium,
  signature: boolean,
  intensity: number,
) {
  if (signature) {
    return "One decisive transformation or camera/subject move owns the beat; supporting DOM/media settles on a separate curve with stillness before and after.";
  }
  if (medium === "dom" && patterns.has("motion-grammar-primitives")) {
    return "Use the shared project motion grammar with chapter-specific direction/amplitude; do not introduce a new ease family.";
  }
  if (medium === "hybrid" && patterns.has("scroll-reposition-not-reset")) {
    return "Reframe or reposition the persistent spatial subject while DOM countermoves or settles; both sample the same narrative progress.";
  }
  if (patterns.has("scroll-velocity-material-response")) {
    return "Absolute progress owns narrative state; velocity may modulate transient atmosphere only and decays back to rest.";
  }
  return `Use measured chapter motion proportional to intensity ${intensity}/10; movement must guide reading, depth or state change.`;
}

function interactionStrategy(patterns: Set<string>, interactionLevel: number) {
  if (patterns.has("teach-nonstandard-navigation") && interactionLevel >= 5) {
    return "Teach the nonstandard navigation with a short first-run motion cue, then hand control back immediately while keeping an alternate orientation/control path visible.";
  }
  if (patterns.has("cross-device-companion-control") && interactionLevel >= 6) {
    return "Map the companion device to semantic actions through a low-latency control channel, expose pairing/calibration state, and keep a local fallback.";
  }
  if (patterns.has("networked-presence-as-atmosphere") && interactionLevel >= 6) {
    return "Keep remote visitors as a secondary presence layer and interpolate their compact semantic state locally; direct multiplayer actions are optional unless community is the thesis.";
  }
  if (patterns.has("commerce-inside-world") && interactionLevel >= 5) {
    return "Let exploration reveal/select products, then stabilize the selected subject and hand purchase intent to clear semantic commerce controls.";
  }
  if (patterns.has("gamified-progress-with-skip") && interactionLevel >= 6) {
    return "Track explicit progression/unlock state, make rewards visibly consequential, and keep a direct skip route available for high-intent visitors.";
  }
  if (interactionLevel >= 7 && patterns.has("interaction-as-thesis")) {
    return "Use one causal interaction that changes subject/world/content state and expresses the thesis; route it through semantic action state.";
  }
  if (interactionLevel >= 5) {
    return "Allow one damped exploration behavior (inspect, drag, gaze, tilt or proximity) without changing narrative ownership.";
  }
  return "Keep visitor interaction optional and low-amplitude; directed presentation remains primary.";
}

function performancePolicy(
  patterns: Set<string>,
  medium: ImmersiveMedium,
  signature: boolean,
) {
  const rules: string[] = [];
  if (signature && patterns.has("prewarm-signature-systems")) {
    rules.push("Prewarm representative signature state before the visitor reaches it.");
  }
  if (["3d", "hybrid", "shader"].includes(medium)) {
    rules.push("Gate render/update work by visibility and device tier; do not spend frames on unchanged/offscreen systems.");
  }
  if (patterns.has("authored-spatial-activation-zones")) {
    rules.push("Use authored area/frustum zones to activate local world systems only when relevant.");
  }
  if (patterns.has("simulated-expensive-lighting")) {
    rules.push("Prefer precomputed/baked lighting or reflection states when realtime optics do not add perceptible value.");
  }
  if (patterns.has("source-structure-to-runtime-format")) {
    rules.push("Convert source assets into runtime-specific compressed/instanced representations before shipping.");
  }
  if (patterns.has("render-pass-ownership")) {
    rules.push("Inactive scenes must skip their owned simulation/render/composite passes, not merely hide final output.");
  }
  if (patterns.has("single-canvas-multi-view")) {
    rules.push("Use one shared renderer for section-scoped 3D views and render only active view rectangles.");
  }
  if (patterns.has("scrubbable-media-delivery") && medium === "media") {
    rules.push("Use interaction-optimized media encoding with short keyframe intervals and verify browser seek latency before production lock.");
  }
  if (patterns.has("pre-rendered-sequence-for-fidelity") && medium === "media") {
    rules.push("Prefetch/cache only the active frame neighborhood and verify decode memory so offline-rendered fidelity does not create a first-load stall.");
  }
  if (patterns.has("shared-media-source-mapping") && medium === "media") {
    rules.push("Decode one authored media source for synchronized multi-surface compositions and map distinct UV/crop regions instead of running duplicate decoders.");
  }
  if (patterns.has("layered-video-state-machine") && medium === "media") {
    rules.push("Preload the next authored media state before committing the interaction and keep layer clocks synchronized across prepared loop boundaries.");
  }
  if (patterns.has("offscreen-render-worker") && ["3d", "hybrid", "shader"].includes(medium)) {
    rules.push("If profiling shows main-thread contention, isolate the heavy canvas behind a narrow OffscreenCanvas/worker state protocol.");
  }
  if (patterns.has("progressive-fidelity-stack")) {
    rules.push("Promote only the active/nearby visual stack to full fidelity and simplify deeper layers until they approach focus.");
  }
  if (patterns.has("input-work-on-demand")) {
    rules.push("Gate expensive pointer hit testing/raycast work on dirty input or changed scene/camera state.");
  }
  if (patterns.has("gpu-instance-data-packing")) {
    rules.push("Pack repeated-object material/state into compact GPU attributes/atlases instead of multiplying materials and draw calls.");
  }
  if (patterns.has("shared-simulation-field")) {
    rules.push("Own expensive simulation fields once per renderer; one active driver advances/resizes the field while related effects sample it.");
  }
  if (patterns.has("scene-neighborhood-window")) {
    rules.push("Keep only the active scene and the minimum adjacent transition neighborhood resident; dispose distant scene GPU resources.");
  }
  if (patterns.has("imperative-hot-path-state")) {
    rules.push("Keep per-frame camera/uniform/pointer transforms out of component reconciliation and update them through stable refs/runtime state.");
  }
  if (patterns.has("physics-proxy-dom") && medium === "dom") {
    rules.push("If physics drives semantic DOM, run the invisible simulation only while the section can affect visible pixels and rebuild colliders after layout changes.");
  }
  if (patterns.has("transition-render-decimation") && ["3d", "hybrid", "shader"].includes(medium)) {
    rules.push("During visually busy multi-scene overlap, secondary scene render targets may update at a reduced cadence while transition progress remains full-rate; restore full cadence before the scene settles.");
  }
  if (patterns.has("networked-presence-as-atmosphere")) {
    rules.push("Represent remote visitors with compact network state and cap/interpolate visible peers locally so presence does not become a render/network bottleneck.");
  }
  return rules;
}

function mobileTranslation(
  patterns: Set<string>,
  medium: ImmersiveMedium,
  signature: boolean,
) {
  const rules = [
    "Re-author portrait framing and travel distances; do not reuse desktop coordinates unchanged.",
  ];
  if (
    patterns.has("mobile-medium-substitution") &&
    ["3d", "hybrid", "shader"].includes(medium)
  ) {
    rules.push("A lighter mobile medium may replace realtime rendering if composition, motion grammar and outcome remain equivalent.");
  } else if (["3d", "hybrid", "shader"].includes(medium)) {
    rules.push("Reduce DPR, counts, passes and simultaneous movement before removing the defining visual idea.");
  }
  if (signature) {
    rules.push("Preserve the signature event and its causal meaning even if the renderer changes.");
  }
  return rules;
}

function chooseEvidencePatterns(
  medium: ImmersiveMedium,
  signature: boolean,
  patternIds: string[],
) {
  const priorities = [
    signature ? "single-signature-peak" : "",
    medium === "dom" ? "immersive-without-webgl" : "",
    medium === "media" ? "choose-medium-by-capability" : "",
    medium === "shader" ? "procedural-field-as-hero" : "",
    medium === "hybrid" ? "dom-webgl-contract" : "",
    ...patternIds,
  ].filter(Boolean);
  return priorities.filter((id, index) => priorities.indexOf(id) === index).slice(0, 8);
}

function criticalBootStrategy(
  patterns: Set<string>,
  decisions: SceneConstructionDecision[],
) {
  const firstHeavy = decisions.find((decision) =>
    ["3d", "hybrid", "shader"].includes(decision.medium),
  );
  const rules = [
    "Load only what is required for the first meaningful visual state before releasing the opening.",
  ];
  if (patterns.has("staged-resource-boot")) {
    rules.push("Split later chapters into subsequent resource batches and initialize dependent systems only after their assets resolve.");
  }
  if (patterns.has("transition-readiness-gate")) {
    rules.push("Gate visible scene/page handoffs on the destination's critical code/media/render readiness instead of fixed delays.");
  }
  if (patterns.has("transition-preload-race")) {
    rules.push("Start destination code/data/hero-media loading with navigation intent so readiness races the outgoing transition instead of starting after it.");
  }
  if (patterns.has("scene-neighborhood-window")) {
    rules.push("Prewarm the next required scene neighborhood before overlap and release distant scenes only after reverse-safe handoff completes.");
  }
  if (patterns.has("entry-ritual-earns-its-wait")) {
    rules.push("Let the entry ritual cover only genuinely critical first-state work and hand its final frame directly into the opening composition; defer later assets.");
  }
  if (firstHeavy) {
    rules.push(`Prewarm the first heavy chapter (${firstHeavy.sceneId}) before it becomes interactive.`);
  }
  return rules;
}

function globalRules(
  patterns: Set<string>,
  directives: ImmersiveConstructionDirectives,
) {
  const rules = [
    "One narrative clock owns chapter state; DOM, media, shaders and 3D derive from it.",
    "Essential copy, navigation and conversion stay semantic DOM.",
    "Every major chapter boundary names a carried visual/spatial anchor.",
    "Use the lightest medium that provides the capability the idea actually requires.",
    "Keep one strongest signature moment and create quieter chapters around it.",
  ];
  if (patterns.has("prioritized-frame-pipeline")) {
    rules.push("Run immersive systems in explicit causal frame phases instead of independent animation loops.");
  }
  if (patterns.has("semantic-input-actions")) {
    rules.push("Map device inputs to semantic actions so controls can adapt without duplicating interaction logic.");
  }
  if (patterns.has("composable-rendering-systems")) {
    rules.push("Build scene variety from composable render/material/particle/transition capabilities instead of duplicating whole pipelines.");
  }
  if (patterns.has("scroll-distance-pacing")) {
    rules.push("Store chapter travel distance as an explicit pacing variable; tune view-height distance independently from easing and camera geometry.");
  }
  if (patterns.has("directional-cut-continuity")) {
    rules.push("Use deterministic film cuts when a one-axis scroll journey would become less legible by physically curving through every space; preserve the dominant motion direction across the cut.");
  }
  if (patterns.has("dcc-semantic-naming-contract")) {
    rules.push("Treat DCC node names as validated runtime semantics for materials, pivots, collision, zones and behavior groups.");
  }
  if (patterns.has("static-geometry-batching")) {
    rules.push("Batch static same-material geometry after authored transforms, while keeping independently interactive/animated objects separate.");
  }
  if (patterns.has("audio-reactive-semantic-band")) {
    rules.push("Smooth and bound meaningful audio energy before it modulates visuals; audio response must reinforce the subject rather than shake the interface.");
  }
  if (patterns.has("personalization-to-render-state")) {
    rules.push("Normalize personalization inputs into bounded art-directed render parameters and preserve a meaningful manual/fallback path.");
  }
  if (patterns.has("cross-device-companion-control")) {
    rules.push("Keep companion-device messages compact and semantic; the primary world owns rendering while the second device supplies control state.");
  }
  if (patterns.has("mode-switch-preserves-context")) {
    rules.push("Separate presentation mode from content selection and preserve equivalent item/focus state through any slider/list/grid mode transition.");
  }
  if (patterns.has("entry-ritual-earns-its-wait")) {
    rules.push("Treat the preloader/enter state as a prologue that establishes motion/permission context, never as decorative delay.");
  }
  if (patterns.has("storyboard-before-wireframe")) {
    rules.push("Lock the temporal storyboard—dominant subject, copy role, carried anchor, intensity and transition intent—before polishing individual section layouts.");
  }
  if (patterns.has("grid-as-orientation-memory")) {
    rules.push("Use the project grid as persistent orientation memory across chapters and align DOM/WebGL endpoints to the same runtime geometry.");
  }
  if (patterns.has("interface-recedes-behind-content")) {
    rules.push("Remove decorative chrome when strong media/spacing can carry discovery, while keeping semantic navigation and direct-access paths intact.");
  }
  if (patterns.has("sound-as-continuity-layer")) {
    rules.push("Treat ambience, interaction cues and score as stateful continuity layers tied to the same narrative phases as the visual experience.");
  }
  if (patterns.has("content-intensity-render-mode")) {
    rules.push("Match rendering intensity to the chapter's information job: practical/high-density reading gets a quieter plane, while spatial intensity is reserved for identity, system explanation and signature beats.");
  }
  if (patterns.has("commerce-inside-world")) {
    rules.push("Keep catalog, inventory, pricing and checkout in semantic commerce/data systems while the immersive world owns discovery and product context.");
  }
  if (patterns.has("networked-presence-as-atmosphere")) {
    rules.push("A shared world must remain complete in single-user mode; networked presence enriches atmosphere without becoming a hard dependency.");
  }
  if (patterns.has("design-grid-runtime-contract")) {
    rules.push("Store desktop/mobile grid geometry as runtime project data and make a development overlay inspect the exact production columns, gutters and rows.");
  }
  if (patterns.has("production-preset-parity")) {
    rules.push("Studio/playground controls and the shipped runtime must consume the same validated scene preset and deterministic motion data.");
  }
  if (patterns.has("shared-simulation-field")) {
    rules.push("Related fluid/flow effects share one renderer-level simulation field and one normalized input source instead of running duplicate simulations.");
  }
  if (patterns.has("imperative-hot-path-state")) {
    rules.push("Keep transient per-frame visual values imperative while semantic outcomes such as selection/navigation remain declarative.");
  }
  if (patterns.has("prototype-prune-converge")) {
    rules.push("Prototype signature ideas modularly and cut any effect that no longer strengthens the final thesis.");
  }
  if (directives.patternEvidence.some((item) => item.sourceCount >= 2)) {
    rules.push("Prefer construction principles supported by multiple independent sources when they also fit the client thesis.");
  }
  return rules;
}
