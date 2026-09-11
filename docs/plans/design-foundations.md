# Design foundations implementation plan

Purpose: give Forge a reusable art-direction and typography layer, with a working `/design` authoring specimen. This is a design tool inside the repository, not a replacement landing page.

## Experience contract

- Existing scenes: keep each scene's purpose, camera start/end, path preset, persistent objects, lighting/environment, transitions and asset references unchanged.
- Typography: selected display/body families and shared measure/spacing tokens drive semantic narrative copy; existing GSAP text-settle cues retain timing and reverse behavior.
- Interaction: retain narrative links, disclosures, keyboard navigation and reduced-motion content. Add navigation to the design workbench.
- `/design`: a normal-flow DOM authoring route, no camera or WebGL assets required. It intentionally does not mount the cinematic runtime. `/` and `/lab` retain their single shared canvas.
- Workbench sequence: direction selection → editorial hero → collection → specification/proof → process/FAQ → inquiry → font catalog. Standard anchor navigation; no scroll pinning or decorative motion.
- Required assets: three pinned Fontsource variable-font packages with their licenses; one original inline SVG architectural study. Catalog-only families are references, never downloaded automatically.

## Scope and acceptance

Three complete token directions; a searchable, categorized font reference catalog; actual local font delivery; reusable semantic sections; selected direction export; responsive scales and grids; text spacing/reflow and font-loading checks; documented research-to-code mapping. No fabricated testimonials, client outcomes, pricing or live form submission in the specimen.
