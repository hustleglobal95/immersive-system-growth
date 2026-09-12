# Forge Asset Bank

The Bank workspace in `/studio` browses a versioned, searchable production catalog. It keeps source discovery separate from preparation and approval. The initial catalog contains 2,375 Poly Haven source entries, seven Forge reference assets (13 files including mobile variants), and six coordinated reference kits. These are measured snapshot counts, not a claim that thousands of client-ready assets have been prepared.

## Everyday workflow

1. Search by subject and filter by type, provider, preparation status or assigned industry. Provider items without an authored industry remain unclassified; their original category tags are searchable.
2. Inspect provenance, license, thumbnail, source dimensions or polygon count, variants and review status. A source listing has no runtime files and cannot be inserted.
3. Shortlist assets and export the selection before leaving the Bank workspace. Shortlists are temporary; exported JSON retains provenance for handoff.
4. Download chosen source files from their provider. Optimize models to self-contained GLB, make mobile variants, inspect node mappings and stage approved outputs under `public/` or on your own public CDN.
5. Register local files with `bank:prepare`, then validate and commit the catalog update. Restart development or redeploy to load the new immutable catalog snapshot.
6. Insert prepared/reference models as scene assets, or images/videos into a scene with no existing media. Position them in the existing authoring tools. The persistent hero and its rig are not replaced. Materials, HDRIs, fonts and audio are cataloged and exported for their respective integration workflows, not automatically inserted.
7. Review kit contents and their replacement scope before applying. Kits use the existing recipe runtime with cameras, lighting, models, motion and semantic content. Kit preview is on demand. Kit replacement participates in experience undo. Existing scene triggers, sequence/camera actions or hotspot actions referencing missing kit members block replacement; export for a new project instead. Review custom DOM selectors and shader targets separately.

Undo restores the experience. Manifest entries remain registered so undo/redo cannot strand a restored asset. Review the per-project manifest before release. Reference fixture approval covers development only, not final client visual approval.

## Catalog operations

```bash
npm run bank:validate
npm run bank:seed                 # derive and verify existing original fixtures, dry run
npm run bank:seed -- --write
npm run bank:sync                 # fetch Poly Haven metadata once, dry run
npm run bank:sync -- --write
npm run bank:import -- --file incoming-bank.json
npm run bank:import -- --file incoming-bank.json --write
npm run bank:prepare -- --id polyhaven-example --url /models/client/example.glb --mobile /models/client/example-low.glb --by "Reviewer name" --scope client --notes "Approved for the named client project"
```

Preparation computes bytes and SHA-256, inspects actual GLB nodes and triangle counts, rejects external GLB dependencies, and records the supplied reviewer decision. Add `--write` to persist after review. It does not manufacture an artistic approval or certify device performance. `bank:prepare` stages metadata for existing local files; it neither downloads arbitrary URLs nor uploads to cloud accounts.

For videos, supply `--poster /textures/...` to register the verified poster used by the reduced-motion path. Provider thumbnails remain discovery previews. Model mobile variants are inspected for embedded dependencies too.

`bank:import` accepts a full `{ "version": 1, "assets": [...], "kits": [...] }` collection. Definitions live in `src/platform/assetBankSchema.ts`. Validate complete incoming collections before merging. Duplicate IDs, provider identity collisions, missing kit members, stale local hashes and unapproved asset hosts fail. Source refreshes preserve previously prepared files and review metadata. Catalog writes use a single writer lock, content-addressed shards and an atomic index replacement. Old shard files are retained as recoverable snapshots and may be pruned manually once unreferenced.

## Storage and scale

Metadata lives in `catalog/asset-bank/`; binaries remain outside the catalog. Each shard contains at most 250 entries. The schema supports up to 100,000 entries, but that is a validation ceiling, not a measured deployment capacity. The included 10,000-entry search test verifies pagination behavior. Benchmark memory and latency against the intended hosting tier before going substantially beyond the shipped snapshot.

The server builds a text index once per deployment and returns at most 48 records per query (24 in Studio). The public cinematic runtime imports no catalog data. Next output tracing explicitly includes catalog shards and recipe files for the API route. Search is a server memory scan over normalized text; a database/full-text service is the next scaling step when measured workloads require it.

Catalog metadata is public to anyone who can access the Studio API. Do not add confidential client assets, signed URLs, credentials or unpublished source links. Private libraries require authenticated storage and access controls as a separate deployment extension.

For prepared CDN files, set permanent public HTTPS URLs with measured bytes and SHA-256 in imported records, and add the exact hostname to `config/asset-bank-storage.json`. Configure object storage, CDN caching, CORS and access controls in your own account. No bucket is provisioned by this change. Remote runtime hashes describe reviewed uploads; validation does not download every remote binary. Verify CDN content and physical-device behavior before a client release. The per-project manifest should include only selected runtime assets, not the entire source catalog.

## Poly Haven source adapter

The adapter makes one bounded request to `https://api.polyhaven.com/assets`, with an identifying User-Agent and Referer, a timeout and redirect rejection. Provider IDs, authors, tags, source geometry metrics and supplied thumbnail URLs are recorded. No binary bulk download occurs. Refreshes are operator initiated; CI and public pages do not depend on the live provider API. The snapshot can still be searched during an upstream outage; remote thumbnails may be unavailable and show a fallback.

Powered by [Poly Haven](https://polyhaven.com). Its assets are [CC0](https://polyhaven.com/license). API access and preview content follow the separate [API terms](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md). Provider previews are for discovery and must not be treated as licensed client artwork merely because the underlying models or materials are CC0. This project uses the API, not its AGPL implementation code.

## Expansion path

Prepare coherent restaurant, property and product collections next. Each new kit should name every required asset, mobile alternative, source right and approval scope. The bank supports image/video/audio/font records now, but the shipped large external snapshot is models, materials and HDRIs. A larger asset count does not imply finished kits or broader media coverage.
