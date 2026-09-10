import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config/experience.json"), "utf8"));
const warnings = [];
const errors = [];
const distance = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
const delta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v-b[i])));

for (let i = 0; i < config.scenes.length; i += 1) {
  const scene = config.scenes[i];
  const duration = scene.range[1] - scene.range[0];
  const travel = distance(scene.camera.from.position, scene.camera.to.position);
  if (duration < 0.055) warnings.push(`${scene.id}: scene duration is very short (${duration.toFixed(3)}).`);
  if (duration > 0.34) warnings.push(`${scene.id}: scene consumes over one third of the timeline.`);
  if (travel < 0.08) warnings.push(`${scene.id}: camera barely moves. Confirm this is a deliberate hold.`);
  if (travel > 10) warnings.push(`${scene.id}: camera travels ${travel.toFixed(1)} world units. Check scale and clipping.`);
  for (const fov of [scene.camera.from.fov, scene.camera.to.fov]) if (fov < 22 || fov > 72) warnings.push(`${scene.id}: FOV ${fov} may look extreme.`);
  for (const scale of [scene.hero.from.scale, scene.hero.to.scale]) if (scale < 0.04 || scale > 8) warnings.push(`${scene.id}: hero scale ${scale} is extreme.`);
  if ((scene.copy.body?.length ?? 0) > 260) warnings.push(`${scene.id}: body copy may be too long for a motion scene.`);

  if (i > 0) {
    const prev = config.scenes[i-1];
    if (delta(prev.camera.to.position, scene.camera.from.position) > 0.001) warnings.push(`${prev.id} -> ${scene.id}: camera position is discontinuous.`);
    if (delta(prev.camera.to.target, scene.camera.from.target) > 0.001) warnings.push(`${prev.id} -> ${scene.id}: camera target is discontinuous.`);
    if (Math.abs(prev.camera.to.fov - scene.camera.from.fov) > 0.01) warnings.push(`${prev.id} -> ${scene.id}: FOV jumps at the boundary.`);
    if (delta(prev.hero.to.position, scene.hero.from.position) > 0.001) warnings.push(`${prev.id} -> ${scene.id}: persistent hero position jumps.`);
    if (delta(prev.hero.to.rotation, scene.hero.from.rotation) > 0.001) warnings.push(`${prev.id} -> ${scene.id}: persistent hero rotation jumps.`);
    if (Math.abs(prev.hero.to.scale - scene.hero.from.scale) > 0.001) warnings.push(`${prev.id} -> ${scene.id}: persistent hero scale jumps.`);
  }
}

if (config.scenes.filter((s) => s.camera.path === "orbit").length > Math.ceil(config.scenes.length / 2)) warnings.push("Orbit is used in more than half the scenes. The experience may feel like a model viewer.");
if ((config.hotspots?.length ?? 0) > 12) warnings.push("More than 12 hotspots are configured. Check interaction density.");

warnings.forEach((message) => console.warn(`WARN ${message}`));
errors.forEach((message) => console.error(`ERROR ${message}`));
console.log(`Cinematic audit: ${warnings.length} warnings, ${errors.length} errors.`);
if (errors.length) process.exit(1);
