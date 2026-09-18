# Forge Hierarchy Engine

Forge treats hierarchy as production intelligence, not only typography scale or page order.

The Hierarchy Engine runs inside Director Intelligence after a territory is selected and before production readiness is granted. Its governing rule is:

> Importance propagates downward.

A lower-level decision must yield to the level above it unless Director records a deliberate exception.

## Eight hierarchy layers

1. **Strategic** — one primary objective, one memory target, one primary action.
2. **Narrative** — chapters advance understanding, tension, proof or action toward one protected payoff.
3. **Page / section** — opening, signature, proof and conversion sections receive different production weight.
4. **Information** — essential understanding precedes supporting complexity; proof arrives after context.
5. **Visual** — one dominant focal point per viewport/state with at most a small supporting cast.
6. **Interaction** — one obvious next action; exploratory and utility interactions remain subordinate.
7. **Motion / spatial** — only one attention-driving motion system owns a moment.
8. **Semantic / accessibility** — the experience still communicates meaning, order and action without spectacle.

## Project-specific narrative defaults

The engine does not force every site into Hero → Features → Testimonials → CTA.

- Brand: Identity → tension → expression → proof → response → action
- Product: Desire → reveal → craftsmanship → proof → ownership
- Property: Place → arrival → environment → residence → proof → inquiry
- Hospitality: Feeling → destination → spaces → experience → proof → stay
- Portfolio: Point of view → work → process → proof → contact
- SaaS: Problem → promise → mechanism → proof → product → conversion
- Commerce: Desire → product → proof → choice → confidence → purchase
- Campaign: Setup → tension → participation → reveal → response → action
- Automotive: Identity → reveal → performance → engineering → interior → configure
- Fashion: Attitude → silhouette → detail → collection → proof → shop

These are starting grammars, not templates. Director can deviate when the brief or evidence justifies it.

## Attention budget

The engine emits explicit attention rules. Examples:

- During a signature camera/object event, reduce secondary camera movement, ambient motion, decorative particles, nonessential typography animation and competing hover responses.
- During reading/proof states, reduce camera travel, object spin, parallax amplitude and auto-advancing UI.
- During conversion/resolution, reduce exploratory hotspots and secondary CTAs so the primary action owns the interface.

This is the core rule behind expensive-looking motion: not everything peaks at once.

## Blocking behavior

Hierarchy issues are classified as:

- `blocker` — production should not lock until corrected.
- `warning` — direction can continue, but hierarchy is likely to flatten or compete.
- `advisory` — a production/QA requirement that should be verified later.

Hierarchy blockers are added to the Director Intelligence blocker list. Because production readiness already depends on a clean Director verdict, hierarchy can now hold a production plan instead of remaining an informal design recommendation.

Creative Agent also refuses to apply a patch while hierarchy blockers remain. It surfaces all eight hierarchy levels, the project-specific narrative chain and the active attention-budget rule before execution.

## Output

`buildHierarchyReport(brief, treatment)` returns:

- overall hierarchy score
- project-specific recommended narrative
- all eight hierarchy level reports
- dominant/supporting/suppressed elements for each level
- warnings and blockers
- attention-budget rules
- cross-system directives

The report is attached to `runDirectorIntelligence(...).report.hierarchy`, so Director, Creative Agent and future Studio surfaces consume one shared hierarchy model.
