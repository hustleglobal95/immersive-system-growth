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
];

export function doctrineForPatterns(patternIds: string[]) {
  const active = new Set(patternIds);
  return immersiveTechnicalDoctrine.filter((item) =>
    item.patternIds.some((patternId) => active.has(patternId)),
  );
}
