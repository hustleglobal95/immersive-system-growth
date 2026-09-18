/**
 * The site's absolute origin.
 *
 * Metadata, canonical links, Open Graph images and the sitemap all need an absolute URL. Without
 * one Next resolves them against the request, so a social scraper is handed `localhost`. The
 * value comes from the environment so a preview deployment advertises itself rather than
 * production, and falls back to the dev origin so nothing breaks locally.
 */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
