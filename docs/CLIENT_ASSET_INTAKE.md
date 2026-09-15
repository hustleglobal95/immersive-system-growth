# Forge Client Asset Intake

Open **Studio → Client intake** before a reference-driven client project is quoted or moved into scene production.

The intake system answers three separate questions:

1. What source material does this type of website require?
2. Which required assets are actually production-ready now?
3. Which outcomes are blocked until the client or studio produces something else?

It deliberately does **not** claim that 100% readiness guarantees the visual quality of a reference. A 100% score means the known required source material exists to pursue the approved direction without an asset blocker. Art direction, asset preparation, engineering, performance work, rights review and QA remain production work.

## Production profiles

The catalog covers these project archetypes:

- Creative studio / agency / portfolio
- Luxury physical product / launch
- Architecture / real estate
- Hospitality / hotel / resort
- Automotive / mobility
- Fashion / luxury / beauty
- E-commerce / D2C
- SaaS / startup / software
- Fintech / finance
- Data visualization / analytics
- Food / beverage
- Music / artist / entertainment
- Game / immersive world
- Editorial / art / photography / culture
- Travel / outdoor / destination
- Health / wellness
- Sustainability / climate
- Corporate / professional services
- Education / productivity / documentation

Every profile inherits the universal brand/content/rights pack. Capability modules then add requirements for interactive 3D, exploded/assembly animation, advanced motion, audio, live data, commerce, CMS, localization and accessibility fallbacks.

## Readiness states

An uploaded file is not automatically considered complete.

- **Missing** — no usable source exists.
- **Received** — material arrived but has not been production-qualified.
- **Needs preparation** — source exists but needs conversion, cleanup, optimization, retopology, legal clarification, restructuring or another production pass.
- **Ready** — technically suitable for production.
- **Approved** — art direction/content owner has approved it.
- **Rights cleared** — final production use is covered by the required rights/license confirmation.

Required items remain blockers until they reach Ready, Approved or Rights cleared.

## Readiness levels

- **0 / Discovery** — target understood, insufficient source material to predict finish.
- **1 / Brand ready** — enough to begin identity-led direction and information architecture.
- **2 / Design ready** — enough for premium static composition.
- **3 / Cinematic ready** — sufficient imagery/video/narrative coverage for motion-led production.
- **4 / Immersive ready** — most 3D/data/interaction inputs exist but blockers remain.
- **5 / Production ready** — no known required source-material blockers remain.

The score weights required assets more heavily than recommended or premium assets. Merely receiving a file earns partial readiness but does not clear the blocker.

## Local intake vault

In development, **Add source files** streams the original file into:

`data/client-intake/<project>/<requirement>/`

The directory is intentionally ignored by Git. It is a local production inbox, not a deployment asset folder and not a hosted client portal. The endpoint accepts a broad source-production allowlist including BIM/CAD, 3D, RAW/TIFF, video, audio, fonts, data, documents and design-source formats, with a 2 GiB per-file ceiling.

Image and video uploads receive lightweight browser inspection for dimensions/duration. JSON and GLB files receive basic structural checks. Warnings move a newly registered item to **Needs preparation** instead of pretending it is production-ready.

For larger masters or material delivered through an approved external system, register the item manually and document the location in its internal note. API credentials and secrets should never be saved in the intake manifest.

## Client request pack

**Client request pack** exports a Markdown request containing only currently missing or preparation-blocked items, grouped by priority. Each request includes:

- what the asset is,
- the preferred source format,
- minimum quality where defined,
- and which website capabilities it unlocks.

This is designed to be attached to a proposal or sent to the client/architect/brand team before production begins.

## Intake manifest

**Intake manifest** exports the profile, ambition, enabled capability modules, reference URL, readiness report, requirement catalog and browser-tracked file metadata. It is a production record, not a bundle of the source binaries.

## Recommended commercial workflow

1. Add the client’s reference/benchmark URL.
2. Select the closest project archetype.
3. Select Editorial, Motion-rich or Immersive ambition.
4. Add only the capability modules required by the promised experience.
5. Run the checklist with the client before the final scope is signed.
6. Export the Client request pack.
7. Mark received material as Received, not Ready.
8. Qualify/prepare every critical source file.
9. Price missing production work separately: CGI, retopology, architectural cleanup, material creation, film, sound, data preparation, copy, localization, etc.
10. Begin high-fidelity scene production when the readiness report reflects the scope you actually sold.

This turns a reference such as a cinematic architecture site, experimental studio portfolio or real-time luxury product experience into a concrete production plan rather than a vague promise to “make something like this.”
