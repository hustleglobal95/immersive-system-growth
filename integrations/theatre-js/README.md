# Optional Theatre.js Integration

Theatre.js is useful when camera or object choreography becomes too complex to tune comfortably as hand-authored keyframes.

Recommended boundary: use Theatre to author values, then keep Forge responsible for scroll progress, quality state, accessibility and scene semantics. Do not let two independent timeline systems fight over the same transform.
