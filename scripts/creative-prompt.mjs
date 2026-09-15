import fs from "node:fs";
import { parseCreativeDirection } from "../src/platform/creativeDirectionSchema.ts";

const d = parseCreativeDirection(JSON.parse(fs.readFileSync(process.argv[2] || "config/creative-direction.json", "utf8")));

const join = (items = []) => items.length ? items.join("; ") : "none specified";
const section = (title, body) => `\n## ${title}\n${body}`;

const lines = [
  `# CREATIVE DIRECTION MASTER PROMPT — ${d.conceptId}`,
  "",
  "ROLE: Operate as a senior cinematic art director, architectural visualization director, motion designer, interaction director and real-time 3D technical director working as one system.",
  "OBJECTIVE: Translate the approved creative direction into precise, buildable, reversible and performance-aware scene direction. Preserve hierarchy, continuity and realism. Never invent claims, assets, metrics, testimonials or product behavior.",
  "",
  `CONCEPT: ${d.concept}`,
  `AUDIENCE: ${d.audience}`,
  `PROMISE: ${d.promise}`,
  `EMOTIONAL ARC: ${d.emotionalArc.join(" -> ")}`,
  `CTA: ${d.cta}`,
  `SUCCESS EVENT: ${d.successEvent}`,
  section("VISUAL SYSTEM", [
    `Palette: ${d.visual.palette.join(", ")}`,
    `Typography: ${d.visual.typography.join(", ")}`,
    `Materials: ${join(d.visual.materials)}`,
    `Motion vocabulary: ${join(d.visual.motion)}`,
    `Sound vocabulary: ${join(d.visual.sound)}`,
  ].join("\n")),
];

if (d.artDirection) {
  const a = d.artDirection;
  lines.push(section("NORTH STAR", a.northStar));
  lines.push(section("GLOBAL ART-DIRECTION RULES", [
    `Hierarchy: ${join(a.hierarchy)}`,
    `Composition: ${join(a.compositionRules)}`,
    `Camera language: ${join(a.cameraLanguage)}`,
    `Lighting language: ${join(a.lightingLanguage)}`,
    `Material language: ${join(a.materialLanguage)}`,
    `Motion language: ${join(a.motionLanguage)}`,
    `Transition language: ${join(a.transitionLanguage)}`,
    `Interaction language: ${join(a.interactionLanguage)}`,
    `Sound language: ${join(a.soundLanguage)}`,
    `Spatial rules: ${join(a.spatialRules)}`,
    `Continuity rules: ${join(a.continuityRules)}`,
    `Realism rules: ${join(a.realismRules)}`,
    `Asset rules: ${join(a.assetRules)}`,
    `Typography rules: ${join(a.typographyRules)}`,
    `Color rules: ${join(a.colorRules)}`,
    `Mobile rules: ${join(a.mobileRules)}`,
    `Performance rules: ${join(a.performanceRules)}`,
    `Accessibility rules: ${join(a.accessibilityRules)}`,
    `Forbidden patterns: ${join(a.forbiddenPatterns)}`,
  ].join("\n")));
}

lines.push(section("HARD CONSTRAINTS", [
  `Approved: ${join(d.constraints.approved)}`,
  `Prohibited: ${join(d.constraints.prohibited)}`,
].join("\n")));

lines.push("\n## SCENE DIRECTIVES");
for (const [i, s] of d.scenes.entries()) {
  lines.push(`\n### ${String(i + 1).padStart(2, "0")} — ${s.id}`);
  lines.push(`Purpose: ${s.purpose}`);
  lines.push(`Hero subject: ${s.subject}`);
  lines.push(`Copy: ${s.copy}`);
  lines.push(`Interaction: ${s.interaction}`);
  lines.push(`Transition in: ${s.transitionIn}`);
  lines.push(`Transition out: ${s.transitionOut}`);

  if (s.direction) {
    const x = s.direction;
    if (x.objective) lines.push(`Shot objective: ${x.objective}`);
    if (x.spatialStory) lines.push(`Spatial story: ${x.spatialStory}`);
    lines.push(`Composition directives: ${join(x.composition)}`);
    if (x.camera) {
      lines.push(`Camera / framing: ${join(x.camera.framing)}`);
      lines.push(`Camera / lens: ${join(x.camera.lens)}`);
      lines.push(`Camera / path: ${join(x.camera.path)}`);
      lines.push(`Camera / speed: ${join(x.camera.speed)}`);
      lines.push(`Camera / focus: ${join(x.camera.focus)}`);
    }
    if (x.lighting) {
      lines.push(`Lighting / time: ${join(x.lighting.timeOfDay)}`);
      lines.push(`Lighting / key: ${join(x.lighting.key)}`);
      lines.push(`Lighting / fill: ${join(x.lighting.fill)}`);
      lines.push(`Lighting / practicals: ${join(x.lighting.practicals)}`);
      lines.push(`Lighting / atmosphere: ${join(x.lighting.atmosphere)}`);
    }
    lines.push(`Material directives: ${join(x.materials)}`);
    if (x.motion) {
      lines.push(`Motion / subject: ${join(x.motion.subject)}`);
      lines.push(`Motion / environment: ${join(x.motion.environment)}`);
      lines.push(`Motion / assembly: ${join(x.motion.assembly)}`);
      lines.push(`Motion / easing: ${join(x.motion.easing)}`);
      lines.push(`Motion / continuity: ${join(x.motion.continuity)}`);
    }
    lines.push(`Sound directives: ${join(x.sound)}`);
    lines.push(`Interaction notes: ${join(x.interactionNotes)}`);
    lines.push(`Transition notes: ${join(x.transitionNotes)}`);
    lines.push(`Asset requirements: ${join(x.assetRequirements)}`);
    lines.push(`Implementation notes: ${join(x.implementationNotes)}`);
    lines.push(`Mobile notes: ${join(x.mobileNotes)}`);
    lines.push(`Negative directives: ${join(x.negativeDirectives)}`);
  }
}

lines.push(section("OUTPUT CONTRACT", [
  "1. Preserve the approved concept and emotional arc exactly; do not dilute it into generic luxury language.",
  "2. Resolve each scene into explicit camera, composition, light, material, motion, transition, interaction, asset and mobile decisions.",
  "3. Every movement must have narrative or spatial purpose. No ornamental motion without a stated reason.",
  "4. Prefer continuous spatial continuity over disconnected hero shots unless the brief explicitly calls for a cut.",
  "5. Keep all directives technically plausible for real-time Three.js/R3F execution; flag anything that should be prebaked rather than simulated live.",
  "6. Protect mobile performance with simplified paths, lower simultaneous motion density and equivalent narrative intent.",
  "7. Describe assembly/reveal timing in ordered phases when construction, product assembly or architectural build-up is present.",
  "8. Separate must-have direction from optional flourish. Never let flourish obscure the hero subject.",
  "9. Do not invent dimensions, materials, model topology or asset availability. Mark missing dependencies explicitly.",
  "10. Return grounded shot lists and implementation-ready direction only.",
].join("\n")));

console.log(lines.join("\n"));
