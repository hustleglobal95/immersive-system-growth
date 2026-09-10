# Persistent Object Motion

The hero object can use a reusable motion preset via `hero.motion`.

- `linear`: direct interpolation.
- `handoff`: small depth arc for passing an object into the next scene.
- `rise`: vertical lift through the middle of the move.
- `drop`: controlled downward transfer.
- `spiral`: compact rotational move for abstract or product moments.
- `scale-through`: enlarges the object through the middle of the scene so its surface can become a transition.

Example:

```json
"hero": {
  "motion": "scale-through",
  "from": { "position": [0,0,0], "rotation": [0,0,0], "scale": 1 },
  "to": { "position": [0,0,-1], "rotation": [0,1.2,0], "scale": 1.1 }
}
```

Use object motion to preserve continuity. Do not make the persistent object perform decorative spins with no narrative purpose.
