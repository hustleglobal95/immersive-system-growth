# Design foundations

Open `/design` after `npm run dev`: three directions, a full content specimen, 36 font references, three live specimens, category/search controls and JSON export.

## Choosing a direction

`src/design/directions.ts` is the source of truth. Change `defaultDirection` to `editorial`, `architectural` or `commercial`. Root layout applies its variables; narrative copy inherits display/body fonts. Scene colors, timing and assets remain owned by the experience config. Workbench selection is temporary; edit the default or copy the export to persist a choice.

```tsx
import { directionStyles } from "@/src/design/directions";
// Font variables are registered once in app/layout.tsx.
<div className="ds-root" style={directionStyles("architectural")}>
  <div className="ds-container">{/* semantic sections */}</div>
</div>
```

Use `ds-root` for normal-flow color/surface roles. Do not place its opaque background over the cinematic canvas. The existing narrative inherits typography separately. Fluid scales combine rem and viewport units with limits; review unusually long headlines rather than assuming any scale is universally safe.

## Components

`src/design/sections.tsx` exports `EditorialHero` (one h1, primary action and visual), `SectionHeading`, `CollectionGrid`, `SpecificationList`, `EditorialQuote` (required attribution), `DisclosureGroup` (native details), `InquirySection`, `PricingGrid` (caller-owned prices/features/actions) and the original demo `ArchitecturalStudy` vector.

Supply verified testimonials and actual project imagery. For pricing, include currency, billing period and exclusions in the provided strings. The components do not invent prices, proof or client outcomes.

`InquiryForm` requires an async `onSubmit(input)` returning `{ok, message}`. The caller owns delivery, server validation, abuse controls and privacy information. Failures retain values; confirmed success clears them. The workbench callback returns an explicit preview message and sends nothing. Replace that callback for a live contact form.

## Adding fonts

`src/design/fonts.ts` uses `next/font/local` and pinned Fontsource packages. It has no Google API build dependency or visitor font API request. All fonts are not force-preloaded. Adjusted fallback faces reduce the opportunity for layout shifts; production CLS still needs measurement.

1. Find a candidate in `src/design/catalog.ts` or the linked source catalog.
2. Inspect its exact license, script subsets, styles and axes.
3. Install/pin its package and select only required WOFF2 files in `fonts.ts`.
4. Keep its complete license/attribution under `public/fonts/licenses/`.
5. Register its CSS variable in layout and the intended direction. Only then mark it bundled.
6. Update budgets deliberately and test cold-cache and blocked-font rendering.

The shipped setup uses weight variation only. Do not animate body font weight while scrolling. Add true italic files when needed. Use tabular numerals for prices/data and reserve mono for appropriate technical content.

## Page structures

| Project | Useful progression |
| --- | --- |
| Luxury product | Object/proposition → collection → craft evidence → specifications → price or inquiry |
| Architecture/property | Selected work → location/purpose → spatial detail → factual amenities → availability/contact |
| Charter/hospitality | Destination/offering → inventory/guest fit → experience → practical detail → enquiry |
| Services/SaaS | Outcome → concrete examples → verified evidence → scope/pricing → questions → next action |

These patterns guide content selection; they do not replace the continuous scene plan. Compose semantic sections with existing scenes without a second scroll controller. Review readability over actual camera/background states.

## Validation

Run `npm run check`, `npm run build` and `npm run test:browser`. Inspect retained desktop/mobile screenshots, keyboard focus, native form validation, reverse scroll and narrow navigation. Replace concept content before client delivery.

See [research](DESIGN_RESEARCH.md) and [implementation plan](plans/design-foundations.md).
