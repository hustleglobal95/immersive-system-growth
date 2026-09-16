import fs from "node:fs/promises";
import path from "node:path";
import { recordPreference } from "../src/platform/director-intelligence/taste.ts";

const profilePath = "forge-intelligence/taste/profile.json";
const winnerId = process.argv.find((arg) => arg.startsWith("--winner="))?.split("=")[1];
const loserId = process.argv.find((arg) => arg.startsWith("--loser="))?.split("=")[1];
const reason = process.argv.find((arg) => arg.startsWith("--reason="))?.slice("--reason=".length);
if (!winnerId || !loserId || !reason) {
  console.error("Usage: npm run director:preference -- --winner=<id> --loser=<id> --reason=\"why\" [--restraintVsSpectacle=-0.5 ...]");
  process.exit(1);
}
const profile = JSON.parse(await fs.readFile(profilePath, "utf8"));
const allowed = ["restraintVsSpectacle","literalVsAbstract","cinematicVsEditorial","continuousVsChaptered","typographyVsImage","darkVsLight","denseVsSparse","directedVsExploratory","realismVsStylization","emotionalVsRational","familiarVsNovel"];
const dimensions = {};
for (const key of allowed) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${key}=`))?.split("=")[1];
  if (raw === undefined) continue;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < -1 || value > 1) throw new Error(`${key} must be between -1 and 1.`);
  dimensions[key] = value;
}
const next = recordPreference(profile, { id: `preference-${profile.preferences.length + 1}`, winnerId, loserId, reasons: [reason], dimensions, createdAt: new Date().toISOString() });
await fs.mkdir(path.dirname(profilePath), { recursive: true });
await fs.writeFile(profilePath, JSON.stringify(next, null, 2) + "\n");
console.log(`Recorded preference ${next.preferences.length}; taste confidence ${(next.confidence * 100).toFixed(0)}%.`);
