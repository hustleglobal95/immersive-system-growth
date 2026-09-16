# Forge Type Vault

Forge Type Vault is the typography selection layer for cinematic projects. It keeps a broad curated library available to designers and agents without shipping the entire library to every production build.

## What it provides

- 100+ curated font references across Serif, Sans, Display, Mono and Script.
- Search by name, intended use, role, mood or industry tag.
- Mood filters for Luxury, Editorial, Modern, Technical, Warm, Bold, Minimal, Playful, Classic and Experimental.
- Semantic roles: Display, Body, UI, Label, Editorial and Accent.
- Curated pairing presets for common Forge project categories including luxury real estate, hospitality, automotive, technology, fashion, cultural work and creative studios.
- Three pinned local defaults remain available immediately: Cormorant Garamond, DM Sans and Manrope.

## Production rule

The catalog is metadata-first by design. Do not bundle the entire vault into a client project.

1. Explore and filter the vault in `/design`.
2. Pick a pairing or individual families for the art direction.
3. Verify the license and glyph/language coverage required by the client.
4. Install or self-host only the final selected families.
5. Expose those families through project typography tokens and maintain sensible system fallbacks.
6. Preload only fonts that materially affect above-the-fold rendering.

This keeps Forge visually flexible while protecting performance.

## Search examples

Search terms are intentionally semantic. Examples:

- `luxury real-estate`
- `automotive technical`
- `editorial architecture`
- `fashion luxury`
- `hospitality warm`
- `experimental technology`
- `multilingual`

## Pairing philosophy

Pairings are starting points, not locked themes. A Forge project should usually use two families, with a third accent family only when it adds real hierarchy. The final decision still depends on the client's actual copy, logo, language coverage and visual assets.
