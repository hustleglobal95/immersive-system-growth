import type { ContentMapping, ContentSource } from "@/src/platform/studioSchema";

type Environment = Record<string, string | undefined>;

export function assertAllowedIntegrationUrl(value: string, allowedHosts: readonly string[]) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Integration endpoint must use HTTPS");
  const allowed = allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith("." + host));
  if (!allowed) throw new Error(`Integration host is not allowed: ${url.hostname}`);
  return url;
}

export async function fetchContentSource(
  source: ContentSource,
  options: { allowedHosts: readonly string[]; environment?: Environment; signal?: AbortSignal; maxBytes?: number },
): Promise<unknown> {
  if (source.kind === "static") return source.data;
  const environment = options.environment ?? {};
  if (source.kind === "json") {
    const url = assertAllowedIntegrationUrl(source.endpoint, options.allowedHosts);
    const headers = source.headersEnv ? parseHeaders(environment[source.headersEnv]) : {};
    const response = await fetch(url, { headers, signal: options.signal, cache: "no-store", redirect: "error" });
    if (!response.ok) throw new Error(`Content source returned HTTP ${response.status}`);
    assertJsonContentType(response);
    return readJsonResponse(response, options.maxBytes);
  }

  const endpoint = `https://${source.storeDomain}/api/${source.apiVersion}/graphql.json`;
  assertAllowedIntegrationUrl(endpoint, [...options.allowedHosts, source.storeDomain]);
  const token = environment[source.storefrontTokenEnv];
  if (!token) throw new Error(`Missing ${source.storefrontTokenEnv}`);
  const query = `query ForgeProducts($first: Int!) { products(first: $first) { nodes { id handle title description featuredImage { url altText } priceRange { minVariantPrice { amount currencyCode } } } } }`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-shopify-storefront-access-token": token },
    body: JSON.stringify({ query, variables: { first: source.productLimit } }),
    signal: options.signal,
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Shopify returned HTTP ${response.status}`);
  assertJsonContentType(response);
  const body = await readJsonResponse(response, options.maxBytes) as { data?: unknown; errors?: unknown };
  if (body.errors) throw new Error("Shopify returned GraphQL errors");
  return body.data;
}

export function assertJsonContentType(response: Response) {
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType && contentType !== "application/json" && !contentType.endsWith("+json")) {
    throw new Error("Content source must return JSON");
  }
}

export async function readJsonResponse(response: Response, maxBytes = 2_000_000): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`Content source response exceeds ${maxBytes} bytes`);
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error(`Content source response exceeds ${maxBytes} bytes`);
    return parseJson(text);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Content source response exceeds ${maxBytes} bytes`);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  return parseJson(new TextDecoder().decode(bytes));
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Content source returned invalid JSON");
  }
}

export function applyContentMappings<T>(target: T, source: unknown, mappings: readonly ContentMapping[]): T {
  const result = structuredClone(target);
  for (const mapping of mappings) {
    const value = getJsonPath(source, mapping.from);
    if (value === undefined) throw new Error(`Content mapping source not found: ${mapping.from}`);
    setJsonPath(result, mapping.to, value);
  }
  return result;
}

export function getJsonPath(input: unknown, path: string): unknown {
  let current = input;
  for (const segment of parsePath(path)) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

function setJsonPath(input: unknown, path: string, value: unknown) {
  const segments = parsePath(path);
  let current = input;
  for (let index = 0; index < segments.length - 1; index++) {
    if (current === null || typeof current !== "object") throw new Error(`Content mapping target is not writable: ${path}`);
    current = (current as Record<string | number, unknown>)[segments[index]];
  }
  if (current === null || typeof current !== "object") throw new Error(`Content mapping target is not writable: ${path}`);
  (current as Record<string | number, unknown>)[segments.at(-1)!] = structuredClone(value);
}

function parsePath(path: string): Array<string | number> {
  const segments: Array<string | number> = [];
  path.replace(/\.([a-zA-Z0-9_-]+)|\[(\d+)\]/g, (_, key: string | undefined, index: string | undefined) => {
    segments.push(index === undefined ? key! : Number(index));
    return "";
  });
  return segments;
}

function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Content header environment variable must contain a JSON object");
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || !/^[a-z0-9-]+$/i.test(key)) throw new Error("Content headers must contain string values and safe names");
    headers[key] = value;
  }
  return headers;
}
