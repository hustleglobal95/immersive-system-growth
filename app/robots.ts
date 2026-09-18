import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/siteUrl";

/**
 * Only the client-facing routes are crawlable.
 *
 * This repository ships the Atelier Maris site alongside its own tooling -- the Studio, the
 * Director, the type vault, the lab and the design workbench. Those are internal surfaces that
 * happen to be routes; none of them should appear in a search result next to the client's work,
 * and several expose editor UI. They are disallowed here rather than left to chance.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/site", "/work", "/about"],
        disallow: [
          "/design",
          "/director",
          "/forge",
          "/heliot",
          "/lab",
          "/structure",
          "/studio",
          "/type-vault",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
