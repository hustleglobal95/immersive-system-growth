# Forge Motion Sequencer

Forge Motion Sequencer is a first-party authoring system for scene-local motion. It edits the same validated experience document and calls the same deterministic sampler as production. The dope sheet is an editor for data, not a separate animation runtime.

## Track contract

Every scene has a `motionTracks` array. A track has a unique slug ID, display label, typed target, viewport, mute/lock state and one or more strictly ordered keyframes. Keyframe time is normalized from 0 to 1 within the scene.

Supported value types are number, vector, color and boolean. Outgoing easing can be hold, linear, smooth, ease-in, ease-out, ease-in-out or cubic. Cubic keys store `[x1, y1, x2, y2]`; x values are bounded from 0 to 1 and y values may overshoot from -2 to 3.

Viewport values are `all`, `desktop` and `mobile`. The sampler evaluates all-viewport tracks first, then matching desktop or mobile tracks. This makes responsive direction explicit without copying a whole scene.

## Target families

| Family | Targets |
| --- | --- |
| Camera | position, target, FOV |
| Hero | position, rotation, scale |
| Lighting and world | background, fog, fog density, ambient, key, rim, light colors, exposure |
| Material and post | tint, tint strength, metalness, roughness, clearcoat, bloom, vignette |
| DOM | copy opacity, Y offset and blur |
| Media | reveal and opacity |
| Transition layer | `layer:<layer-id>:opacity` |
| Product rig | `rig:<node>:position`, rotation, scale, opacity and visibility |

Layer and rig targets must resolve against the current scene and mapped product rig. Absolute scalar values are checked against the same practical bounds as their production properties.

## Authoring workflow

1. Open Studio and choose Sequence.
2. Choose a scene and add a typed target or one of the eight motion presets.
3. Seek with the ruler or production preview, then record a key.
4. Shift-select keys to move or delete them as a group. Copy/paste preserves track ownership and offsets the copied group to the playhead.
5. Use cubic easing to expose the curve graph, handles and five production curve presets.
6. Select a vector key and enable the gizmo to record translation, rotation or scale in the production R3F viewport.
7. Add a mobile override when framing or timing must differ on narrow screens.
8. Scrub forward, backward and across exact endpoints before export or review publishing.

The preview transport plays normalized scene time at a configurable duration and rate. In/out values isolate a difficult transition without changing serialized keyframe time. Looping is an editor-only review control. Track filtering changes only the dope-sheet view, never runtime output. Selected keys can be distributed across their current time window or reversed while preserving that window.

The cinematic-focus preset coordinates focal length, bloom and copy timing. The rig-component-cascade preset creates staggered offset tracks for up to 24 mapped GLB nodes and returns each node to its captured baseline. Both remain ordinary validated tracks after creation.

Pointer drags and transform-control sessions are grouped into one undo step. History is bounded to 80 experience snapshots. It is an editor concern and is not serialized into project output.

## Runtime order

The base scene sample is calculated first. Scene motion then overrides or blends runtime values. ProductRig restores its captured GLB baseline, evaluates existing global product tracks, then applies scene-local node motion. DOM, media and transition components read auxiliary values from the same scene progress.

Reduced motion samples the opening motion frame for the WebGL state and keeps enhanced DOM/media motion disabled. Primary copy and actions remain semantic HTML regardless of track state.

## Reference policy

The architecture was informed by the track separation, curve concepts and command histories visible in [Babylon.js Editor](https://github.com/BabylonJS/Editor), [Three.js Editor](https://github.com/mrdoob/three.js/tree/dev/editor) and [React Timeline Editor](https://github.com/xzdarcy/react-timeline-editor). Forge uses its own schema, sampler and UI implementation. No editor source was copied.

[Theatre.js](https://github.com/theatre-js/theatre), [Triplex](https://github.com/pmndrs/triplex) and OpenVideo were kept as study references only because their editor licensing or current distribution model is not suitable for direct inclusion in Forge's MIT production starter. Do not add reciprocal editor dependencies without a documented legal review.

## Validation

Run:

```bash
npm run check
npm run build
npm run test:browser
```

Unit coverage verifies exact endpoints, reverse sampling, cubic evaluation, responsive precedence, presets, target bounds and mapped resource checks. Browser coverage verifies curve editing, history, copy/paste, responsive track creation and viewport record mode on Chromium and WebKit.
