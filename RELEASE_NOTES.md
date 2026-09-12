# Release Notes

## 5.0.0

- Added tiered cinematic render profiles with ACES filmic tone mapping, sRGB output, PCF soft shadows, adaptive 512/1024/2048 shadow maps and SMAA on capable tiers.
- Added real-time sequencer playback with loop, rate, duration and bounded in/out preview controls.
- Added track filtering, selection timing reversal/distribution and five reusable cubic curve presets.
- Added cinematic focus and mapped-node cascade choreography presets for coordinated multi-property and multi-part motion.
- Expanded local GLB inspection with hierarchy paths, parent/skin references, vertices, estimated triangles, morph targets, textures, complexity grading and production recommendations.
- Added confidence-scored semantic node mapping and richer model diagnostics in Forge Studio.
- Expanded deterministic unit and browser coverage for rendering profiles, transport, retiming and model inspection.

## 4.0.0

- Added a first-party Forge Motion Sequencer driven by the production normalized timeline and deterministic sampler.
- Added typed number, vector, color and boolean tracks for camera, hero, lighting, atmosphere, materials, postprocessing, DOM copy, media, transition layers and mapped GLB nodes.
- Added a zoomable dope sheet with playhead seeking, time snapping, multi-key selection, dragging, nudging, copy/paste and deletion.
- Added bounded undo/redo history with grouped pointer and viewport-gizmo edits.
- Added cubic Bezier handles, seven easing modes and exact reversible sampling.
- Added camera, hero and GLB-node record mode through Three.js transform controls in the real production preview.
- Added all, desktop and mobile track precedence plus six reusable motion presets.
- Added schema/resource validation, deterministic unit coverage and an end-to-end Studio authoring flow for the sequencer.

## 3.0.0

- Added a Studio live preview that mounts the same production R3F scene graph, media panels, masks and transition layers used by the public runtime.
- Added visual direction for eleven camera paths, mobile framing, colored key/rim lights, exposure, fog, postprocessing and non-destructive hero material overrides.
- Added a transition-layer composer with bounded timing, blend modes and deterministic motion.
- Added browser asset intake with local-only GLB inspection, image/video metadata, SHA-256 records and budget enforcement.
- Added six industry template cards for food, restaurant, property, automotive, product and SaaS experiences.
- Added safe AVIF/WebP texture optimization that preserves sources and atomically updates the asset manifest.
- Added server-only GitHub publishing that validates all documents, creates a review branch and opens a pull request without exposing repository credentials to the browser.
- Added Studio Pro schema, optimizer, security and end-to-end browser coverage.

## 2.1.0

- Added Forge Reveal Engine with eight original, schema-driven mask presets.
- Added deterministic CPU reference sampling, CSS mask output and a shared-canvas WebGL shader path.
- Added the Mask Lab with live DOM/WebGL previews, full parameter controls and reference media.
- Added automatic quality, WebGL-loss and reduced-motion fallbacks.
- Added endpoint, reverse-scroll, schema, backend-policy and browser preview coverage.

## 2.0.0

- Added Forge Studio with project, timeline, model, integration, publish and telemetry workspaces.
- Added local browser and CLI GLB inspection plus automatic named-mesh suggestions.
- Added deterministic scene presets and slide, curtain, zoom, dissolve and wipe media transitions.
- Added validated static, JSON and Shopify content adapters with explicit JSON-path mapping.
- Added isolated client generation, validation and activation commands.
- Added a protected manual GitHub Actions workflow for validated Vercel releases.
- Added consent-aware FPS, Web Vitals, long-task and WebGL telemetry with an optional HTTPS webhook.
- Added cross-browser Studio coverage and expanded the unit suite.

## Product choreography

- Added named-node product rigs with deterministic global transform, opacity and visibility tracks.
- Added semantic statement, brand-band, menu-grid and order-card modules.
- Added a rig auditor and forward/reverse sampling tests.
- Added original high/low burger GLBs and a complete six-scene burger showcase.
- Made the burger showcase the default experience while retaining all previous recipes.

## 1.0.0

The first complete Forge engine release establishes the persistent-world architecture, data-driven scene timeline, camera and object choreography, asset primitives, authoring tools, scene lab, adaptive rendering, accessibility behavior, validation tools, recipes, Claude Code workflow and production documentation.

This release intentionally ships without bundled third-party 3D models or HDR environments. Projects should add licensed assets under `/public` and register them in `config/asset-manifest.json`.
