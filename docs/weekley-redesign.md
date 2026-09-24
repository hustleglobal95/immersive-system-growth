# David Weekley Homes: community-first redesign

## Design direction

The public FORGE route uses a new layout built around location discovery and community comparison. The visual system pairs the repository's Manrope display typography and DM Sans interface typography with clean white surfaces, deep blue framing, and a restrained cobalt action color. A split hero gives the photography its own space, followed by a search strip, community finder, buying paths, interactive room gallery, neighborhood story, company promise, visit CTA and complete footer.

Reference research: Toll Brothers (https://www.tollbrothers.com/) for immediate home discovery and location navigation; Brookfield Residential (https://www.brookfieldresidential.com/) for communities, lifestyle and homebuyer resources; Related (https://www.related.com/) for clear portfolio hierarchy. No reference-site assets are used.

## Content and imagery

Six featured communities in Tampa, Austin and Houston are sourced directly from their David Weekley community pages on September 24, 2026. The data file records source links, starting prices, square footage, bedroom options and floor plans. The finder labels these as featured communities and dates the snapshot. Current availability and inquiries lead to official community/contact pages. The all-location directory links to the 22 destinations present in the official navigation.

All photography and the logo come from David Weekley's website. Local WebP images remove the third-party loading dependency. Asset provenance is recorded in `public/assets/weekley/sources.json`. Fonts are existing FORGE dependencies. No generated images, stock-library images, invented properties, live-inventory claims or simulated inquiry submissions are used.

## Interactions

- Instant combined filters for location, starting price, bedroom options, home type and text query.
- Price/size sorting, grid/list views, and a useful empty state with filter reset.
- Saved places persisted in browser storage, with in-memory fallback if storage is unavailable.
- Comparison of two or three communities, including prices, bedrooms, size and home type.
- Native modal detail panels with a two-photo community gallery, official floor plan links and current-availability handoff.
- Removable active-filter chips and larger save/view controls.
- Searchable all-location directory, expandable buying paths, room gallery and image lightbox.
- Sticky primary navigation, scroll progress and mobile navigation dock.

## FORGE integration

The page remains inside ExperienceRuntime with FORGE's SystemProfile, ScrollController/Lenis, interaction graph and command controllers. It uses the shared CinematicTextReveal and MagneticSurface components, plus a scoped GSAP section choreography hook. ScrollTrigger coordinates hero arrival, search and filter entrances, staggered card masks, buying-path image wipes, line-masked section headings, the gallery panel, reversible neighborhood depth, company values and the visit section. SplitText masks adapt to font loading and responsive line breaks. Independent triggers accommodate tall mobile sections. Focus completes entrances for keyboard access; matchMedia cleans up motion when the preference changes. Reduced-motion mode removes the decorative movement. HELIOT and the protected runtime assets are not edited.

## Verification

Browser coverage exercises combined filters, empty state, sorting, saved-state persistence after reload, comparison, official detail links, focus restoration, mobile navigation, location search, gallery/lightbox, reduced motion, and responsive overflow. Visual capture uses the actual public route and its section anchors, with recorded desktop/mobile walkthroughs. Browser coverage also checks completed mask reveals, scroll-driven image transforms and a live switch to reduced motion.
