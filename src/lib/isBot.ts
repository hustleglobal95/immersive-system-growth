/**
 * Is this client a crawler?
 *
 * A crawler cannot see a WebGL scene, so shipping it three, React Three Fiber and the scene
 * chunk is pure waste: crawl budget spent, and a page-speed score measured against a client that
 * will never look at the canvas.
 *
 * Deliberately a client-side user-agent test rather than a server-side header read. Reading
 * `headers()` in a layout opts the whole route out of static rendering and costs TTFB on every
 * visit, for everyone, to help the small fraction that are robots -- a worse trade than the
 * problem. Because the scene is a dynamic import, simply not rendering it means the chunk is
 * never requested.
 *
 * The list is conservative: it matches declared crawlers and nothing else. A false positive
 * costs a visitor the scene, so anything ambiguous is treated as a person.
 */
const CRAWLERS = /(bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|petalbot|ahrefsbot|semrushbot|screaming frog|gptbot|oai-searchbot|chatgpt-user|claudebot|perplexitybot|google-extended)/i;

/**
 * Note what is deliberately absent: Lighthouse, PageSpeed Insights, GTmetrix and headless Chrome.
 * Matching those would strip the heaviest bundle from exactly the clients that measure the page,
 * which improves the score without improving anything a visitor experiences. The number is only
 * worth having if it describes what a person actually gets.
 */

export function isBotUserAgent(userAgent: string | undefined | null) {
  if (!userAgent) return false;
  return CRAWLERS.test(userAgent);
}

export function isBotClient() {
  if (typeof navigator === "undefined") return false;
  // A declared automation flag is a robot by its own admission.
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver === true) return true;
  return isBotUserAgent(navigator.userAgent);
}
