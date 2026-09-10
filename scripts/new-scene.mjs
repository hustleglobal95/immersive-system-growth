import fs from "node:fs";
import path from "node:path";

const raw = process.argv[2];
if (!raw) {
  console.error("Usage: npm run scene:new -- scene-name");
  process.exit(1);
}
const id = raw
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const file = path.join(process.cwd(), "draft-scenes", `${id}.json`);
if (fs.existsSync(file)) {
  console.error(`Draft scene already exists: ${file}`);
  process.exit(1);
}
const scene = {
  id,
  label: id
    .split("-")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(" "),
  range: [0, 0.1],
  easing: "cinematic",
  camera: {
    path: "dolly",
    from: { position: [0, 0, 6], target: [0, 0, 0], fov: 42 },
    to: { position: [0, 0, 4], target: [0, 0, 0], fov: 38 },
  },
  hero: {
    from: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    to: { position: [0, 0, 0], rotation: [0, 0.8, 0], scale: 1.1 },
  },
  world: {
    background: "#070707",
    fog: "#070707",
    fogDensity: 0.03,
    ambient: 0.5,
    key: 4,
    rim: 2,
  },
  post: { bloom: 0.25, vignette: 0.35 },
  copy: {
    eyebrow: "SCENE",
    headline: "New cinematic scene.",
    body: "Define what the visitor should understand and feel in this scene.",
    align: "left",
  },
};
fs.writeFileSync(file, JSON.stringify(scene, null, 2) + "\n");
console.log(`Created ${path.relative(process.cwd(), file)}`);
console.log(
  "Copy the scene into config/experience.json and adjust its range so all scenes remain contiguous from 0 to 1.",
);
