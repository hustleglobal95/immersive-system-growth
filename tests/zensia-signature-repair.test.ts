import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component=fs.readFileSync("src/experiences/zensia/ZensiaExperience.tsx","utf8");
const css=fs.readFileSync("app/zensia/zensia.css","utf8");

test("Zensia signature is controlled by one semantic pace input",()=>{
  assert.match(component,/type="range"/);
  assert.match(component,/Change the pace from city rush to stay/);
  assert.match(component,/data-pace-zone/);
  assert.match(component,/The room has changed pace\./);
  assert.doesNotMatch(component,/Enter calm mode/);
});

test("Zensia pace state drives the persistent spatial world and camera",()=>{
  assert.match(component,/signaturePace/);
  assert.match(component,/camera\.position\.z/);
  assert.match(component,/glassLeft\.current\.position\.x/);
  assert.match(component,/orb\.current\.position\.x/);
  assert.match(component,/cup\.current\.position\.x/);
});

test("Zensia signature has authored desktop, mobile and reduced-motion composition",()=>{
  assert.match(css,/Forge signature repair: pace is the single interaction/);
  assert.match(css,/\.zensia-pause__aperture/);
  assert.match(css,/\.zensia-pause__calm-field/);
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
