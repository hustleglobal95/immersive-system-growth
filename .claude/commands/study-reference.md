# /study-reference

Turn a reference site, recording, screenshot set or motion example into Forge construction knowledge.

## Input

A URL, screenshots, recording, or named reference.

## Process

1. Read `docs/IMMERSIVE_CONSTRUCTION_INTELLIGENCE.md`.
2. Use `docs/IMMERSIVE_REFERENCE_DECONSTRUCTION_TEMPLATE.md` as the analysis structure.
3. Inspect the reference visually and behaviorally. Do not infer implementation libraries from appearance alone.
4. Separate observable facts from hypotheses.
5. Extract:
   - composition
   - typography
   - depth
   - scroll choreography
   - pointer / touch behavior
   - transition mechanics
   - persistent anchors
   - DOM vs WebGL responsibilities
   - signature moment
   - mobile translation
   - likely first-use performance costs
6. Map every transferable technique to an existing Forge primitive first.
7. Record custom work only where the existing engine is insufficient.
8. Add or update a pattern in `src/platform/director-intelligence/constructionKnowledge.ts` only when the lesson generalizes across multiple projects.
9. Add tests for any new executable rule.
10. Never copy proprietary assets, exact branded compositions, protected source or paywalled prompts.

## Output

Produce a reference deconstruction plus a short Forge implementation map:

- what Forge already knows how to do
- what new construction knowledge was learned
- what should change in Director behavior
- what should **not** be added as a dependency
