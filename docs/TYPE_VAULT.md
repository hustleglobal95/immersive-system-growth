# Forge Type Vault

Forge Type Vault is Forge's typography research, discovery and selection layer for cinematic projects. It is intentionally **vast in discovery and selective in production**: designers and agents can search a broad live library and multiple foundry references without shipping that library into client bundles.

## Product model

Type Vault now operates as a typography atlas rather than a small font picker.

The standalone `/type-vault` surface is organized into six layers:

1. **Typography intelligence** — live library, curated-system and independent-reference counts.
2. **Creative territories** — semantic starting points such as Quiet Luxury, Editorial, Automotive, Technical, Hospitality, Experimental, Multilingual and Minimal.
3. **Source network** — direct research access to Fontsource, Fontshare, Collletttivo, League of Moveable Type and Google Fonts.
4. **Curated systems** — 28+ directed display/body/accent pairing systems covering luxury, product, architecture, culture, automotive, hospitality, technology, research, fashion and creative work.
5. **Independent references** — named type collections that protect discovery from collapsing into only algorithmically popular families.
6. **Library atlas** — the combined Forge-curated + live Fontsource index with progressive result loading.

## Discovery dimensions

The library supports discovery by:

- family name;
- category: Serif, Sans, Display, Mono and Script;
- Forge mood: Luxury, Editorial, Modern, Technical, Warm, Bold, Minimal, Playful, Classic and Experimental;
- semantic role: Display, Body, UI, Label, Editorial and Accent;
- source: Forge Curated or Fontsource;
- language/subset coverage, including Latin Extended, Cyrillic, Greek, Vietnamese, Arabic, Hebrew, Devanagari and Thai when reported by the live source;
- variable-font availability;
- weight support;
- intended use, industry and creative territory through semantic search.

The live Fontsource index is fetched through the protected Type Vault API with a timeout, redirect refusal and response-size ceiling. It is cached for one day and falls back safely to Forge's curated catalog if the upstream source is unavailable.

## Curated intelligence

Forge's curated layer is not intended to mirror the live index.

It adds information the raw source catalog does not provide:

- project-oriented use descriptions;
- mood tags;
- semantic roles;
- industry tags;
- art-direction intent;
- pairing systems;
- bundled/default status.

This lets an operator begin with a creative objective such as `luxury architecture`, `automotive technical`, `editorial culture` or `multilingual` rather than browsing thousands of family names without context.

## Production rule

The catalog is metadata-first by design. **Do not bundle the entire vault into a client project.**

1. Explore the broad field in `/type-vault`.
2. Narrow by creative territory, role, category, source and coverage.
3. Select a pairing or individual family set for the project art direction.
4. Verify the exact family license, glyph coverage and weights required by the client.
5. Install or self-host only the final approved families.
6. Expose them through project typography tokens with resilient system fallbacks.
7. Preload only families that materially affect above-the-fold rendering.
8. Re-test layout, CLS, language coverage and fallback behavior before release.

This keeps Forge's typography vocabulary large without turning the production runtime into a font warehouse.

## Pairing philosophy

Pairings are directed starting systems, not themes.

A strong Forge project will normally use two families:

- one primary display/editorial voice;
- one body/interface voice.

A third family is reserved for a genuine accent or technical role. The final system must still respond to the client's logo, copy density, language requirements, imagery, interface complexity and brand truth.

## Scope boundary

Type Vault is a discovery and direction system, not a license clearinghouse or DCC font manager.

Forge must not imply that an upstream family is cleared for every form of commercial redistribution merely because it appears in Fontsource, Google Fonts or another reference collection. Final production usage still requires license and glyph verification for the specific family and distribution model.
