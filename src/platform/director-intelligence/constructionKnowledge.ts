import type { DirectorTreatment } from "@/src/platform/directorSchema";

export interface ImmersiveConstructionPattern {
  id: string;
  title: string;
  projectTypes?: DirectorTreatment["projectType"][];
  signals: string[];
  composition: string[];
  motion: string[];
  transitions: string[];
  interaction: string[];
  implementation: string[];
  mobile: string[];
  avoid: string[];
}

/**
 * Construction knowledge is deliberately library-agnostic.
 * These patterns describe how premium immersive sites are composed with the
 * Forge systems that already exist: DOM, R3F/Three, GSAP, deterministic motion
 * tracks, shaders, media, masks and the persistent experience timeline.
 */
export const immersiveConstructionPatterns: ImmersiveConstructionPattern[] = [
  {
    id: "continuous-visual-anchor",
    title: "Continuous visual anchor",
    signals: ["continuous", "cinematic", "immersive", "persistent", "journey", "story"],
    composition: [
      "Carry one recognizable visual anchor across adjacent chapters so the page reads as one experience instead of stacked sections.",
      "Let the next chapter inherit position, color, subject, horizon or framing from the previous chapter before introducing new information.",
    ],
    motion: [
      "Move the persistent anchor continuously through scene boundaries; avoid resetting it to a default transform at each chapter.",
    ],
    transitions: [
      "Use occlusion, threshold passage, object handoff, scale-through or environment change before considering a full-frame opacity fade.",
      "Backward scroll must reconstruct the same spatial handoff in reverse.",
    ],
    interaction: [],
    implementation: [
      "Drive persistent DOM and WebGL state from the same normalized experience progress and deterministic scene sample.",
    ],
    mobile: [
      "Preserve the anchor and narrative handoff on mobile even when the camera path or effect complexity is reduced.",
    ],
    avoid: ["Independent hero cards separated by unrelated fade-ins.", "Camera or subject resets without narrative motivation."],
  },
  {
    id: "editorial-depth-stack",
    title: "Editorial depth stack",
    signals: ["editorial", "premium", "studio", "agency", "portfolio", "fashion", "luxury"],
    composition: [
      "Build the frame in depth: background atmosphere, primary media or subject, semantic copy, then a restrained foreground detail or occluder.",
      "Use asymmetric negative space intentionally; one large dominant element should carry more authority than several equal cards.",
    ],
    motion: [
      "Separate depth layers by motion amplitude and timing instead of applying the same reveal to every element.",
      "Typography should settle on a different curve from media so the composition feels directed rather than grouped.",
    ],
    transitions: ["Allow foreground or media edges to become transition masks when moving into the next chapter."],
    interaction: [],
    implementation: [
      "Keep copy and conversion controls in DOM while WebGL or media supplies atmosphere, depth and material response behind or between them.",
    ],
    mobile: ["Collapse depth while preserving hierarchy: subject first, primary copy second, atmosphere third."],
    avoid: ["Three equal feature cards as the default composition.", "Applying identical parallax values to every layer."],
  },
  {
    id: "staged-subject-hero",
    title: "Staged subject hero",
    projectTypes: ["product", "automotive", "brand", "saas", "portfolio", "fashion", "commerce"],
    signals: ["product", "object", "hero", "glass", "model", "device", "sculpture", "character"],
    composition: [
      "Stage one dominant subject off-center and reserve roughly one major region of the frame for copy rather than filling every quadrant.",
      "Frame the subject as a photographed object with believable lens, light direction and grounding, not as a freely orbiting demo model.",
    ],
    motion: [
      "Use one motivated camera move or subject transformation as the hero event; let lighting and material response provide secondary life.",
      "Hold stillness before and after the strongest move so perceived intensity comes from contrast.",
    ],
    transitions: ["Carry the subject, its silhouette or its lighting direction into the next chapter before replacing it."],
    interaction: [
      "Give the hero one legible interaction behavior such as gaze, tilt, drag or local orbit; do not stack several competing pointer effects.",
    ],
    implementation: [
      "Prefer existing Forge camera shots, product rigs, material overrides and motion tracks before creating a new runtime controller.",
    ],
    mobile: ["Reframe the same subject for portrait composition instead of hiding the signature object."],
    avoid: ["Continuous idle orbit.", "Camera motion with no compositional or narrative purpose.", "Particles used to compensate for weak staging."],
  },
  {
    id: "type-media-countermotion",
    title: "Type and media countermotion",
    signals: ["typography", "type", "editorial", "headline", "kinetic", "manifesto", "copy"],
    composition: [
      "Use display type as a spatial object with deliberate line breaks, short measures and overlap relationships to the primary media.",
      "Let typography occupy a clear plane in front of or behind media rather than floating in an arbitrary centered stack.",
    ],
    motion: [
      "When media travels in one direction, let type settle, reveal or drift on a different axis or time constant to create controlled countermotion.",
      "Animate text by line, word group or mask only when the reveal reinforces reading order.",
    ],
    transitions: ["Use a typographic crop, baseline, oversized letterform or moving media edge as a chapter boundary when appropriate."],
    interaction: [],
    implementation: [
      "Keep final readable text semantic DOM; use transforms, clipping and deterministic progress instead of rasterizing essential copy into WebGL.",
    ],
    mobile: ["Reduce overlap and motion amplitude while preserving the same reading order and typographic hierarchy."],
    avoid: ["Every headline using the same word-by-word reveal.", "Unreadable type placed over high-frequency media without contrast control."],
  },
  {
    id: "macro-whole-rhythm",
    title: "Macro-to-whole rhythm",
    projectTypes: ["product", "automotive", "fashion", "commerce", "hospitality"],
    signals: ["detail", "material", "texture", "craft", "luxury", "macro", "close"],
    composition: [
      "Alternate intimate detail frames with authoritative whole-subject frames instead of showing the complete object at the same scale throughout.",
    ],
    motion: [
      "Use slower macro movement and more decisive whole-object movement so scale changes also change emotional tempo.",
    ],
    transitions: [
      "Let detail geometry, texture or image crop expand into the next whole frame rather than cutting to an unrelated shot.",
    ],
    interaction: ["Use pointer detail inspection only when it reveals material or product evidence."],
    implementation: [
      "For 3D subjects, change camera distance, focal character and lighting emphasis before adding additional decorative geometry.",
    ],
    mobile: ["Keep at least one intimate detail and one whole-subject beat; shorten the path between them."],
    avoid: ["A constant medium shot.", "Macro detail that carries no product or brand evidence."],
  },
  {
    id: "spatial-gallery-rhythm",
    title: "Spatial gallery rhythm",
    projectTypes: ["portfolio", "brand", "fashion", "commerce", "campaign"],
    signals: ["gallery", "projects", "work", "cases", "portfolio", "collection", "showcase"],
    composition: [
      "Present fewer items at larger scale and vary crop, alignment and depth so each project has a distinct visual role.",
      "Use whitespace and temporary visual silence between peaks; density should not remain constant for the whole page.",
    ],
    motion: [
      "Let project media travel through a shared spatial path or band rather than animating each card as an unrelated component.",
    ],
    transitions: ["Promote the selected project media to the next viewport state instead of fading the gallery out and a detail scene in."],
    interaction: ["Drag, wheel or pointer response should move the shared gallery system, not make every card independently wobble."],
    implementation: [
      "A gallery can be DOM-first with transform choreography; reserve WebGL for distortion, depth or material behavior that DOM cannot express cleanly.",
    ],
    mobile: ["Keep the gallery path legible with fewer simultaneous items and direct touch affordances."],
    avoid: ["Uniform masonry with identical reveal timing.", "Independent hover effects that destroy the sense of one spatial system."],
  },
  {
    id: "interactive-field-restraint",
    title: "Restrained interactive field",
    projectTypes: ["saas", "brand", "portfolio", "campaign"],
    signals: ["cursor", "interactive", "gradient", "field", "shader", "fluid", "particles", "background"],
    composition: [
      "Keep interactive atmosphere subordinate to the subject and copy; the effect should improve depth or material perception, not become unrelated decoration.",
    ],
    motion: [
      "Use mechanically damped pointer response with a controlled return-to-rest rather than direct one-to-one cursor chasing.",
    ],
    transitions: ["Carry the field's color, distortion or energy into the next chapter only when it supports continuity."],
    interaction: [
      "Choose one pointer quantity to emphasize—position, velocity, proximity or drag—and make its physical response consistent across the effect.",
    ],
    implementation: [
      "Drive shader response with uniforms or shared scene state; avoid per-particle CPU mutation when the same deformation can happen in the vertex shader.",
    ],
    mobile: ["Disable hover-only logic on coarse pointers and translate the idea to scroll, touch position or autonomous low-amplitude motion."],
    avoid: ["Attaching mouse listeners that do nothing useful on touch.", "High-frequency cursor noise.", "Several pointer systems reacting at once."],
  },
  {
    id: "threshold-passage",
    title: "Threshold passage",
    projectTypes: ["property", "hospitality", "campaign", "brand"],
    signals: ["enter", "threshold", "door", "portal", "arrival", "inside", "through", "reveal"],
    composition: [
      "Make the boundary itself visible or inferable so the user understands that they are crossing from one state or world into another.",
    ],
    motion: [
      "Change atmosphere before the destination is fully revealed: light, fog, sound, material or camera compression can lead the transition.",
    ],
    transitions: [
      "Move through, behind or past a real surface or occluder instead of covering the screen with an arbitrary transition layer.",
    ],
    interaction: [],
    implementation: [
      "Use Forge portal, mask, occlusion and camera-path systems as transition mechanisms; keep scene timing reversible and deterministic.",
    ],
    mobile: ["Shorten travel distance and simplify postprocessing while preserving the crossing event."],
    avoid: ["A full-screen fade used where a spatial boundary already exists.", "Teleporting the camera between unrelated environments."],
  },
  {
    id: "single-signature-peak",
    title: "Single signature peak",
    signals: ["signature", "cinematic", "premium", "launch", "reveal", "immersive"],
    composition: [
      "Protect one highest-intensity visual moment and let surrounding chapters create contrast for it.",
    ],
    motion: [
      "Do not keep every section at maximum animation intensity; stillness and low-motion chapters are part of the choreography.",
    ],
    transitions: ["Build toward and recover from the signature moment instead of treating it as an isolated demo."],
    interaction: ["Visitor control may become lighter during the signature beat when a directed sequence is necessary for legibility."],
    implementation: [
      "Spend custom shaders, highest-fidelity assets and expensive effects on the protected signature moment before decorative secondary sections.",
    ],
    mobile: ["Preserve the idea of the signature moment even if the rendering method changes."],
    avoid: ["Every section trying to be the hero.", "Constant camera motion.", "Effect density with no hierarchy."],
  },
  {
    id: "dom-webgl-contract",
    title: "DOM/WebGL role contract",
    signals: ["webgl", "three", "3d", "shader", "scene", "canvas", "immersive"],
    composition: [
      "Use DOM for language, controls and exact editorial composition; use WebGL for depth, light, material, perspective and continuous spatial state.",
    ],
    motion: [
      "DOM and WebGL may use different curves, but both must sample the same narrative progress and agree on chapter boundaries.",
    ],
    transitions: [
      "When a DOM element appears to enter WebGL, define the handoff explicitly with matching position, scale, crop and timing on both sides.",
    ],
    interaction: [
      "Essential actions must remain available in semantic DOM even when the visible affordance is associated with a 3D target.",
    ],
    implementation: [
      "Do not create a second playback clock for a shader, video or 3D interaction; bind it to Forge progress, motion tracks or the interaction graph.",
    ],
    mobile: ["Prefer a simpler rendering implementation over removing the narrative content or interaction outcome."],
    avoid: ["Duplicated independent timelines.", "Essential copy baked into a texture.", "WebGL-only conversion controls."],
  },
  {
    id: "mobile-preserve-concept",
    title: "Mobile preserves the concept",
    signals: ["mobile", "responsive", "portrait", "touch"],
    composition: [
      "Treat mobile as a re-directed composition, not a scaled desktop screenshot.",
    ],
    motion: [
      "Reduce simultaneous movement, travel distance, DPR and expensive effects before removing the defining motion idea.",
    ],
    transitions: ["Keep the same narrative cause-and-effect even when the transition uses a simpler rendering technique."],
    interaction: ["Replace hover with touch, scroll or direct controls; never leave dead hover affordances."],
    implementation: [
      "Use viewport-specific motion tracks, camera framing, asset quality and postprocessing policies that already exist in Forge.",
    ],
    mobile: [
      "Preserve subject hierarchy, signature moment, reading order and conversion path before preserving decorative fidelity.",
    ],
    avoid: ["Hiding the immersive scene on mobile by default.", "Desktop camera coordinates reused unchanged in portrait."],
  },
  {
    id: "prewarm-signature-systems",
    title: "Prewarm signature systems",
    signals: ["shader", "3d", "video", "particles", "postprocessing", "cinematic", "performance"],
    composition: [],
    motion: [
      "The first time a signature visual state is reached should not also be the first time its expensive resources are decoded, uploaded or compiled.",
    ],
    transitions: [],
    interaction: [],
    implementation: [
      "Preload and warm the assets, material variants, textures and postprocessing needed by signature chapters before the visitor reaches them.",
      "Sample representative timeline states during warmup so late scene branches do not introduce first-scroll compilation or upload stalls.",
      "Measure cold-scroll versus warm-scroll behavior before claiming the experience is smooth.",
    ],
    mobile: ["Warm only the device tier's actual variants and keep quality budgets explicit."],
    avoid: ["First-use shader compilation during a scroll transition.", "Lazy media decode colliding with a reveal animation."],
  },
];

export interface ImmersiveConstructionDirectives {
  patternIds: string[];
  compositionRules: string[];
  motionRules: string[];
  transitionRules: string[];
  interactionRules: string[];
  implementationRules: string[];
  mobileRules: string[];
  forbiddenPatterns: string[];
}

export function selectConstructionPatterns(
  treatment: DirectorTreatment,
  limit = 7,
): ImmersiveConstructionPattern[] {
  const selectedTerritory = treatment.territories.find(
    (territory) => territory.id === treatment.selectedTerritoryId,
  );
  const haystack = [
    treatment.projectType,
    treatment.thesis,
    treatment.signatureMoment.name,
    treatment.signatureMoment.description,
    selectedTerritory?.oneLine ?? "",
    selectedTerritory?.visualPremise ?? "",
    ...treatment.grammar.composition,
    ...treatment.grammar.motion,
    ...treatment.grammar.transitions,
    ...treatment.grammar.interaction,
    ...treatment.grammar.spatial,
  ].join(" ").toLowerCase();

  const scored = immersiveConstructionPatterns.map((pattern) => {
    let score = 0;
    if (!pattern.projectTypes?.length) score += 0.75;
    if (pattern.projectTypes?.includes(treatment.projectType)) score += 3;
    for (const signal of pattern.signals) {
      if (haystack.includes(signal.toLowerCase())) score += 0.8;
    }
    if (pattern.id === "continuous-visual-anchor") score += 2.5;
    if (pattern.id === "dom-webgl-contract") score += 1.5;
    if (pattern.id === "single-signature-peak") score += 1.25;
    if (pattern.id === "mobile-preserve-concept") score += 1;
    return { pattern, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id))
    .slice(0, limit)
    .map(({ pattern }) => pattern);
}

export function buildConstructionDirectives(
  treatment: DirectorTreatment,
  limit = 7,
): ImmersiveConstructionDirectives {
  const patterns = selectConstructionPatterns(treatment, limit);
  return {
    patternIds: patterns.map((pattern) => pattern.id),
    compositionRules: unique(patterns.flatMap((pattern) => pattern.composition)),
    motionRules: unique(patterns.flatMap((pattern) => pattern.motion)),
    transitionRules: unique(patterns.flatMap((pattern) => pattern.transitions)),
    interactionRules: unique(patterns.flatMap((pattern) => pattern.interaction)),
    implementationRules: unique(patterns.flatMap((pattern) => pattern.implementation)),
    mobileRules: unique(patterns.flatMap((pattern) => pattern.mobile)),
    forbiddenPatterns: unique(patterns.flatMap((pattern) => pattern.avoid)),
  };
}

function unique(items: string[]) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}
