# Immersive Site Forge

A production-oriented engine for cinematic, scroll-driven 3D websites.

Forge gives you one persistent React Three Fiber world, one normalized 0 to 1 timeline, reusable camera paths, scene-aware 3D state, accessible DOM storytelling, adaptive quality, hotspots, postprocessing, asset auditing, recipes and Claude Code operating instructions.

## What it is for

Use Forge for experiences where the visitor should feel like they are moving through a place or around an object rather than scrolling through disconnected website sections. Typical projects include architecture and real estate, restaurants, luxury products, automotive launches, portfolios and spatial SaaS storytelling.

## Core stack

- Next.js App Router and React
- Three.js and React Three Fiber
- Drei
- GSAP and ScrollTrigger
- Lenis
- Zustand
- React Three Postprocessing

## Included systems

- one persistent WebGL canvas
- normalized cinematic scene timeline
- camera path presets: linear, dolly, arc, orbit, crane and threshold
- damped camera and object choreography
- persistent hero object across every scene
- smooth world, fog, light and post-FX handoffs
- responsive accessible DOM narrative layer
- clickable 3D hotspots with DOM detail dialogs
- pointer depth influence
- keyboard scene navigation
- runtime quality inference and performance fallback
- reduced-motion behavior
- render calls and triangle telemetry in the debug HUD
- reusable GLB loader, animated and scrubbed GLB playback, 360 panorama, image/video planes, HDR wrapper, portals, occluders and quality gates
- shader starters for dissolve and portal effects
- scene generator CLI
- timeline validation
- cinematic continuity audit
- scene timeline report
- asset weight auditing
- five complete choreography recipes
- Claude Code commands and operating contract
- optional r3f-scroll-rig, Theatre.js and UI/UX Pro Max integration guidance
- GitHub CI and contribution templates

## Quick start

```bash
npm install
npm run doctor
npm run experience:validate
npm run cinematic:audit
npm run dev
```

Open `http://localhost:3000`.

Enable the debug HUD:

```bash
NEXT_PUBLIC_DEBUG_3D=true npm run dev
```

Press `D` to toggle the HUD and use left/right arrow keys to jump between scenes.

## Start from a recipe

```bash
npm run recipe:list
npm run recipe:apply -- real-estate
npm run experience:validate
```

Available recipes are `real-estate`, `restaurant`, `product`, `saas` and `automotive`.

## Add real assets

Put models in `public/models`, textures in `public/textures`, HDRIs in `public/hdr`, and video in `public/video`. Set `heroModel` in `config/experience.json` to a public URL such as `/models/hero.glb` when you want to replace the procedural demo object.

Run:

```bash
npm run assets:audit
```

before production.

## Architectural rule

Do not create one WebGL canvas per section. Keep the renderer persistent and move the camera, objects, lighting, materials and atmosphere through the experience.

Read `docs/ARCHITECTURE.md`, `docs/SCENE_LAB.md`, `docs/PRIMITIVES.md` and `CLAUDE.md` before making structural changes.

## Claude Code

Start Claude with:

```text
Read CLAUDE.md and docs/ARCHITECTURE.md before changing anything.
Use the persistent-canvas architecture already in the repository.
First produce a scene choreography plan, then implement it.
Do not replace the experience with independent animated sections.
```

More specialized directives are in `.claude/commands`.

## Production validation

```bash
npm run check
npm run build
```

Forge is an engine, not an asset generator. Photorealistic output still depends on strong GLB models, textures, HDR environments, image/video assets and art direction.
