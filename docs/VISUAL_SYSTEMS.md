# Specialist visual systems

Forge visual systems are small, typed runtime modules with a shared contract. The manifest is intentionally data-first so a project can select a visual system without copying scene code.

## Current contract

Each entry in \`config/visual-systems.json\` declares:

- a stable ID and visual kind
- a deterministic seed and instance budget
- spatial spread and primitive size
- base and accent colors
- motion rate
- a low-cost fallback and reduced-motion policy

The first production implementation is \`InstancedField\`. It uses one \`THREE.InstancedMesh\` draw call, deterministic seed-based placement, quality-tier instance counts, and a freeze/static mode for reduced motion or low quality.

## Extension path

The same contract can host particle fields, terrain flows, globe/data layers, and portal systems. Each new renderer must preserve:

1. the normalized Forge sampler as its only clock
2. an explicit quality budget
3. a reduced-motion or non-WebGL fallback
4. disposal through the owning React Three Fiber tree
5. deterministic output from the same input manifest

The manifest is validated in CI with \`visual:audit\` and unit tests before a branch can merge.
