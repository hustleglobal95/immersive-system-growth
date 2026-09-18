export interface ImmersiveTechnicalDoctrine {
  id: string;
  title: string;
  source: string;
  authority: "official-docs" | "web-standard";
  patternIds: string[];
  principles: string[];
  verification: string[];
}

/**
 * Non-stylistic implementation doctrine from primary technical sources.
 *
 * These records are deliberately separate from the creative reference corpus:
 * standards/framework documentation should sharpen implementation decisions,
 * but must never bias visual precedent retrieval.
 */
export const immersiveTechnicalDoctrine: ImmersiveTechnicalDoctrine[] = [
  {
    id: "three-precompile-upload",
    title: "Precompile shaders and initialize GPU resources before first-use",
    source: "https://threejs.org/docs/pages/WebGLRenderer.html",
    authority: "official-docs",
    patternIds: [
      "prewarm-signature-systems",
      "transition-readiness-gate",
      "transition-preload-race",
      "scene-neighborhood-window",
      "staged-resource-boot",
    ],
    principles: [
      "Use renderer.compileAsync when possible after the scene lighting/environment and representative camera state are configured, so shader compilation is not deferred to the visitor's first reveal.",
      "Initialize textures and render targets before the exact frame that needs them when upload/allocation cost would be visible.",
      "Prewarming is complete only when the representative state can render without avoidable shader/upload stalls.",
    ],
    verification: [
      "Cold first reveal does not produce a unique compile/upload hitch that disappears on the second pass.",
      "Critical material variants and render targets exist before their transition begins.",
    ],
  },
  {
    id: "r3f-demand-rendering",
    title: "Use demand rendering when visible pixels can come to rest",
    source: "https://r3f.docs.pmnd.rs/advanced/scaling-performance",
    authority: "official-docs",
    patternIds: [
      "freeze-static-render-work",
      "render-pass-ownership",
      "single-canvas-multi-view",
    ],
    principles: [
      "Use on-demand rendering for scenes that can become visually idle instead of paying a permanent game-loop cost.",
      "Explicitly invalidate after imperative camera/control/material mutations that React cannot observe.",
      "Schedule an invalidation before starting a synchronous animation when demand mode would otherwise miss the first visible state.",
    ],
    verification: [
      "Idle experiences stop producing WebGL frames when nothing visible changes.",
      "Imperative interactions reliably request frames and do not leave stale renders.",
    ],
  },
  {
    id: "video-frame-synchronization",
    title: "Synchronize per-frame video work to actual presented video frames",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback",
    authority: "web-standard",
    patternIds: [
      "scrubbable-media-delivery",
      "pre-rendered-sequence-for-fidelity",
      "dom-webgl-contract",
    ],
    principles: [
      "Use requestVideoFrameCallback for work that must correspond to decoded/presented video frames rather than approximating video cadence with the display requestAnimationFrame loop.",
      "Use frame metadata for diagnostics and synchronization when video drives canvas/WebGL state.",
      "Provide a compatibility path where older browser support is still required.",
    ],
    verification: [
      "Video-texture or canvas work does not update substantially faster than the source video without a reason.",
      "Scrub/playback instrumentation distinguishes decode/presentation latency from animation-loop latency.",
    ],
  },
  {
    id: "offscreen-canvas-isolation",
    title: "Move canvas rendering off-thread only for measured main-thread contention",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas",
    authority: "web-standard",
    patternIds: [
      "offscreen-render-worker",
      "render-pass-ownership",
    ],
    principles: [
      "OffscreenCanvas can decouple canvas rendering from the DOM and run rendering work in a worker, but the architecture is justified only when profiling shows useful main-thread relief.",
      "Keep DOM/input ownership on the main thread and send compact render state to the worker.",
    ],
    verification: [
      "Before/after traces show improved main-thread responsiveness or long-task behavior.",
      "Worker messaging is bounded and does not serialize large scene graphs per frame.",
    ],
  },
  {
    id: "gsap-one-heartbeat",
    title: "Coordinate high-frequency motion through one animation heartbeat",
    source: "https://gsap.com/docs/v3/GSAP/gsap.ticker/",
    authority: "official-docs",
    patternIds: [
      "prioritized-frame-pipeline",
      "motion-grammar-primitives",
      "dom-webgl-contract",
    ],
    principles: [
      "Use the shared GSAP ticker when custom high-frequency logic must stay synchronized with GSAP's global animation timing.",
      "Treat lag smoothing as timeline synchronization behavior, not as a frame-rate optimizer.",
      "Do not create independent requestAnimationFrame clocks for systems that are expected to stay phase-locked with the Forge motion timeline.",
    ],
    verification: [
      "Scroll/motion/WebGL integrations that should be synchronized share the same timing source or an explicit deterministic bridge.",
      "Hidden duplicate animation loops are absent from production runtime paths unless they have a documented ownership reason.",
    ],
  },
  {
    id: "gsap-high-frequency-setters",
    title: "Optimize repeated property writes only where profiling says they are hot",
    source: "https://gsap.com/docs/v3/GSAP/gsap.quickSetter%28%29/",
    authority: "official-docs",
    patternIds: [
      "interactive-field-restraint",
      "motion-grammar-primitives",
      "input-work-on-demand",
      "imperative-hot-path-state",
    ],
    principles: [
      "For extremely frequent writes to the same transform/style property, use a prepared setter path rather than repeatedly invoking general-purpose convenience work.",
      "Do not prematurely replace ordinary GSAP calls; reserve the optimization for measured pointer/frame hot paths.",
    ],
    verification: [
      "High-frequency pointer/motion handlers avoid unnecessary allocation/parsing work.",
      "The optimized path remains bounded/clamped before writing visual state.",
    ],
  },
  {
    id: "refresh-rate-independent-time",
    title: "Advance animation from elapsed time, not assumed frame count",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame",
    authority: "web-standard",
    patternIds: [
      "prioritized-frame-pipeline",
      "procedural-motion-parameters",
      "audio-reactive-semantic-band",
    ],
    principles: [
      "Use the requestAnimationFrame timestamp or a shared delta-time source when advancing time-based motion so 120/144Hz displays do not run effects faster than 60Hz displays.",
      "Separate deterministic scroll progress from elapsed-time ambience so reverse reconstruction remains exact.",
    ],
    verification: [
      "Time-based motion has comparable real-world speed across common refresh rates.",
      "Scroll-bound states do not accumulate frame-rate-dependent integration error.",
    ],
  },
  {
    id: "three-compressed-runtime-assets",
    title: "Choose GPU-friendly texture and mesh compression with decode cost in mind",
    source: "https://threejs.org/docs/pages/KTX2Loader.html",
    authority: "official-docs",
    patternIds: [
      "source-structure-to-runtime-format",
      "adaptive-fidelity-not-removal",
      "staged-resource-boot",
      "hero-scan-optimization",
    ],
    principles: [
      "Use KTX2/Basis textures when GPU texture compression materially reduces transfer and GPU memory pressure, and detect supported output formats against the actual renderer before loading.",
      "Use Draco when geometry transfer savings justify client decode time; reuse one decoder instance rather than repeatedly loading decoder infrastructure.",
      "Treat compression as a trade between bytes, decode latency, GPU upload cost and quality rather than maximizing compression ratio blindly.",
    ],
    verification: [
      "Texture formats are selected against renderer support and the chosen mobile tier does not silently fall back to oversized uncompressed textures.",
      "Cold asset decode and GPU upload are measured separately from network transfer.",
      "Decoder/transcoder infrastructure is reused instead of recreated per asset.",
    ],
  },
  {
    id: "three-batching-instancing",
    title: "Reduce draw calls with instancing or batching when object independence allows it",
    source: "https://threejs.org/docs/pages/BatchedMesh.html",
    authority: "official-docs",
    patternIds: [
      "static-geometry-batching",
      "gpu-instance-data-packing",
      "spatial-metaphor-compression",
    ],
    principles: [
      "Use InstancedMesh when repeated objects share geometry/material and differ primarily by transforms or compact per-instance state.",
      "Use BatchedMesh when many objects share a material but use different geometries or transforms and can share one batched render path.",
      "Do not batch away interaction, animation or visibility ownership that the experience genuinely needs.",
    ],
    verification: [
      "renderer.info draw-call counts fall after batching/instancing without breaking independent interaction requirements.",
      "Batch boundaries follow runtime material/state ownership, not arbitrary DCC grouping.",
    ],
  },
  {
    id: "media-capability-selection",
    title: "Select cinematic media variants by expected decode quality, not codec support alone",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo",
    authority: "web-standard",
    patternIds: [
      "mobile-medium-substitution",
      "pre-rendered-sequence-for-fidelity",
      "scrubbable-media-delivery",
      "choose-medium-by-capability",
    ],
    principles: [
      "Query candidate media configurations for support, expected smoothness and power efficiency when choosing high-cost cinematic video variants.",
      "Prefer the highest-quality configuration expected to remain smooth on the device rather than serving one universal master.",
      "Keep a conservative fallback path because capability predictions and browser support are not perfect.",
    ],
    verification: [
      "Chosen media variants are supported and expected to decode smoothly at their declared resolution, bitrate and frame rate.",
      "Mobile/high-density variants are tested on real devices instead of assuming desktop decode behavior.",
    ],
  },
  {
    id: "page-visibility-suspension",
    title: "Suspend work when the document cannot produce visible pixels",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API",
    authority: "web-standard",
    patternIds: [
      "freeze-static-render-work",
      "render-pass-ownership",
      "scene-neighborhood-window",
      "prioritized-frame-pipeline",
    ],
    principles: [
      "Use document visibility state to pause or reduce nonessential rendering, simulation, audio-reactive analysis and polling while the page is hidden.",
      "Resume from explicit state rather than integrating a large hidden-tab delta as if every missed frame had rendered.",
    ],
    verification: [
      "Hidden tabs stop unnecessary renderer/simulation work.",
      "Returning to the tab does not cause a giant time-step jump or burst of queued work.",
    ],
  },
  {
    id: "reduced-motion-substitution",
    title: "Replace nonessential motion while preserving information and causality",
    source: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion",
    authority: "web-standard",
    patternIds: [
      "mobile-preserve-concept",
      "responsive-authored-compositions",
      "motion-grammar-primitives",
      "choose-medium-by-capability",
    ],
    principles: [
      "Treat prefers-reduced-motion as a request to remove, reduce or replace nonessential motion rather than as permission to hide content.",
      "Avoid large-scale panning/scaling motion that can create vestibular discomfort when reduced motion is requested.",
      "Preserve reading order, state change, interaction outcome and navigation even when the cinematic motion path is replaced.",
    ],
    verification: [
      "Every scene remains understandable and navigable with reduced motion enabled.",
      "Large camera/object travel has a lower-motion substitute rather than disappearing into an empty state.",
    ],
  },
  {
    id: "audio-analysis-smoothing",
    title: "Smooth audio analysis before it becomes visual motion",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant",
    authority: "web-standard",
    patternIds: [
      "audio-reactive-semantic-band",
      "interaction-as-thesis",
    ],
    principles: [
      "Use time averaging for spectrum/energy data so visual response follows musical or vocal energy instead of raw frame-to-frame FFT noise.",
      "Map only the frequency/energy band that has semantic relevance to the visual behavior and clamp the resulting motion range.",
    ],
    verification: [
      "Audio-reactive values return to rest smoothly and do not flicker on individual FFT-bin noise.",
      "The same track produces stable visual character across common frame rates.",
    ],
  },
  {
    id: "view-transition-lifecycle",
    title: "Treat browser view transitions as a readiness transaction",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition",
    authority: "web-standard",
    patternIds: [
      "transition-readiness-gate",
      "transition-preload-race",
      "mode-switch-preserves-context",
    ],
    principles: [
      "For same-document transitions, mutate the DOM inside the view-transition update callback so the browser captures coherent before/after states.",
      "Use transition readiness and completion signals as lifecycle boundaries; do not assume a visual duration proves destination readiness.",
      "Keep a no-View-Transition fallback because support and partial features still vary.",
    ],
    verification: [
      "The old and new DOM states captured by the transition correspond to the intended route/mode states.",
      "Unsupported browsers still receive a complete navigable route change.",
    ],
  },
  {
    id: "renderer-info-budgeting",
    title: "Measure renderer memory and draw work at the frame where it matters",
    source: "https://threejs.org/docs/pages/WebGLRenderer.html",
    authority: "official-docs",
    patternIds: [
      "freeze-static-render-work",
      "render-pass-ownership",
      "static-geometry-batching",
      "adaptive-fidelity-not-removal",
      "prewarm-signature-systems",
    ],
    principles: [
      "Use renderer.info to track geometries, textures, programs, calls and primitive counts while profiling representative scene states.",
      "For multi-pass frames, control renderer.info reset boundaries so measurements represent one complete authored frame rather than one subpass.",
      "Use the metrics as attribution signals alongside CPU/frame traces; they are not a substitute for real device profiling.",
    ],
    verification: [
      "Representative desktop/mobile scene states have recorded draw-call, primitive and texture/geometry counts.",
      "Transition overlap frames are measured separately from steady-state frames.",
      "Program/texture counts remain stable after prewarm when no new visual capability should appear.",
    ],
  },
  {
    id: "gsap-responsive-lifecycle",
    title: "Create and clean responsive motion as one lifecycle",
    source: "https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/",
    authority: "official-docs",
    patternIds: [
      "responsive-authored-compositions",
      "mobile-medium-substitution",
      "motion-grammar-primitives",
      "scroll-distance-pacing",
    ],
    principles: [
      "Use responsive motion setup that owns both creation and automatic cleanup/revert when breakpoint or accessibility conditions change.",
      "Do not accumulate ScrollTriggers/tweens when the viewport crosses breakpoints repeatedly.",
      "Author different motion logic where the composition changes materially; responsivity is not limited to numeric scaling.",
    ],
    verification: [
      "Crossing desktop/mobile breakpoints repeatedly does not multiply active triggers or leave stale transforms/pins behind.",
      "Mobile and reduced-motion conditions rebuild the intended motion system from a clean state.",
    ],
  },
  {
    id: "intersection-activation-window",
    title: "Use visibility thresholds for activation and prewarm windows",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API",
    authority: "web-standard",
    patternIds: [
      "freeze-static-render-work",
      "scene-neighborhood-window",
      "single-canvas-multi-view",
      "staged-resource-boot",
      "prewarm-signature-systems",
    ],
    principles: [
      "Use IntersectionObserver thresholds for coarse visibility state instead of polling layout every frame when continuous geometry is not required.",
      "Use positive rootMargin/scrollMargin to create a prewarm window before a heavy section becomes visible.",
      "Reserve trackVisibility for cases that truly need visual-compromise checks because the calculation is more expensive.",
    ],
    verification: [
      "Heavy scenes begin prewarm before first visible pixels and stop nonessential work after leaving the active window.",
      "Visibility callbacks are threshold-driven rather than used as a replacement high-frequency scroll sampler.",
    ],
  },
  {
    id: "image-decode-before-swap",
    title: "Decode critical replacement images before revealing them",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode",
    authority: "web-standard",
    patternIds: [
      "transition-readiness-gate",
      "transition-preload-race",
      "progressive-fidelity-stack",
      "pre-rendered-sequence-for-fidelity",
    ],
    principles: [
      "Use image decode readiness as part of a destination/replacement readiness gate when an image must appear without a first-frame decode hitch.",
      "For progressive fidelity, decode the higher-resolution replacement before swapping it into the visible composition.",
    ],
    verification: [
      "Critical image swaps are gated on successful decode or a documented fallback path.",
      "Cold navigation/reveal traces do not show a large image-decode task on the first visible frame.",
    ],
  },
  {
    id: "network-information-is-a-hint",
    title: "Treat network/save-data signals as optional hints, never as the only quality detector",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API",
    authority: "web-standard",
    patternIds: [
      "adaptive-fidelity-not-removal",
      "staged-resource-boot",
      "mobile-medium-substitution",
    ],
    principles: [
      "Network Information and saveData can inform asset policy where supported, but they are not Baseline and must never be the only path for quality selection.",
      "Combine optional network hints with deterministic defaults, viewport/device policy, measured runtime behavior and explicit user preferences.",
      "A Save-Data request should reduce transfer-heavy optional media/effects before removing essential content.",
    ],
    verification: [
      "The experience has a complete quality path when navigator.connection/saveData are unavailable.",
      "Save-Data or slow-connection hints reduce optional asset cost without changing essential information or navigation.",
    ],
  },
  {
    id: "gltf-disposal-contract",
    title: "Dispose glTF resources explicitly when scene windows unload",
    source: "https://threejs.org/docs/pages/GLTFLoader.html",
    authority: "official-docs",
    patternIds: [
      "scene-neighborhood-window",
      "multi-subscene-transition-budget",
      "staged-resource-boot",
      "source-structure-to-runtime-format",
    ],
    principles: [
      "Treat glTF scene disposal as explicit runtime ownership; image bitmaps and GPU resources are not guaranteed to disappear merely because a scene object is unreferenced.",
      "Track which scene owns geometries, materials, textures, render targets and decoded media so leaving the active neighborhood can release them safely.",
      "Reuse shared assets deliberately; do not dispose a resource while another active scene still owns it.",
    ],
    verification: [
      "Repeated forward/backward traversal through scene windows does not produce monotonically increasing renderer.info memory counts.",
      "Disposed scenes release scene-owned GPU resources while shared resources remain valid.",
    ],
  },
  {
    id: "three-static-transform-control",
    title: "Stop recomputing transforms for scene nodes that truly do not move",
    source: "https://threejs.org/docs/pages/Object3D.html",
    authority: "official-docs",
    patternIds: [
      "freeze-static-render-work",
      "static-geometry-batching",
      "scene-neighborhood-window",
    ],
    principles: [
      "For scene nodes whose local/world transforms are genuinely static, matrixAutoUpdate and matrixWorldAutoUpdate can be disabled and matrices updated explicitly when state changes.",
      "Use manual matrix control surgically; dynamic hierarchies still need correct parent/child world updates.",
      "Frustum visibility, animation, physics or interaction may invalidate the assumption that a node is static.",
    ],
    verification: [
      "Static scene groups no longer recompute transforms continuously, while moved parents/children still receive correct explicit matrix updates.",
      "Visual and raycast results remain correct after any authored state change that repositions a manually-managed node.",
    ],
  },
  {
    id: "video-frame-callback-sync",
    title: "Synchronize video-dependent visual work to decoded/composited frames",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback",
    authority: "web-standard",
    patternIds: [
      "scrubbable-media-delivery",
      "shared-media-source-mapping",
      "layered-video-state-machine",
    ],
    principles: [
      "Use requestVideoFrameCallback when canvas/WebGL work must respond to actual presented video frames rather than polling currentTime from the display refresh loop.",
      "Video-frame callbacks follow the lower of media frame rate and browser paint rate, so avoid redundant processing at 60/120Hz when source footage is slower.",
      "Cancel callbacks when the media/scene is inactive.",
    ],
    verification: [
      "Video-driven canvas/WebGL updates occur only when a new presented frame is available.",
      "Inactive or disposed media cancels its outstanding callback loop.",
    ],
  },
  {
    id: "resize-observer-layout-sync",
    title: "Invalidate spatial layout from element resize events instead of polling geometry",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API",
    authority: "web-standard",
    patternIds: [
      "dom-proxy-spatial-alignment",
      "design-grid-runtime-contract",
      "physics-proxy-dom",
      "responsive-authored-compositions",
    ],
    principles: [
      "Use ResizeObserver for element-size changes that can invalidate WebGL proxy bounds, physics colliders or authored layout measurements.",
      "Keep continuous scroll motion separate from layout measurement; resize/reflow events update stable geometry, while the shared scroll coordinate handles movement.",
    ],
    verification: [
      "Font, CMS content and container-size changes trigger a bounded reflow/update without a permanent getBoundingClientRect polling loop.",
      "DOM/WebGL and DOM/physics alignment remains correct after responsive content changes.",
    ],
  },
  {
    id: "content-visibility-long-page",
    title: "Let the browser skip offscreen DOM layout/paint work on long semantic pages",
    source: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility",
    authority: "web-standard",
    patternIds: [
      "freeze-static-render-work",
      "content-intensity-render-mode",
      "context-layer-over-world",
    ],
    principles: [
      "content-visibility:auto can allow long offscreen semantic sections to skip layout/paint work while remaining available to accessibility and find-in-page behavior.",
      "Pair skipped content with appropriate intrinsic sizing so scroll geometry does not jump as sections become relevant.",
      "Use contentvisibilityautostatechange as an optional signal to suspend matching canvas/process work when a section is skipped.",
    ],
    verification: [
      "Long editorial pages preserve stable scroll geometry and keyboard/find accessibility while offscreen rendering work decreases.",
      "Canvas or simulation processes tied to skipped sections stop and restart without losing semantic state.",
    ],
  },
  {
    id: "imagebitmap-worker-preparation",
    title: "Prepare image data asynchronously and release bitmap resources explicitly",
    source: "https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap",
    authority: "web-standard",
    patternIds: [
      "offscreen-render-worker",
      "source-structure-to-runtime-format",
      "shared-media-source-mapping",
      "staged-resource-boot",
    ],
    principles: [
      "ImageBitmap provides an asynchronous, transferable path for preparing image data for canvas/WebGL and can be created in workers.",
      "Use bitmap cropping/resizing when preprocessing atlases or texture inputs off the main thread is beneficial.",
      "Call ImageBitmap.close when a prepared bitmap is no longer needed so associated graphics resources can be released.",
    ],
    verification: [
      "Worker-prepared image assets do not duplicate large decode work on the main thread.",
      "Disposed scene/media batches close temporary ImageBitmap resources they own.",
    ],
  }
];

export function doctrineForPatterns(patternIds: string[]) {
  const active = new Set(patternIds);
  return immersiveTechnicalDoctrine.filter((item) =>
    item.patternIds.some((patternId) => active.has(patternId)),
  );
}
