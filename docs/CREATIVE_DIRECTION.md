# Creative Direction OS

Creative direction is a versioned production input, not an afterthought to runtime effects. `config/creative-direction.json` defines the concept, audience, promise, emotional arc, visual language, constraints, scene purpose, interaction, transitions, CTA and success event. Runtime configuration remains the implementation layer.

Run `npm run creative:audit`. A scene is incomplete when it lacks a purpose, subject, copy, interaction or causal transition. Keep one dominant idea per viewport, use real proof, preserve semantic HTML, and treat prohibited patterns as release constraints.

Compile a validated brief into a safe runtime draft with `npm run creative:compile`. The command writes ignored files under `generated/`, emits a provenance sidecar, and now produces both `experience.compiled.json` and `interaction-graph.compiled.json`. Each plan scene can select a source scene, a finite motion preset, a graph trigger and up to eight validated actions.

Generated motion tracks and graph nodes use the `creative-` namespace. Re-running the compiler removes only that namespace, preserves authored tracks and graph behavior, and produces deterministic output. Existing camera, motion, interaction and accessibility contracts remain owned by their runtime systems.

`config/creative-recipes.json` is the approved starting language for burger, real-estate, restaurant, automotive, product and SaaS experiences. Recipes define the narrative arc and conversion anchor; they are starting points, not permission to reuse an untouched template.
