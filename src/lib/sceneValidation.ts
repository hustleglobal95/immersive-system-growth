import { experienceSchema, sceneSchema } from "@/src/lib/configSchema";
export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}
function issues(
  result: ReturnType<typeof experienceSchema.safeParse>,
): ValidationIssue[] {
  return result.success
    ? []
    : result.error.issues.map((i) => ({
        level: "error",
        message: `${i.path.join(".")}: ${i.message}`,
      }));
}
export function validateExperienceConfig(config: unknown): ValidationIssue[] {
  return issues(experienceSchema.safeParse(config));
}
export function validateScene(scene: unknown): ValidationIssue[] {
  const r = sceneSchema.safeParse(scene);
  return r.success
    ? []
    : r.error.issues.map((i) => ({
        level: "error",
        message: `${i.path.join(".")}: ${i.message}`,
      }));
}
