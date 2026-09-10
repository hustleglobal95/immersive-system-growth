import fs from "node:fs";
import path from "node:path";
const dir = path.join(process.cwd(), "recipes");
const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));
console.log("Available Forge recipes:");
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  console.log(`- ${file.replace(/\.json$/, "")}: ${data.meta?.description ?? ""}`);
}
