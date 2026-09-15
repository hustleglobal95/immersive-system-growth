# Art Direction Prompt OS

The Art Direction Prompt OS turns a creative brief into a deterministic production prompt for cinematic real-time experiences.

## Why it exists

A flat prompt leaves too much room for a model, artist or implementer to make incompatible decisions. Forge now separates direction into three layers:

1. **Creative strategy** — concept, audience, promise, emotional arc, CTA.
2. **Global art direction** — composition, camera, lighting, materials, motion, spatial continuity, realism, asset, mobile, performance and accessibility rules.
3. **Scene direction** — shot objective, spatial story, framing, lens, path, speed, focus, lighting, material behavior, assembly logic, transitions, asset dependencies and mobile substitutions.

The goal is not more adjectives. The goal is fewer ambiguous decisions.

## Authoring order

Always write direction in this order:

1. North star
2. Hero hierarchy
3. Spatial rules
4. Composition rules
5. Camera language
6. Lighting language
7. Material language
8. Motion language
9. Transition language
10. Interaction language
11. Continuity rules
12. Realism rules
13. Asset rules
14. Typography and color rules
15. Mobile and performance rules
16. Accessibility rules
17. Forbidden patterns
18. Per-scene directives

This ordering makes upstream intent constrain downstream choices.

## Prompt quality rules

### Prefer executable language

Weak: `cinematic camera movement`

Strong: `Begin on a 28-35mm equivalent wide establishing frame, maintain horizon stability, move on a slow descending arc toward the podium, then reduce lateral velocity before the threshold so the next interior shot can inherit direction of travel.`

### State subject hierarchy

Every shot should answer:

- What is the hero?
- What is secondary?
- What must never compete with the hero?
- Where is the viewer expected to look first, second and third?

### Separate camera variables

Do not collapse camera direction into one sentence. Specify:

- framing
- lens / FOV intent
- path
- speed profile
- focus behavior
- continuity into the next shot

### Separate motion classes

Scene motion should distinguish:

- hero subject motion
- environmental motion
- assembly / reveal motion
- easing
- continuity

This prevents the common failure mode where everything moves at once.

### Describe construction as phases

For architectural build-up or product assembly, describe ordered phases such as:

1. site/foundation
2. core
3. floor plates
4. structure
5. facade
6. balconies/details
7. landscaping
8. lighting / occupied state

Specify overlap intentionally. Avoid simultaneous full-scene reveals.

### Define negative direction

Negative direction is mandatory for expensive cinematic work. Examples:

- no random orbiting
- no generic luxury glow
- no neon rim light unless physically motivated
- no particle transition without spatial purpose
- no camera roll
- no over-shallow depth of field on architectural wides
- no speed ramp that breaks perceived scale
- no UI competing with the scene hero

## Performance-aware direction

Creative direction must remain buildable.

Use `performanceRules` for constraints such as:

- keep large environment meshes static where possible
- instance repeated facade modules
- avoid hundreds of independently animated objects when a grouped reveal or shader sweep provides the same read
- reserve high-cost transparency for hero glass
- prebake simulations that do not require interaction
- define lower-density mobile substitutions

Use `mobileRules` for equivalent narrative intent rather than merely shrinking desktop behavior.

## Asset requirements

Per-scene `assetRequirements` should describe dependencies without inventing them. Examples:

- segmented floor slabs named sequentially
- facade grouped by vertical zone
- separate emissive window material
- isolated landscape group
- collision-safe camera volume
- proxy mesh for mobile

If the asset is unavailable, the generated prompt should flag the dependency instead of assuming it exists.

## Command

```bash
npm run creative:prompt -- config/creative-direction.json
```

The command outputs a master prompt with:

- role and objective
- concept hierarchy
- global art-direction rules
- hard constraints
- ordered scene directives
- implementation-aware output contract

## Architectural construction example

A strong construction scene can be authored like this conceptually:

```json
{
  "direction": {
    "objective": "Make the tower feel engineered into existence rather than faded on.",
    "spatialStory": "The viewer rises with the structure from podium to crown.",
    "composition": [
      "keep the tower centered slightly right of frame",
      "preserve clear sky negative space above the active construction zone"
    ],
    "camera": {
      "framing": ["begin wide enough to read site and full footprint"],
      "lens": ["avoid exaggerated ultra-wide distortion"],
      "path": ["slow ascending arc synchronized to the active floor band"],
      "speed": ["accelerate gently during repeated floor stacking, decelerate at crown"],
      "focus": ["keep structural build zone legible; do not hunt focus"]
    },
    "motion": {
      "subject": ["core rises first"],
      "environment": ["environment remains mostly stable to preserve scale"],
      "assembly": [
        "floor plates cascade bottom to top",
        "facade follows 2-4 floors behind structural stack",
        "balconies resolve after facade zones",
        "landscape and practical lights arrive last"
      ],
      "easing": ["use restrained acceleration; avoid elastic or playful easing"],
      "continuity": ["finish at the exact camera state needed for the completed-building hero shot"]
    },
    "assetRequirements": [
      "sequential floor groups",
      "separate core",
      "facade zones",
      "separate balcony/detail group",
      "separate emissive window material"
    ],
    "mobileNotes": ["reduce simultaneous animated groups and shorten the camera arc"],
    "negativeDirectives": ["no instant full-building dissolve", "no random debris particles"]
  }
}
```

## Review checklist

Before approving a direction file, verify:

- the north star is one clear idea
- every global rule constrains an actual production decision
- each scene has one dominant objective
- camera direction has framing, path and speed logic
- movement has narrative purpose
- lighting is physically motivated
- materials describe behavior, not just names
- continuity between scenes is explicit
- asset dependencies are named
- mobile substitutions preserve narrative intent
- expensive live simulation is justified
- negative directives prevent predictable failure modes
