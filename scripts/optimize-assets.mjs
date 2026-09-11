#!/usr/bin/env node
import process from "node:process";
import { optimizeTexture } from "./asset-optimize-lib.mjs";

const args = process.argv.slice(2);
if (!args.length || args.includes("--help")) {
  console.log("Usage: npm run assets:optimize -- public/textures/photo.jpg [more files] [--format=avif|webp] [--width=2048] [--quality=78] [--force] [--no-manifest]");
  process.exit(args.includes("--help") ? 0 : 1);
}
const options = Object.fromEntries(args.filter((value) => value.startsWith("--") && value.includes("=")).map((value) => value.slice(2).split(/=(.*)/s, 2)));
const inputs = args.filter((value) => !value.startsWith("--"));
if (!inputs.length) throw new Error("Provide at least one source image inside public/textures");
const results = [];
for (const input of inputs) results.push(await optimizeTexture({
  root: process.cwd(),
  input,
  format: options.format ?? "avif",
  width: Number(options.width ?? 2048),
  quality: Number(options.quality ?? 78),
  force: args.includes("--force"),
  updateManifest: !args.includes("--no-manifest"),
}));
console.log(JSON.stringify(results, null, 2));
