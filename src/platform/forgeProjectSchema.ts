import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const relativeJsonPath = z
  .string()
  .regex(/^(?!\/)(?!.*\.\.)(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+\.json$/);
const branchName = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,119}$/);
const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "Release asset origins must use HTTPS",
});

const pathSetSchema = z.object({
  experience: relativeJsonPath,
  studioProject: relativeJsonPath,
  creativeDirection: relativeJsonPath,
  assetManifest: relativeJsonPath,
}).strict();

const performanceSchema = z.object({
  initialCriticalMb: z.number().finite().positive().max(64).default(8),
  scenePreloadMb: z.number().finite().positive().max(256).default(20),
  maxActiveMb: z.number().finite().positive().max(512).default(96),
  maxTotalMb: z.number().finite().positive().max(2048).default(256),
  maxDrawCalls: z.number().int().positive().max(5000).default(250),
  maxTriangles: z.number().int().positive().max(5000000).default(750000),
  targetFps: z.number().int().min(30).max(120).default(60),
}).strict();

export const forgeProjectSchema = z.object({
  version: z.literal(1),
  id: slug,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  paths: pathSetSchema,
  performance: performanceSchema,
  capabilities: z.object({
    webgl: z.enum(["required", "enhanced", "optional"]).default("enhanced"),
    webgpu: z.enum(["off", "opt-in"]).default("off"),
    xr: z.enum(["off", "opt-in"]).default("off"),
    spatialAudio: z.enum(["off", "opt-in"]).default("off"),
  }).strict(),
  release: z.object({
    provider: z.enum(["vercel", "custom"]).default("vercel"),
    productionBranch: branchName.default("main"),
    requireReview: z.boolean().default(true),
    immutableAssets: z.boolean().default(true),
    assetBaseUrl: httpsUrl.optional(),
  }).strict(),
}).strict().superRefine((project, ctx) => {
  const { initialCriticalMb, scenePreloadMb, maxActiveMb, maxTotalMb } = project.performance;
  if (initialCriticalMb > scenePreloadMb) {
    ctx.addIssue({ code: "custom", path: ["performance", "scenePreloadMb"], message: "Scene preload budget must include the critical budget" });
  }
  if (scenePreloadMb > maxActiveMb) {
    ctx.addIssue({ code: "custom", path: ["performance", "maxActiveMb"], message: "Active-scene budget must include the preload budget" });
  }
  if (maxActiveMb > maxTotalMb) {
    ctx.addIssue({ code: "custom", path: ["performance", "maxTotalMb"], message: "Total asset budget must include the active-scene budget" });
  }
});

export type ForgeProject = z.infer<typeof forgeProjectSchema>;

export function parseForgeProject(input: unknown): ForgeProject {
  return forgeProjectSchema.parse(input);
}