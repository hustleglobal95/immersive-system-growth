import { presetCatalog } from "../src/platform/presetRegistry.ts";

const kind = process.argv[2] === "--kind" ? process.argv[3] : undefined;
const presets = kind ? presetCatalog.filter((preset) => preset.kind === kind) : presetCatalog;
console.log(JSON.stringify({ version: 1, presets }, null, 2));