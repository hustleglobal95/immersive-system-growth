import { z } from "zod";

const metricValue = z.union([z.number().finite(), z.string().max(120), z.boolean(), z.null()]);
export const telemetryEventSchema = z
  .object({
    version: z.literal(1),
    projectId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sessionId: z.string().uuid(),
    type: z.enum(["session", "fps", "vital", "long-task", "webgl"]),
    at: z.string().datetime(),
    page: z.string().startsWith("/").max(300),
    device: z
      .object({
        width: z.number().int().min(1).max(20000),
        height: z.number().int().min(1).max(20000),
        dpr: z.number().min(0.5).max(10),
        cores: z.number().int().min(1).max(512).optional(),
        memoryGb: z.number().min(0.25).max(1024).optional(),
        connection: z.string().max(30).optional(),
        reducedMotion: z.boolean(),
      })
      .strict(),
    metrics: z.record(z.string().max(60), metricValue),
  })
  .strict();

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
