# Content and commerce integrations

Studio project files support three content source types:

- `static` for checked-in structured content.
- `json` for an HTTPS CMS or owned JSON feed.
- `shopify` for the Storefront GraphQL API.

Every source has explicit mappings from a source JSON path to an existing experience JSON path. `npm run content:sync -- config/studio-project.json` performs a dry run. Add `--write` only after the mapped output validates.

The browser preview route accepts small requests, times out after five seconds, rejects redirects and permits remote JSON hosts only when listed in `FORGE_ALLOWED_CONTENT_HOSTS`. JSON header variables must follow `FORGE_CONTENT_*_HEADERS`. Shopify tokens must follow `SHOPIFY_STOREFRONT_*_TOKEN`. Secrets stay server-side.

Content synchronization is a build-time operation. The public experience does not depend on a CMS response for its primary copy or conversion controls.


Remote responses are guarded by an explicit byte ceiling (2 MB by default), JSON content-type validation, redirect rejection and a five-second timeout. This keeps preview and build-time sync predictable when a CMS or commerce endpoint is misconfigured or compromised.
