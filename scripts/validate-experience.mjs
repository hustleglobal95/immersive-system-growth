import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "config/experience.json");
const config = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];
const warnings = [];
const paths = new Set(["linear", "dolly", "arc", "orbit", "crane", "threshold", "flyby", "swoop", "macro", "pullback"]);
const easings = new Set(["linear", "smooth", "cinematic"]);

if (!Array.isArray(config.scenes) || config.scenes.length === 0) errors.push("Experience must contain scenes.");
if (config.scenes?.[0]?.range?.[0] !== 0) errors.push("First scene must start at 0.");
if (config.scenes?.at(-1)?.range?.[1] !== 1) errors.push("Last scene must end at 1.");

for (let i = 0; i < (config.scenes?.length ?? 0); i += 1) {
  const scene = config.scenes[i];
  if (!scene.id || !/^[a-z0-9-]+$/.test(scene.id)) errors.push(`Scene ${i + 1}: id must be lowercase kebab-case.`);
  if (!Array.isArray(scene.range) || scene.range.length !== 2 || scene.range[0] < 0 || scene.range[1] > 1 || scene.range[1] <= scene.range[0]) errors.push(`${scene.id}: invalid range.`);
  if (!paths.has(scene.camera?.path)) errors.push(`${scene.id}: unknown camera path ${scene.camera?.path}.`);
  if (!easings.has(scene.easing)) errors.push(`${scene.id}: unknown easing ${scene.easing}.`);
  if (!scene.copy?.headline || !scene.copy?.body) errors.push(`${scene.id}: copy requires headline and body.`);
  if (scene.copy?.headline?.length > 90) warnings.push(`${scene.id}: headline is over 90 characters.`);
  if (i > 0 && Math.abs(config.scenes[i - 1].range[1] - scene.range[0]) > 1e-9) errors.push(`${config.scenes[i - 1].id} -> ${scene.id}: ranges must touch exactly.`);
  const vecs = [scene.camera?.from?.position, scene.camera?.from?.target, scene.camera?.to?.position, scene.camera?.to?.target, scene.hero?.from?.position, scene.hero?.from?.rotation, scene.hero?.to?.position, scene.hero?.to?.rotation];
  if (vecs.some((v) => !Array.isArray(v) || v.length !== 3 || v.some((n) => typeof n !== "number"))) errors.push(`${scene.id}: one or more vectors are invalid.`);
}

for (const hotspot of config.hotspots ?? []) {
  if (!config.scenes.some((scene) => scene.id === hotspot.sceneId)) errors.push(`Hotspot ${hotspot.id}: sceneId ${hotspot.sceneId} does not exist.`);
}

warnings.forEach((x) => console.warn(`WARN ${x}`));
errors.forEach((x) => console.error(`ERROR ${x}`));
if (errors.length) process.exit(1);
console.log(`Experience valid: ${config.scenes.length} scenes, ${config.hotspots?.length ?? 0} hotspots.`);
