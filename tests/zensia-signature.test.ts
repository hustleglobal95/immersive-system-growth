import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync("src/experiences/zensia/ZensiaExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia.css","utf8");

test("Zensia signature repair is state-owned rather than clock-owned",()=>{
  assert.doesNotMatch(source,/clock\.elapsedTime/);
  assert.doesNotMatch(source,/rotation\.y\s*\+=/);
  assert.match(source,/data-signature-state=\{calm \? "stay" : "rush"\}/);
  assert.match(source,/zensia-calm-proof/);
});

test("Zensia calm mode has an explicit desktop and mobile recomposition",()=>{
  assert.match(css,/Forge Signature Slice Gate candidate/);
  assert.match(css,/\.zensia\[data-calm="true"\] \.zensia-pause__inner/);
  assert.match(css,/\.zensia\[data-calm="true"\] \.zensia-calm-proof/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/\.zensia\[data-calm="true"\] \.zensia-pause h2/);
});

test("Zensia signature preserves semantic conversion links",()=>{
  assert.match(source,/https:\/\/zensia-coffee-llc\.square\.site\//);
  assert.match(source,/https:\/\/www\.zensiacoffee\.com\/actual-menu/);
  assert.match(source,/profile\.squareup\.com\/loyalty\/MLX5PRMQ9XZ02/);
});
