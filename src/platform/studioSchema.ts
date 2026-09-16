import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const relativeJsonPath = z
  .string()
  .regex(/^(?!\/)(?!.*\.\.)(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+\.json$/);
const envName = z.string().regex(/^[A-Z][A-Z0-9_]*$/);
const contentHeadersEnv = z.string().regex(/^FORGE_CONTENT_[A-Z0-9_]*HEADERS$/);
const shopifyTokenEnv = z.string().regex(/^SHOPIFY_STOREFRONT_[A-Z0-9_]*TOKEN$/);
const jsonPath = z.string().regex(/^\$(?:\.[a-zA-Z0-9_-]+|\[\d+\])+$/);
const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "Integration endpoints must use HTTPS",
});

const mappingSchema = z
  .object({ from: jsonPath, to: jsonPath })
  .strict();

const staticSourceSchema = z
  .object({
    id: slug,
    kind: z.literal("static"),
    data: z.json(),
    mappings: z.array(mappingSchema).max(100).default([]),
  })
  .strict();

const jsonSourceSchema = z
  .object({
    id: slug,
    kind: z.literal("json"),
    endpoint: httpsUrl,
    headersEnv: contentHeadersEnv.optional(),
    mappings: z.array(mappingSchema).min(1).max(100),
  })
  .strict();

const shopifySourceSchema = z
  .object({
    id: slug,
    kind: z.literal("shopify"),
    storeDomain: z.string().regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/),
    storefrontTokenEnv: shopifyTokenEnv,
    apiVersion: z.string().regex(/^20\d{2}-(?:01|04|07|10)$/),
    productLimit: z.number().int().min(1).max(50).default(12),
    mappings: z.array(mappingSchema).min(1).max(100),
  })
  .strict();

export const contentSourceSchema = z.discriminatedUnion("kind", [
  staticSourceSchema,
  jsonSourceSchema,
  shopifySourceSchema,
]);

export const studioProjectSchema = z
  .object({
    version: z.literal(2),
    id: slug,
    name: z.string().min(1).max(100),
    experiencePath: relativeJsonPath,
    directorTreatmentPath: relativeJsonPath.default("config/director-treatment.json"),
    creativeDirectionPath: relativeJsonPath.default("config/creative-direction.json"),
    visualSystemsPath: relativeJsonPath.default("config/visual-systems.json"),
    experienceModesPath: relativeJsonPath.default("config/experience-modes.json"),
    contentSources: z.array(contentSourceSchema).max(20).default([]),
    deployment: z
      .object({
        provider: z.enum(["vercel", "custom"]),
        projectName: slug,
        productionBranch: z.string().min(1).max(120).default("main"),
        deployHookEnv: envName.optional(),
      })
      .strict(),
    telemetry: z
      .object({
        enabled: z.boolean().default(true),
        endpoint: z.string().regex(/^\/(?!\/)[^\s?#]*$/).default("/api/telemetry"),
        sampleRate: z.number().min(0).max(1).default(1),
        consent: z.enum(["analytics", "essential"]).default("analytics"),
        respectDnt: z.boolean().default(true),
      })
      .strict(),
  })
  .strict();

export type StudioProject = z.infer<typeof studioProjectSchema>;
export type ContentSource = z.infer<typeof contentSourceSchema>;
export type ContentMapping = z.infer<typeof mappingSchema>;

export function parseStudioProject(input: unknown): StudioProject {
  return studioProjectSchema.parse(input);
}
