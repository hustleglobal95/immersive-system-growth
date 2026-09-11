import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { directions } from "../src/design/directions";
import { fontCatalog, searchFonts } from "../src/design/catalog";

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
test("every direction's reading and action colors meet AA contrast on both surfaces", () => {
  for (const d of Object.values(directions)) {
    for (const surface of [d.background, d.surface]) {
      for (const text of [d.ink, d.muted, d.accent]) assert.ok(contrast(text, surface) >= 4.5, `${d.name}: ${text} on ${surface}`);
      assert.ok(contrast(d.border, surface) >= 3, `${d.name}: control boundary`);
    }
    assert.ok(contrast(d.onAccent, d.accent) >= 4.5, `${d.name}: action`);
  }
});
test("bundled fonts retain upstream license records and stay under the 110 KiB total budget", () => {
  let total = 0;
  for (const f of fontCatalog.filter(f => f.bundled)) {
    const base = `node_modules/@fontsource-variable/${f.id}`;
    assert.equal(JSON.parse(readFileSync(`${base}/metadata.json`, "utf8")).license.type, "OFL-1.1");
    assert.equal(readFileSync(`public/fonts/licenses/${f.id}.txt`, "utf8").trimEnd(), readFileSync(`${base}/LICENSE`, "utf8").trimEnd());
    const bytes = statSync(`${base}/files/${f.id}-latin-wght-normal.woff2`).size;
    assert.ok(bytes < 45 * 1024, `${f.name} exceeds per-family budget`);
    total += bytes;
  }
  assert.ok(total < 110 * 1024);
});
test("font discovery combines category and search without duplicate references", () => {
  assert.equal(new Set(fontCatalog.map(f => f.id)).size, fontCatalog.length);
  assert.equal(searchFonts("cormorant", "Serif")[0].name, "Cormorant Garamond");
  assert.equal(searchFonts("cormorant", "Mono").length, 0);
  assert.ok(searchFonts("technical", "Mono").length > 0);
});
