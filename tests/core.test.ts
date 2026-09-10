import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import raw from "../config/experience.json";
import { parseExperience } from "../src/lib/configSchema";
import { sampleCameraPath } from "../src/lib/cameraPaths";
import { sampleObjectMotion } from "../src/lib/objectMotion";
import { sampleExperience } from "../src/lib/sampleExperience";
import { sampleSpline } from "../src/lib/spline";
import { auditContinuity } from "../src/lib/continuity";
import { constrainQuality, nextQuality, qualityDpr } from "../src/lib/quality";
import { seekTarget, shouldSeek } from "../src/lib/media";
import type {
  CameraPathPreset,
  ObjectMotionPreset,
} from "../src/types/experience";
const config = parseExperience(raw),
  close = (a: number[], b: number[]) =>
    assert.ok(Math.hypot(...a.map((x, i) => x - b[i])) < 1e-6);
test("all camera presets preserve endpoints; dolly is a documented linear alias", () => {
  for (const preset of [
    "linear",
    "dolly",
    "arc",
    "orbit",
    "crane",
    "threshold",
    "flyby",
    "swoop",
    "macro",
    "pullback",
  ] as CameraPathPreset[]) {
    close(sampleCameraPath([1, 2, 3], [4, 5, 6], 0, preset), [1, 2, 3]);
    close(sampleCameraPath([1, 2, 3], [4, 5, 6], 1, preset), [4, 5, 6]);
  }
  assert.deepEqual(
    sampleCameraPath([0, 0, 0], [1, 2, 3], 0.3, "dolly"),
    sampleCameraPath([0, 0, 0], [1, 2, 3], 0.3, "linear"),
  );
});
test("all object presets preserve endpoints", () => {
  const { from, to } = config.scenes[0].hero;
  for (const preset of [
    "linear",
    "handoff",
    "rise",
    "drop",
    "spiral",
    "scale-through",
  ] as ObjectMotionPreset[]) {
    for (const t of [0, 1]) {
      const s = sampleObjectMotion(from, to, t, preset),
        want = t ? to : from;
      close(s.position, want.position);
      close(s.rotation, want.rotation);
      close([s.scale], [want.scale]);
    }
  }
});
test("sampler is finite, reverse/seek independent and reduced-motion camera stays fixed", () => {
  const results = Array.from({ length: 501 }, (_, i) =>
    sampleExperience(i / 500, false, config),
  );
  for (let i = 500; i >= 0; i--) {
    assert.deepEqual(sampleExperience(i / 500, false, config), results[i]);
    assert.ok(results[i].camera.position.every(Number.isFinite));
    assert.deepEqual(
      sampleExperience(i / 500, true, config).camera,
      sampleExperience(0, true, config).camera,
    );
  }
  assert.ok(
    sampleExperience(NaN, false, config).camera.position.every(Number.isFinite),
  );
});
test("spline endpoints and repeated points remain finite", () => {
  close(
    sampleSpline(
      [
        [0, 0, 0],
        [0, 0, 0],
        [2, 1, 0],
      ],
      0,
    ),
    [0, 0, 0],
  );
  close(
    sampleSpline(
      [
        [0, 0, 0],
        [0, 0, 0],
        [2, 1, 0],
      ],
      1,
    ),
    [2, 1, 0],
  );
});
test("all five recipes have valid actual desktop/mobile continuity and different choreography", () => {
  const signatures = new Set<string>();
  for (const name of [
    "real-estate",
    "restaurant",
    "automotive",
    "product",
    "saas",
  ]) {
    const c = parseExperience(
      JSON.parse(fs.readFileSync(`recipes/${name}.json`, "utf8")),
    );
    assert.deepEqual(auditContinuity(c), []);
    signatures.add(
      JSON.stringify(c.scenes.map((s) => [s.range, s.camera, s.hero, s.world])),
    );
  }
  assert.equal(signatures.size, 5);
  assert.deepEqual(auditContinuity(config), []);
});
test("cinematic audit rejects a discontinuity", () => {
  const c = structuredClone(config);
  c.scenes[1].camera.from.position[0] += 1;
  assert.ok(auditContinuity(c).length);
});
test("schema rejects the audit negative corpus", () => {
  const mutations = [
    (c: typeof config) => {
      c.scenes[1].id = c.scenes[0].id;
    },
    (c: typeof config) => {
      Reflect.deleteProperty(c.scenes[0].camera.from, "fov");
    },
    (c: typeof config) => {
      c.runtime.minDpr = -1;
    },
    (c: typeof config) => {
      Reflect.deleteProperty(c.scenes[0], "world");
    },
    (c: typeof config) => {
      c.scenes[0].camera.waypoints = [[NaN, 0, 0]];
    },
    (c: typeof config) => {
      c.scenes[0].camera.from.target = [...c.scenes[0].camera.from.position];
    },
    (c: typeof config) => {
      c.runtime.maxDpr = 0.5;
      c.runtime.minDpr = 1;
    },
    (c: typeof config) => {
      c.scenes[0].copy.cta = { label: "Unsafe", href: "javascript:alert(1)" };
    },
  ];
  for (const mutate of mutations) {
    const c = structuredClone(config);
    mutate(c);
    assert.throws(() => parseExperience(c));
  }
});
test("manual quality survives adaptive selection and respects device limits", () => {
  assert.equal(constrainQuality("low", "high", "high"), "low");
  assert.equal(constrainQuality("high", "low", "medium"), "medium");
  assert.equal(nextQuality("high", 1), "high");
  assert.equal(nextQuality("medium", -1), "low");
  const dpr = qualityDpr("high", 2, 3840, 2160, 1, 2, 4000000);
  assert.ok(3840 * 2160 * dpr * dpr <= 4000001);
});
test("video seeking coalesces while decoder busy and clamps endpoints", () => {
  assert.equal(shouldSeek(0, 1, true), false);
  assert.equal(shouldSeek(0, 0.02, false), false);
  assert.equal(shouldSeek(0, 1, false), true);
  assert.equal(seekTarget(2, 10), 9.98);
  assert.equal(seekTarget(-1, 10), 0);
});
