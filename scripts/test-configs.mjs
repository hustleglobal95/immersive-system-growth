import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const files = [
  path.join(process.cwd(), "config/experience.json"),
  ...fs
    .readdirSync(path.join(process.cwd(), "recipes"))
    .filter((x) => x.endsWith(".json"))
    .map((x) => path.join(process.cwd(), "recipes", x)),
];
for (const file of files) {
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.ok(config.scenes.length >= 3, `${file} should have at least 3 scenes`);
  assert.equal(config.scenes[0].range[0], 0, `${file} must start at 0`);
  assert.equal(config.scenes.at(-1).range[1], 1, `${file} must end at 1`);
  for (let i = 1; i < config.scenes.length; i += 1)
    assert.equal(
      config.scenes[i - 1].range[1],
      config.scenes[i].range[0],
      `${file} scene ranges must be contiguous`,
    );
}
console.log(`Config tests passed for ${files.length} experiences.`);
