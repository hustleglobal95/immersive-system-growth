# Release Notes

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
