import fs from "node:fs";
import path from "node:path";
const config = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "config/experience.json"), "utf8"),
);
console.log(`\n${config.meta.name}\n${"=".repeat(config.meta.name.length)}\n`);
for (const [index, scene] of config.scenes.entries()) {
  const pct = (scene.range[1] - scene.range[0]) * 100;
  console.log(
    `${String(index + 1).padStart(2, "0")} ${scene.label} [${scene.range[0].toFixed(2)}..${scene.range[1].toFixed(2)}] ${pct.toFixed(0)}%`,
  );
  console.log(
    `   camera: ${scene.camera.path}  ${JSON.stringify(scene.camera.from.position)} -> ${JSON.stringify(scene.camera.to.position)}`,
  );
  console.log(
    `   hero:   ${scene.hero.motion ?? "linear"}  scale ${scene.hero.from.scale} -> ${scene.hero.to.scale}`,
  );
  console.log(`   copy:   ${scene.copy.headline}\n`);
}
