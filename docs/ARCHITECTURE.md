# Runtime ownership

## Studio control plane

`/studio` is the browser control plane for the runtime. It edits a versioned project document, experience and asset manifest, keeps drafts in local storage, validates imports and review publishing, and does not receive repository credentials. Timeline, direction, transition, GLB-mapping, integration, deployment and telemetry panels all operate on the same schema so generated client projects can be reviewed before activation.

Client projects live under `clients/<slug>/` and contain runtime configuration plus Studio metadata. The project scripts create, validate and activate those folders deterministically. Activation keeps a timestamped backup before replacing the active configuration. GitHub Actions performs the same validation and build before any Vercel deployment.

External content is fetched only by the server integration route. URLs must use HTTPS and match an optional host allowlist; credentials are resolved from restricted environment-variable names and are never accepted from the browser. Telemetry follows the same boundary: the client emits a bounded, coarse event schema only after policy checks, while the route validates, rate-limits and optionally relays events to an HTTPS webhook.

The shared App Router layout owns ExperienceRuntime and its single unkeyed Canvas. / and /lab do not mount their own worlds. Only an explicit Retry 3D action replaces a failed renderer. Leaving /lab resets free camera, guides, debug and the motion preview; manual quality policy remains explicit.

MaskedMediaLayer renders organic image and video reveals inside that same runtime Canvas. Geometric reveals use CSS masks in CinematicMedia. Automatic selection is capability-driven and a lost renderer returns media ownership to the DOM path. Studio mounts the production SceneCanvas only inside its Preview workspace and supplies the current draft through ExperienceConfigProvider; the public runtime uses the checked-in configuration as the provider default.

The semantic document is the baseline. Every scene has a real anchored section, heading, body, CTA and native details for hotspot information. It is usable before hydration or when JavaScript/WebGL fails. The fixed 3D view enhances that document. No opacity or aria-hidden gate owns primary content.

## Time and transforms

Native scroll position and measured section bounds define normalized timeline progress. Lenis smooths wheel input on the GSAP ticker; it does not introduce another timeline. Native anchors, resize and browser restoration use the same coordinate. ScrollTrigger is refreshed for optional integrations, but no hidden GSAP camera/hero timeline exists.

CinematicFrame samples once per changed rendered progress/aspect. It uses one damped time for camera, hero, world, lights, GLB animation and postprocessing. Both legacy damping parameters bound the common time constant: the slower of cameraDamping and objectDamping wins. Large seeks snap as a unit. Narrative headings remain ordinary document content; structural scene selection follows native progress rather than waiting for visual damping.

CameraRig owns camera position, look target and FOV unless free camera is enabled. LabOrbitControls adopts the actual target on entry. PersistentHero owns its parent transform; autonomous Float motion was removed so poses are reproducible. Animation clips own transforms inside independent cloned asset roots. Do not animate the same transform using React props, GSAP and a mixer.

Scene `motionTracks` are evaluated after the existing camera-path, object-motion, lighting, material and postprocessing sample. An all-viewport track applies first, then a matching desktop or mobile track may override it. The evaluation is pure and depends only on normalized local scene progress, viewport class and validated configuration. The editor never creates a second playback engine.

Auxiliary motion output carries DOM copy, media reveal/opacity, transition-layer opacity and named product-rig node values. DOM consumers sample the same scene-local time. ProductRig restores GLB baselines, applies its existing global choreography, then applies scene-local sequencer values from the shared cinematic frame. This order keeps legacy tracks compatible while making a local scene override explicit.

Studio transform controls are present only when the Sequence workspace enables record mode. They edit the selected vector key through a context that is null in the public runtime. Gizmo events are grouped into one undo command and cannot become autonomous render owners.

## Assets and ownership

config.assets registers model, image, panorama, HDR environment and video instances. Models may declare lowUrl, scene membership, persistence and a scene-scrubbed animation clip. SceneAssets mounts required models and budgeted immediate neighbors. Nonpersistent inactive video is not prefetched. A persisted asset retains its world identity through all scenes; transient assets release their resource ownership after leaving the neighborhood.

Models clone hierarchy/skeleton per instance while sharing immutable geometry/material caches. Final owner release disposes cache resources after a short Strict Mode-safe grace period. Image instances use owned texture clones instead of modifying cached textures during render. Videos are created in effects and release their source, event listeners and texture on teardown. Per-asset boundaries isolate rejected loads; whole-world Suspense is not used.

ProductRig is the specialized persistent-hero owner for named-node choreography. It clones mutable materials per instance, records authored node transforms once, restores those baselines before each sample and applies deterministic global tracks in one frame owner. The regular PersistentHero path remains unchanged for non-rig models.

Semantic scene blocks are server-rendered inside the narrative document. WebGL never owns menu text, prices or conversion links. Their optional motion samples the same global progress without hiding the readable baseline.

Draco and Basis decoders are copied from the locked Three version during dev/build and served from /decoders. Meshopt is supplied by Drei. Codec wiring is distinct from certifying every third-party compressed model. Test your actual files and all external texture URLs.

## Rendering and quality

SystemProfile completes before Canvas mounts. Missing capability hints choose conservatively. QualityMode is auto/low/medium/high; actual quality is constrained by a device ceiling. PerformanceMonitor changes only automatic selection, steps one tier at a time and falls back after bounded flip-flops. Manual settings cannot be overwritten by it.

DPR is bounded by tier, device DPR and maxPixels. Canvas antialias is fixed off; high composer MSAA is the adjustable antialias policy. Low uses no composer, shadows or particles. GLB lowUrl/heroLowModel selects an authored lower-cost variant. Reduced motion keeps the camera and hero fixed, disables smoothing/parallax/particles/postprocessing, pauses autonomous media and uses compact ordinary content flow.

Renderer stats aggregate all previous-frame passes with autoReset disabled. Frame milliseconds are scheduling intervals, not GPU timings. GPU ms is explicitly unavailable. Do not infer memory bytes from texture counts.

## Lint boundary

react-hooks/immutability is disabled only for src/components/three, whose components intentionally mutate owned renderer objects in useFrame/effects and are not React Compiler targets. Other hooks, refs, accessibility and lint rules stay enabled. Cached texture render-time mutations were separately removed; the exception is not permission to mutate React state or shared loader assets arbitrarily.

ESLint 9.39.5 is currently pinned because the locked Next ESLint React/import/a11y plugins declare ESLint 9 compatibility and fail with ESLint 10. Its upstream deprecation warning is recorded, not suppressed. Upgrade the plugin chain together once compatible; do not force invalid peers merely to remove a warning.
