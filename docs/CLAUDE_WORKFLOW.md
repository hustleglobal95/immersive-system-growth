# Claude Code Workflow

Claude should treat this repository as an engine, not as disposable starter code.

## Required sequence

1. Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, and the relevant recipe.
2. Inspect `config/experience.json` and `config/asset-manifest.json`.
3. Write a scene plan before code changes.
4. Decide which visual object persists between scenes.
5. Define camera start, camera end and threshold behavior for every scene.
6. Map available assets to scenes. Flag missing assets instead of inventing filenames.
7. Update the timeline.
8. Build scene geometry and interactions.
9. Add postprocessing only after camera, geometry, lighting and materials work.
10. Run `npm run check` and `npm run build`.

## Prompt starter

```text
Read CLAUDE.md and docs/ARCHITECTURE.md first.
Use the current Forge architecture. Do not replace the persistent canvas.

Project: [describe project]
Assets available: [list exact paths]
Target devices: [desktop/mobile/both]
Primary conversion: [action]

Before editing code, output a six-column scene plan:
scene, visitor purpose, camera movement, persistent object state, interaction, transition to next scene.

Then implement the experience as one continuous spatial narrative.
```

## Completion test

A scene is not complete merely because it looks polished in isolation. Scrub backward and forward through every boundary. If the spatial relationship between two scenes is unclear, redesign the handoff.
