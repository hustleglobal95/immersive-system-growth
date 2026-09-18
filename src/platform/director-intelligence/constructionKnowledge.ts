import type { DirectorTreatment } from "@/src/platform/directorSchema";
import { retrieveImmersiveReferences } from "@/src/platform/director-intelligence/referenceCorpus";

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
    id: "immersive-without-webgl",
    title: "Immersion without mandatory WebGL",
    signals: ["editorial", "calm", "typography", "premium", "pedigree", "content", "story"],
    composition: [
      "Start with art direction, hierarchy, crop, overlap and whitespace; only introduce WebGL when it adds a capability the composition actually needs.",
    ],
    motion: [
      "A restrained sequence of DOM/media reveals can be more immersive than a permanent 3D scene when the content depends on confidence, pedigree or editorial rhythm.",
    ],
    transitions: [
      "Use media edges, tonal changes, sticky composition and controlled overlap before reaching for a full 3D transition.",
    ],
    interaction: [],
    implementation: [
      "Prefer the lightest Forge-native medium that can express the idea: DOM transforms and masks first, video or shader atmosphere second, full 3D when perspective/material/spatial continuity requires it.",
    ],
    mobile: [
      "DOM-first immersive chapters should keep the same hierarchy and reading rhythm on mobile with reduced travel and overlap.",
    ],
    avoid: ["Adding WebGL merely to make a page qualify as immersive.", "Using technical complexity as a substitute for visual hierarchy."],
  },
  {
    id: "single-world-under-interface",
    title: "Single persistent world under interface",
    signals: ["planet", "world", "environment", "persistent", "saas", "interface", "hero", "scene"],
    composition: [
      "Let one persistent spatial subject or world carry multiple chapters while semantic interface and copy change above it.",
      "Add local detail to the same world before introducing unrelated hero objects.",
    ],
    motion: [
      "Reframe, rotate, sink, raise or move the persistent world with narrative progress instead of remounting a new scene for every section.",
    ],
    transitions: [
      "Use camera framing, lighting, atmosphere and object position to signal chapter changes while the world remains continuous.",
    ],
    interaction: [
      "Pointer response should modify the persistent world subtly without taking ownership away from scroll progression.",
    ],
    implementation: [
      "Keep the persistent scene on Forge's shared canvas and let DOM chapters sample the same normalized progress.",
    ],
    mobile: [
      "Crop and reframe the world for portrait while preserving its continuity across chapters.",
    ],
    avoid: ["Mounting a separate 3D canvas per section.", "Replacing the central world with unrelated effects at every scroll boundary."],
  },
  {
    id: "responsive-organic-backdrop",
    title: "Responsive organic backdrop",
    signals: ["organic", "flower", "fluid", "field", "cursor", "background", "living"],
    composition: [
      "Place the responsive organic system behind semantic typography so it provides atmosphere and depth without taking over the reading plane.",
    ],
    motion: [
      "Use slow autonomous motion as the baseline and let visitor input perturb it locally rather than drive the entire frame directly.",
    ],
    transitions: [
      "Fade or morph the field's energy, scale or color as a chapter handoff while preserving the same underlying system when continuity helps.",
    ],
    interaction: [
      "Treat cursor position or velocity as one coherent force with damping and a clear return to rest.",
    ],
    implementation: [
      "A shader or lightweight particle field is sufficient when the effect needs response and atmosphere but not full 3D geometry.",
    ],
    mobile: [
      "Translate hover response into low-amplitude autonomous motion, scroll influence or touch position rather than leaving a dead effect.",
    ],
    avoid: ["Cursor-following noise on every decorative element.", "Putting high-frequency shader detail directly behind body copy."],
  },
  {
    id: "scroll-reposition-not-reset",
    title: "Scroll repositions instead of resetting",
    signals: ["scroll", "persistent", "camera", "object", "planet", "product", "world"],
    composition: [
      "Treat consecutive sections as different framings of the same stage when a shared subject can maintain continuity.",
    ],
    motion: [
      "Use scroll to change camera, subject position, crop and scale continuously; avoid resetting transforms at section boundaries.",
    ],
    transitions: [
      "A chapter boundary may be expressed by crossing a framing threshold rather than fading one scene out and another in.",
      "Large scroll jumps must resolve deterministically to the correct framing without replaying intermediate time-based animation.",
    ],
    interaction: [],
    implementation: [
      "Author the whole movement from normalized progress and deterministic motion tracks so forward, reverse and restored scroll positions agree.",
    ],
    mobile: [
      "Retune path distance and framing per viewport but preserve the same sequence of spatial states.",
    ],
    avoid: ["Scene-local transform ownership that snaps at boundaries.", "Time-based transition playback detached from scroll position."],
  },
  {
    id: "gpu-progress-transforms",
    title: "GPU progress transforms",
    signals: ["particles", "points", "shader", "scroll", "morph", "field", "logo"],
    composition: [],
    motion: [
      "For large repeated systems, encode stable per-instance or per-particle attributes once and drive deformation from one normalized progress uniform.",
    ],
    transitions: [
      "Morph large particle or repeated-geometry fields through GPU interpolation rather than per-object JavaScript loops.",
    ],
    interaction: [
      "Pointer uniforms should remain bounded and shared; do not allocate or mutate thousands of vectors per event.",
    ],
    implementation: [
      "Prefer vertex-shader transforms, instancing or merged geometry for repeated scroll-driven content when visual identity does not require independent CPU objects.",
    ],
    mobile: [
      "Keep the same shader logic but reduce draw range, texture resolution, DPR or point count by device tier.",
    ],
    avoid: ["Per-frame CPU loops over large particle sets.", "Allocating temporary vectors or matrices inside the render loop."],
  },
  {
    id: "adaptive-fidelity-not-removal",
    title: "Adaptive fidelity, not concept removal",
    signals: ["mobile", "performance", "3d", "particles", "postprocessing", "scene", "quality"],
    composition: [],
    motion: [
      "Preserve the defining motion behavior across tiers while lowering render frequency, travel detail or simultaneous effects.",
    ],
    transitions: [],
    interaction: [
      "Bind pointer listeners only on devices that can use them and replace hover-only meaning with touch or scroll semantics.",
    ],
    implementation: [
      "Use one device-quality decision source for DPR, frame budget, particles, postprocessing, shadows and interaction policy.",
      "Gate rendering by visibility and hidden-tab state rather than deleting the authored scene from mobile.",
    ],
    mobile: [
      "Reduce DPR, particles, postprocessing passes and frame budget before removing the subject or signature interaction.",
    ],
    avoid: ["Desktop-quality settings on every device.", "A static blank replacement where the immersive concept could be preserved more cheaply."],
  },
  {
    id: "anchor-section-sets-system",
    title: "Anchor section sets the system",
    signals: ["section", "layout", "spacing", "motion", "system", "style", "compose"],
    composition: [
      "Choose the strongest or most distinctive chapter as the anchor for spacing, density, alignment and visual tension, then tune supporting chapters to belong to the same system.",
    ],
    motion: [
      "Let the anchor chapter establish the primary motion character; supporting sections should vary intensity without introducing unrelated animation grammar.",
    ],
    transitions: [
      "Align surrounding sections to the anchor's edges, rhythm or carried state so composition feels accumulated rather than pasted together.",
    ],
    interaction: [],
    implementation: [
      "Before adding a new section, identify which existing chapter sets the design system and inherit its tokens, timing character and spatial rules.",
    ],
    mobile: [
      "Preserve the anchor chapter's hierarchy and motion character when simplifying surrounding sections.",
    ],
    avoid: ["Treating every section as a separate template.", "Introducing a new spacing or motion grammar for each block."],
  },
  {
    id: "density-rhythm-and-silence",
    title: "Density rhythm and visual silence",
    signals: ["calm", "premium", "editorial", "gallery", "luxury", "pedigree", "story"],
    composition: [
      "Alternate dense evidence or imagery with quieter frames so the page has visual breathing room and a readable hierarchy of importance.",
      "Use whitespace, stillness or low-detail fields as intentional pacing devices.",
    ],
    motion: [
      "Reduce simultaneous motion between major peaks; a quiet chapter is an authored state, not unfinished space.",
    ],
    transitions: [
      "Use tonal or density change as a reset before the next high-information or high-motion chapter.",
    ],
    interaction: [],
    implementation: [
      "Track chapter intensity explicitly so decorative effects do not accumulate until every viewport is equally busy.",
    ],
    mobile: [
      "Mobile often needs even stronger density separation because fewer elements can coexist legibly in one frame.",
    ],
    avoid: ["Constant maximum density.", "Filling every quiet area with particles, badges or secondary copy."],
  },
  {
    id: "subject-occludes-display-type",
    title: "Subject occludes display type",
    signals: ["portrait", "character", "product", "headline", "identity", "editorial"],
    composition: [
      "Let a dominant subject overlap oversized display type so depth is created by a simple foreground/background relationship.",
      "Keep enough uncovered letterform structure that the headline remains readable even when the subject crosses it.",
    ],
    motion: [
      "Move subject and type on different curves or depths; the overlap should evolve rather than slide as one flattened group.",
    ],
    transitions: [
      "The subject silhouette or an oversized letterform can become the mask or carried edge into the next chapter.",
    ],
    interaction: [],
    implementation: [
      "Keep the type semantic DOM and place the subject in DOM media or WebGL according to whether real perspective/material response is needed.",
    ],
    mobile: [
      "Reduce the overlap and re-break the headline instead of shrinking both subject and type until the composition loses authority.",
    ],
    avoid: ["Occlusion that destroys legibility.", "Rasterizing essential display copy into the hero image."],
  },
  {
    id: "atmosphere-as-layout",
    title: "Atmosphere as layout",
    signals: ["landscape", "cosmic", "fog", "space", "world", "environment", "night", "dream"],
    composition: [
      "Use the environment's light, horizon, negative space and visual mass as layout constraints rather than placing a conventional content container on top.",
      "Place copy where the environment naturally creates contrast and breathing room.",
    ],
    motion: [
      "Let environmental motion carry much of the immersion while interface motion remains restrained.",
    ],
    transitions: [
      "Change atmosphere, horizon, exposure or environmental scale to move between chapters before adding a separate transition effect.",
    ],
    interaction: [],
    implementation: [
      "A full-bleed image, video, shader field or persistent 3D environment can all satisfy this pattern; choose the lightest medium that preserves the spatial read.",
    ],
    mobile: [
      "Re-crop the environment around its strongest negative-space pocket so copy remains integrated with the scene.",
    ],
    avoid: ["Centering a generic card over a carefully composed environment.", "Adding decorative UI that fights the scene's natural hierarchy."],
  },
  {
    id: "edge-utility-central-spectacle",
    title: "Edge utility around a central spectacle",
    signals: ["stats", "cta", "proof", "product", "visualization", "interface", "center"],
    composition: [
      "Give the central subject or visualization the largest uninterrupted area and push proof, navigation and utility toward the perimeter.",
      "Use edge-aligned information to balance the frame without boxing the hero into a card.",
    ],
    motion: [
      "Keep utility comparatively stable while the central spectacle carries the main spatial or material motion.",
    ],
    transitions: [
      "Allow the central subject to travel or transform while edge utility dissolves, swaps or reflows with lower amplitude.",
    ],
    interaction: [
      "Keep primary utility easy to hit and legible even when the central object has rich pointer behavior.",
    ],
    implementation: [
      "Use semantic DOM for edge utility and let the central subject be media or WebGL; synchronize both from the same chapter state.",
    ],
    mobile: [
      "Stack proof and CTA below or above the subject while keeping the subject visually dominant.",
    ],
    avoid: ["Turning every proof value into an equal floating card.", "Animating utility with the same amplitude as the hero."],
  },
  {
    id: "technical-chrome-world-language",
    title: "Technical chrome as world language",
    signals: ["technical", "code", "monitor", "hud", "grid", "viewfinder", "system", "data"],
    composition: [
      "Use grids, coordinates, status labels, viewfinder lines or code fragments as a coherent framing language when the brand premise genuinely supports it.",
      "Keep the technical chrome at the edges or secondary depth so the main subject remains clear.",
    ],
    motion: [
      "Technical indicators should update or drift with a consistent system logic rather than flicker randomly.",
    ],
    transitions: [
      "Carry one grid, frame, coordinate or status system across chapters to make different media feel like one instrument.",
    ],
    interaction: [
      "If the chrome reacts, tie it to a measurable state such as focus, progress, hover target or scene index.",
    ],
    implementation: [
      "Most chrome belongs in DOM/SVG; reserve WebGL for depth-dependent overlays, spatial screens or genuinely volumetric data.",
    ],
    mobile: [
      "Remove nonessential instrumentation first while preserving the core system cue and readable labels.",
    ],
    avoid: ["Fake diagnostic noise with no relation to state.", "Tiny unreadable interface text used only as decoration."],
  },
  {
    id: "procedural-field-as-hero",
    title: "Procedural field as hero",
    signals: ["particles", "field", "wave", "halo", "galaxy", "brain", "data", "energy"],
    composition: [
      "Let one large procedural form define the frame, then place copy where the field creates natural negative space or a focal void.",
      "Use one coherent field rather than several unrelated particle emitters.",
    ],
    motion: [
      "Give the field a slow baseline behavior and reserve stronger deformation for scroll thresholds or purposeful interaction.",
    ],
    transitions: [
      "Morph density, radius, aperture, energy or camera relation of the same field across chapters instead of swapping to a new effect.",
    ],
    interaction: [
      "Pointer influence should perturb one physical quantity—force, proximity, velocity or orientation—and decay smoothly.",
    ],
    implementation: [
      "Prefer GPU-side attributes, uniforms, instancing and shared render state for large repeated systems.",
    ],
    mobile: [
      "Reduce point count, DPR, bloom and update frequency while retaining the field's silhouette and focal behavior.",
    ],
    avoid: ["Several particle systems competing for attention.", "High-frequency motion that makes copy hard to read."],
  },
  {
    id: "object-prop-depth-stage",
    title: "Object plus prop depth stage",
    signals: ["product", "package", "object", "props", "floating", "commerce", "still-life"],
    composition: [
      "Use one hero object as the authority and a small number of supporting props at different depths to imply a world around it.",
      "Supporting props should reinforce material, flavor, function or brand story rather than exist as filler.",
    ],
    motion: [
      "Move props with lower authority and different parallax than the hero so the product remains the visual anchor.",
    ],
    transitions: [
      "A prop may become an occluder or transition carrier if it naturally crosses the camera or media plane.",
    ],
    interaction: [],
    implementation: [
      "Props can be 2D cutouts, video layers or 3D objects; do not promote them to full geometry when depth can be faked cleanly.",
    ],
    mobile: [
      "Reduce prop count before shrinking the hero product.",
    ],
    avoid: ["Equal visual weight for hero and props.", "Decorative floating objects with no product relationship."],
  },
  {
    id: "small-subject-big-environment",
    title: "Small subject in a large environment",
    signals: ["architecture", "travel", "hospitality", "landscape", "person", "scale", "environment"],
    composition: [
      "Make the subject deliberately small when environmental scale, isolation or destination is the message.",
      "Use foreground silhouettes, horizon and atmospheric depth to establish scale before adding explanatory UI.",
    ],
    motion: [
      "Favor patient camera or environmental movement so the viewer can register scale.",
    ],
    transitions: [
      "Travel through the environment, horizon or foreground occluder rather than cutting away from the place immediately.",
    ],
    interaction: [],
    implementation: [
      "A cinematic image/video can outperform 3D when the value is photographic atmosphere rather than interactive geometry.",
    ],
    mobile: [
      "Protect the subject's silhouette and horizon relationship in the portrait crop.",
    ],
    avoid: ["Cropping so tightly that the environment stops communicating scale.", "Overlaying large interface blocks on the subject."],
  },
  {
    id: "split-stage-editorial",
    title: "Split-stage editorial composition",
    signals: ["split", "editorial", "agency", "portfolio", "service", "product", "proof"],
    composition: [
      "Divide the frame into one quiet information plane and one high-energy visual plane instead of making every region equally expressive.",
      "Let the split be asymmetric when one side contains the signature visual.",
    ],
    motion: [
      "Keep the information plane comparatively stable while the visual plane transforms, scrubs or reacts.",
    ],
    transitions: [
      "Collapse, widen or hand off the split boundary as the page enters the next chapter.",
    ],
    interaction: [
      "Primary CTA stays on the quiet plane unless the interaction itself is the concept.",
    ],
    implementation: [
      "DOM owns the information plane; the visual plane may use image, video, shader or 3D depending on the actual effect required.",
    ],
    mobile: [
      "Stack the two planes in narrative order while preserving the contrast between quiet information and high-energy visual.",
    ],
    avoid: ["Two equally busy columns.", "Duplicating the same headline or CTA on both planes."],
  },
  {
    id: "embedded-proof-in-hero",
    title: "Embedded proof inside the hero",
    signals: ["stats", "reviews", "users", "rating", "uptime", "distance", "performance", "proof"],
    composition: [
      "Place a small amount of high-value proof inside the hero composition so credibility arrives with the promise instead of waiting for a later card grid.",
      "Treat proof as a compositional counterweight rather than a separate dashboard.",
    ],
    motion: [
      "Proof may count, update or reveal after the hero premise is understood, with lower intensity than the main subject.",
    ],
    transitions: [],
    interaction: [],
    implementation: [
      "Keep proof semantic DOM and bind animated values to deterministic chapter state or real data when available.",
    ],
    mobile: [
      "Keep only the strongest one or two proof points in the hero; move secondary metrics later in the page.",
    ],
    avoid: ["Invented metrics.", "A wall of badges or statistics before the main proposition is legible."],
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
  referenceIds: string[];
  referenceLessons: string[];
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
  const references = retrieveImmersiveReferences(treatment, 5);
  const basePatterns = selectConstructionPatterns(treatment, limit);
  const referencePatternIds = unique(
    references.flatMap(({ reference }) => reference.constructionPatternIds),
  );
  const referencedPatterns = referencePatternIds
    .map((id) => immersiveConstructionPatterns.find((pattern) => pattern.id === id))
    .filter((pattern): pattern is ImmersiveConstructionPattern => Boolean(pattern));
  const patterns = uniquePatterns([...basePatterns, ...referencedPatterns]).slice(
    0,
    Math.max(limit, 10),
  );

  return {
    patternIds: patterns.map((pattern) => pattern.id),
    referenceIds: references.map(({ reference }) => reference.id),
    referenceLessons: unique(
      references.flatMap(({ reference }) => reference.transferableLessons),
    ).slice(0, 12),
    compositionRules: unique(patterns.flatMap((pattern) => pattern.composition)),
    motionRules: unique(patterns.flatMap((pattern) => pattern.motion)),
    transitionRules: unique(patterns.flatMap((pattern) => pattern.transitions)),
    interactionRules: unique(patterns.flatMap((pattern) => pattern.interaction)),
    implementationRules: unique(patterns.flatMap((pattern) => pattern.implementation)),
    mobileRules: unique(patterns.flatMap((pattern) => pattern.mobile)),
    forbiddenPatterns: unique(patterns.flatMap((pattern) => pattern.avoid)),
  };
}

function uniquePatterns(patterns: ImmersiveConstructionPattern[]) {
  return patterns.filter(
    (pattern, index) =>
      patterns.findIndex((candidate) => candidate.id === pattern.id) === index,
  );
}

function unique(items: string[]) {
  return items.filter((item, index) => item && items.indexOf(item) === index);
}
