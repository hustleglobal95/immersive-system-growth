# Product rigs

Product rigs animate named nodes inside the persistent hero GLB. They are intended for product explosions, ingredient separation, assemblies, material reveals and reversible object handoffs.

## Contract

- `heroModel` and `heroLowModel` must expose every name in `productRig.nodes`.
- High and low models must use the same required names.
- A node may have one track per property.
- Transform tracks use three-number values.
- Position and rotation offsets are added to the authored GLB transform.
- Scale offsets multiply the authored GLB scale, so `[1, 1, 1]` is neutral.
- Absolute mode replaces the authored transform.
- Opacity tracks clone materials per rig instance before mutation.
- Visibility tracks hold the most recent boolean keyframe.
- Track time uses global normalized experience progress from zero to one.
- Before the first keyframe and after the last keyframe, the endpoint value is held.
- Reduced motion uses the product state at progress zero.

## Example

    "productRig": {
      "nodes": ["top-bun", "cheese", "patty"],
      "tracks": [
        {
          "node": "top-bun",
          "property": "position",
          "mode": "offset",
          "keyframes": [
            { "at": 0, "value": [0, 0, 0] },
            { "at": 0.4, "value": [0, 3, 0], "easing": "cinematic" },
            { "at": 0.7, "value": [0, 0, 0] }
          ]
        }
      ]
    }

## Authoring sequence

1. Name product parts in the source DCC application.
2. Export optimized high and low GLBs with matching names.
3. Register both files in the asset manifest.
4. Add required names and tracks to the recipe.
5. Run `npm run rig:audit`.
6. Use the scene lab to verify camera clearance and composition.
7. Test forward, reverse, large jumps, viewport changes and reduced motion.

The audit reads local GLB JSON chunks directly. Remote models remain runtime-validated and require deployment evidence.
