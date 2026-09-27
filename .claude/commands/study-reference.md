# /study-reference

Turn a reference site, recording, screenshot set or motion example into Forge construction knowledge.

## Input

A URL, screenshots, recording, or named reference.

## Process

1. For a URL, capture auditable evidence first with `npm run forge:reference:capture -- --url="<reference>"`. The capture is isolated, blocks private-network destinations/subresources, and records desktop/mobile frames plus machine facts.
2. Visually inspect those artifacts and complete the generated `analysis.template.json`. Do not leave placeholders.
3. Validate the finished analysis with `npm run forge:reference:validate -- --analysis="<analysis.json>" --url="<reference>"`. Validation requires hashed local visual evidence and rejects URL mismatch.
4. Read `docs/IMMERSIVE_CONSTRUCTION_INTELLIGENCE.md`.
5. Use `docs/IMMERSIVE_REFERENCE_DECONSTRUCTION_TEMPLATE.md` as the analysis structure.
6. Inspect the reference visually and behaviorally. Do not infer implementation libraries from appearance alone.
7. Separate observable facts from hypotheses.
8. Extract:
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
9. Map every transferable technique to an existing Forge primitive first.
10. Record custom work only where the existing engine is insufficient.
11. Add or update a pattern in `src/platform/director-intelligence/constructionKnowledge.ts` only when the lesson generalizes across multiple projects.
12. Add tests for any new executable rule.
13. Never copy proprietary assets, exact branded compositions, protected source or paywalled prompts.

## Output

Produce a reference deconstruction plus a short Forge implementation map:

- what Forge already knows how to do
- what new construction knowledge was learned
- what should change in Director behavior
- what should **not** be added as a dependency
