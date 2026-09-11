# Design research → implementation

Reviewed 11 September 2026. Sources are standards, first-party documentation and original usability guidance. All new code and illustrations are original. These decisions do not imply a measured conversion gain or whole-site accessibility certification.

| Topic and primary reference | Finding | Implementation |
| --- | --- | --- |
| [Carbon typography](https://carbondesignsystem.com/elements/typography/overview/) | Display and reading text have distinct jobs within a shared hierarchy. | Display, title, lead, body and label roles in `app/design-system.css`. |
| [USWDS typography](https://designsystem.digital.gov/components/typography/) | Evaluate readability through type, measure, spacing and real content. | Body measure capped at 62ch; short heading measures; editable specimens. Exact values are Forge design choices. |
| [Carbon 2x grid](https://carbondesignsystem.com/elements/2x-grid/overview/) | Shared alignment and repeatable spacing establish relationships across scales. | Common container, fluid gutters, spacing tokens, responsive grids and deliberate asymmetry. Not a copy of Carbon's exact grid. |
| [NN/g homepage principles](https://www.nngroup.com/articles/homepage-design-principles/) | Communicate purpose, show representative examples and make next actions understandable. | Hero → collection → details → process → inquiry. Sections are composable, not a mandatory order. |
| [web.dev font practices](https://web.dev/articles/font-best-practices) | Font loading affects rendering; excessive preload competes with critical resources. | Local WOFF2, swap, adjusted fallbacks, no default preload and no third-party font requests. |
| [Fontsource variable fonts](https://fontsource.org/docs/getting-started/variable) | Variable files cover ranges of weights; choose imports deliberately. | Three pinned weight-variable files, normal style and Latin subset. Variable is not assumed smaller than every static option. |
| [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Normal text needs 4.5:1, with a lower minimum for large text. | All workbench text/action roles tested at 4.5:1 on both opaque surfaces; control boundaries at 3:1. This does not certify dynamic 3D backgrounds. |
| [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | Ordinary content must reflow at narrow effective widths. | Single-column mobile layout, wrapping navigation, no fixed-height copy boxes, 320px browser checks. |
| [WCAG text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) | User overrides must preserve content/function. These are test values, not required default styles. | Browser test applies 1.5 line-height, .12em tracking, .16em word spacing and 2em paragraph spacing across directions. |
| [WCAG target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Small controls need sufficient area or spacing. | 44px controls and 48px primary actions are generous project defaults, not a claim that AA mandates 44px. |
| [WAI form instructions](https://www.w3.org/WAI/tutorials/forms/instructions/) | Visible labels and clear requirements support form completion. | Required-field and length instructions, native email validation, pending state and announced delivery result. |

## Art direction

Luxury editorial pairs Cormorant Garamond with DM Sans; architectural minimal uses Manrope with DM Sans; modern commercial uses DM Sans throughout. Directions vary palette, display scale, weight, grid proportions, corner treatment and collection rhythm. These are authored starting points, not source-endorsed prescriptions.

Choose a direction from positioning and content. Charter sites need capacity, destinations, fleet and enquiry details. Architecture needs selected work and project information. Product pages connect appearance to specifications and a purchase or inquiry path. Cinematic motion still needs comprehensible DOM copy and a useful next action.

## Font breadth and performance

The catalog contains 36 discovery references in serif, sans and mono categories. Only three families are bundled: 99,408 source WOFF2 bytes total (97.1 KiB). Each is below 45 KiB; tests enforce a 110 KiB combined budget. Package installation sizes differ from visitor transfer size. Ordinary pages fetch only the families used; the workbench intentionally renders all three specimens.

Bundled package metadata identifies OFL-1.1. Original copyright and license notices are retained at `/fonts/licenses/`. Other catalog entries are references, not audited binaries. Before importing another font, inspect its exact release, license, language coverage, styles and payload. A commercial desktop license should not be assumed to authorize web embedding.

Current files cover Latin and normal style only. Add real italics and required script subsets per project; remeasure the budget. Do not claim broad language support or animated optical sizing from these weight-only imports. Inspect fine hairlines at actual size: a passing color ratio does not guarantee legibility.

## Composition and trust

Give each section a dominant message, subordinate support and nearby evidence. Share alignment edges, then introduce asymmetry when it serves content. The pavilion is an original vector concept, not a client photograph. The quote is a labeled design principle, not a testimonial. The inquiry specimen transmits nothing. Real projects must supply verified evidence and a connected delivery handler.

## Verification boundaries

Unit gates cover color roles, font budgets/license retention and catalog filtering. Browser gates cover direction switching, local font requests, no-JS content, form demo behavior and narrow reflow with spacing overrides and missing fonts. CI retains screenshots. Existing cinematic tests remain required.

Also review real client content at 200% text size and 400% browser zoom, with keyboard and a screen reader, and measure cold-cache mobile LCP/CLS. This change is reusable infrastructure, not a licensed premium-font collection, exhaustive certification or final client art direction.
