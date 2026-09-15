import fs from "node:fs";
import { parseCreativeDirection } from "../src/platform/creativeDirectionSchema.ts";

const file = process.argv[2] || "config/creative-direction.json";

try {
  const d = parseCreativeDirection(JSON.parse(fs.readFileSync(file, "utf8")));
  const ids = new Set();
  for (const s of d.scenes) {
    if (ids.has(s.id)) throw new Error(`duplicate scene id: ${s.id}`);
    ids.add(s.id);
  }

  const baseChecks = [
    ["strategy", Boolean(d.concept && d.audience && d.promise)],
    ["approved constraints", d.constraints.approved.length > 0],
    ["visual identity", d.visual.palette.length > 0 && d.visual.typography.length > 0],
    ["scene purpose", d.scenes.every((s) => s.purpose.length > 8 && s.interaction.length > 3)],
    ["conversion intent", Boolean(d.cta && d.successEvent)],
    ["transitions", d.scenes.every((s) => s.transitionIn && s.transitionOut)],
    ["emotional coverage", d.scenes.length >= d.emotionalArc.length - 1],
  ];

  const failedBase = baseChecks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failedBase.length) throw new Error(`creative quality gates failed: ${failedBase.join(", ")}`);

  let advancedSummary = "advanced direction optional";
  if (d.artDirection) {
    const a = d.artDirection;
    const globalChecks = [
      ["north star", a.northStar.length >= 20],
      ["hierarchy", a.hierarchy.length > 0],
      ["composition", a.compositionRules.length > 0],
      ["camera language", a.cameraLanguage.length > 0],
      ["lighting language", a.lightingLanguage.length > 0],
      ["motion language", a.motionLanguage.length > 0],
      ["continuity", a.continuityRules.length > 0],
      ["realism", a.realismRules.length > 0],
      ["mobile", a.mobileRules.length > 0],
      ["performance", a.performanceRules.length > 0],
      ["forbidden patterns", a.forbiddenPatterns.length > 0],
    ];

    const directedScenes = d.scenes.filter((s) => s.direction);
    const sceneCoverage = directedScenes.length / d.scenes.length;
    const sceneChecks = directedScenes.map((s) => {
      const x = s.direction;
      return Boolean(
        x &&
        x.objective &&
        x.composition.length &&
        x.camera?.framing.length &&
        x.camera?.path.length &&
        x.camera?.speed.length &&
        x.lighting?.timeOfDay.length &&
        x.motion?.continuity.length &&
        x.assetRequirements.length &&
        x.mobileNotes.length &&
        x.negativeDirectives.length
      );
    });

    const failedGlobal = globalChecks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failedGlobal.length) {
      throw new Error(`advanced art-direction gates failed: ${failedGlobal.join(", ")}`);
    }
    if (sceneCoverage < 0.75) {
      throw new Error(`advanced art-direction scene coverage too low: ${Math.round(sceneCoverage * 100)}%; require >=75%`);
    }
    if (sceneChecks.some((ok) => !ok)) {
      throw new Error("one or more directed scenes are missing camera, lighting, continuity, asset, mobile or negative-direction detail");
    }

    const globalScore = globalChecks.filter(([, ok]) => ok).length;
    advancedSummary = `advanced ${globalScore}/${globalChecks.length}, scene coverage ${Math.round(sceneCoverage * 100)}%`;
  }

  console.log(`CREATIVE VALID ${file}: ${d.conceptId}, ${d.scenes.length} scenes, 7/7 base gates, ${advancedSummary}`);
} catch (e) {
  console.error(`CREATIVE INVALID ${file}: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
