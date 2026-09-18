import test from "node:test";
import assert from "node:assert/strict";
import { easeSmoother, easeSmooth } from "../src/lib/easing";
import { maskRevealFragmentShader } from "../src/lib/maskShader";
import { createCssMaskStyle, createMaskReveal, sampleMaskAlpha } from "../src/lib/maskReveal";
import { getMediaPanelWindow, sampleMediaPanel } from "../src/lib/mediaPanels";
import experience from "../config/experience.json" with { type: "json" };
import { parseExperience } from "../src/lib/configSchema";

const h = 1e-4;
const d1 = (f: (t: number) => number, t: number) => (f(t + h) - f(t - h)) / (2 * h);
const d2 = (f: (t: number) => number, t: number) => (f(t + h) - 2 * f(t) + f(t - h)) / (h * h);

test("the scroll timing curve comes to rest at both ends", () => {
  assert.equal(easeSmoother(0), 0);
  assert.equal(easeSmoother(1), 1);
  // Velocity and acceleration both vanish at the ends, which is what stops a scrubbed handover
  // catching as it starts and settles. The cubic it replaced accelerates at plus/minus six.
  for (const t of [2 * h, 1 - 2 * h]) {
    assert.ok(Math.abs(d1(easeSmoother, t)) < 0.01, `velocity at ${t}`);
    assert.ok(Math.abs(d2(easeSmoother, t)) < 0.5, `acceleration at ${t}`);
  }
  assert.ok(Math.abs(d2(easeSmooth, 2 * h)) > 5, "the cubic still accelerates at its start");
  // Monotonic, so a reveal never backs up mid-handover.
  let previous = -1;
  for (let i = 0; i <= 1000; i++) {
    const value = easeSmoother(i / 1000);
    assert.ok(value >= previous, "monotonic");
    previous = value;
  }
});

test("the WebGL and CSS mask backends reveal on the same curve", () => {
  // The shader carries its own copy of the timing curve. If one path is changed without the
  // other, the three shader-preset chapters drift out of step with every other handover.
  assert.match(
    maskRevealFragmentShader,
    /progress \* progress \* progress \* \(progress \* \(progress \* 6\.0 - 15\.0\) \+ 10\.0\)/,
  );
  // The feather stays on GLSL's own smoothstep, so edge shape is unchanged.
  assert.match(maskRevealFragmentShader, /smoothstep\(field - feather, field \+ feather, swept\)/);
  // And the CSS side is driven by the same shape: fully masked at 0, fully open at 1.
  const mask = createMaskReveal("linear-soft", { softness: 30 });
  assert.equal(String(createCssMaskStyle(0, mask).maskImage), "linear-gradient(transparent, transparent)");
  assert.equal(String(createCssMaskStyle(1, mask).maskImage), "linear-gradient(black, black)");
});

test("a reveal is closed at the start and open at the end, feather included", () => {
  // The sweep has to carry its own softness band. Without it, a mask authored with 36% softness
  // showed an 18% band the instant its panel appeared and was still 18% short of the far edge
  // at 0.99, snapping shut only at exactly 1 -- a pop in and a snap out on every masked
  // handover. Asserted on sampled alpha rather than on gradient stops, because each preset
  // builds a different gradient shape and only the sampled field is comparable across them.
  const PRESETS = ["linear-soft", "diagonal-cut", "split-center", "radial-iris", "pixel-grid",
    "noise-dissolve", "ink-spread", "film-burn"] as const;
  for (const preset of PRESETS) {
    const mask = createMaskReveal(preset, { softness: 36, direction: "down" });
    let openEarly = 0, closedLate = 1;
    for (let u = 0; u <= 1.0001; u += 0.1)
      for (let v = 0; v <= 1.0001; v += 0.1) {
        openEarly = Math.max(openEarly, sampleMaskAlpha(0.01, u, v, mask));
        closedLate = Math.min(closedLate, sampleMaskAlpha(0.99, u, v, mask));
      }
    assert.ok(openEarly < 0.1, `${preset} is already ${(openEarly * 100).toFixed(0)}% open at the start`);
    assert.ok(closedLate > 0.9, `${preset} is still ${((1 - closedLate) * 100).toFixed(0)}% closed at the end`);
  }
  // Both ends are exact, and the two-stop presets show it in the gradient itself.
  const linear = createMaskReveal("linear-soft", { softness: 36, direction: "down" });
  const stop = (image: string) => Number(/transparent ([\d.]+)%/.exec(image)?.[1] ?? NaN);
  assert.ok(stop(String(createCssMaskStyle(0.01, linear).maskImage)) < 2);
  assert.ok(stop(String(createCssMaskStyle(0.99, linear).maskImage)) > 98);
  // And the shader sweeps the same range, so the two backends agree at both ends.
  assert.match(maskRevealFragmentShader, /float swept = -feather \+ progress \* \(1\.0 \+ feather \* 2\.0\);/);
});

test("every authored handover arrives at rest", () => {
  const config = parseExperience(experience);
  config.scenes.forEach((scene, index) => {
    const w = getMediaPanelWindow(config.scenes, index);
    if (w.first) return;
    const span = w.start - w.enterStart;
    const move = (p: number) => {
      const s = sampleMediaPanel(p, w);
      // Whichever property this chapter's transition actually drives.
      return s.transition === "wipe" || s.transition === "curtain" ? s.clip / 100
        : s.transition === "slide" ? Math.abs(s.panelX + s.panelY) / 100
        : easeSmoother(s.reveal);
    };
    // Sampled just inside each end of the handover, the move is already almost stopped.
    for (const edge of [w.enterStart + span * 0.02, w.start - span * 0.02]) {
      const velocity = Math.abs(d1(move, edge)) * span;
      assert.ok(velocity < 0.35, `${scene.id} still moving at ${velocity.toFixed(3)} near a handover edge`);
    }
  });
});
