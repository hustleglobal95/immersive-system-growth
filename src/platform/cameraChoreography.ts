import type {
  CameraDefinition,
  ExperienceConfig,
  MotionEasing,
  MotionTrack,
  MotionViewport,
  Vec3,
} from "@/src/types/experience";
import { lerpVec3 } from "@/src/lib/math";

export const cameraChoreographyCatalog = [
  { id: "director-precision-push", label: "Director · Precision push", description: "Measured forward pressure with a subtle lateral reveal and lens compression." },
  { id: "director-pullback-reveal", label: "Director · Pullback reveal", description: "Retreat and rise to expose more of the environment without losing the subject." },
  { id: "director-parallax-truck", label: "Director · Parallax truck", description: "Sideways truck with counter-targeting for premium foreground/background separation." },
  { id: "director-crane-reveal", label: "Director · Crane reveal", description: "Controlled vertical lift with a restrained pullback and reframing beat." },
  { id: "director-hero-orbit", label: "Director · Hero orbit", description: "Subject-centered orbital sweep that preserves authored scene endpoints." },
  { id: "director-s-curve", label: "Director · S-curve", description: "Two-direction lateral choreography for a deliberate floating-camera path." },
  { id: "director-macro-approach", label: "Director · Macro approach", description: "Close detail approach with target settling and a longer-lens finish." },
  { id: "director-dolly-zoom", label: "Director · Dolly zoom", description: "A restrained vertigo move that counteracts camera distance with field of view." },
] as const;

export type CameraChoreographyName = (typeof cameraChoreographyCatalog)[number]["id"];

const choreographyNames = new Set<string>(cameraChoreographyCatalog.map((item) => item.id));

export function isCameraChoreographyName(value: string): value is CameraChoreographyName {
  return choreographyNames.has(value);
}

export function createCameraChoreography(
  name: CameraChoreographyName,
  config: ExperienceConfig,
  sceneIndex: number,
): MotionTrack[] {
  const scene = config.scenes[sceneIndex];
  const cameras: Array<{ camera: CameraDefinition; viewport: MotionViewport }> = scene.mobileCamera
    ? [
        { camera: scene.camera, viewport: "desktop" },
        { camera: scene.mobileCamera, viewport: "mobile" },
      ]
    : [{ camera: scene.camera, viewport: "all" }];

  return cameras.flatMap(({ camera, viewport }) => buildChoreography(name, camera, viewport));
}

function buildChoreography(
  name: CameraChoreographyName,
  camera: CameraDefinition,
  viewport: MotionViewport,
): MotionTrack[] {
  const basis = cameraBasis(camera.from.position, camera.from.target);
  const travel = distance(camera.from.position, camera.to.position);
  const focusDistance = Math.max(0.75, distance(camera.from.position, camera.from.target));
  const scale = Math.max(0.22, Math.min(2.4, focusDistance * 0.18 + travel * 0.16));
  const base = (t: number) => lerpVec3(camera.from.position, camera.to.position, t);
  const targetBase = (t: number) => lerpVec3(camera.from.target, camera.to.target, t);
  const prefix = `${name}-${viewport}`;
  let positions: CameraVectorKey[];
  let targets: CameraVectorKey[];
  let fovs: CameraNumberKey[];

  if (name === "director-precision-push") {
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.34, add(add(base(0.34), mul(basis.forward, scale * 0.45)), mul(basis.right, scale * 0.12)), "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 0.72, add(base(0.72), mul(basis.forward, scale * 0.2)), "smooth"),
      vectorKey(`${prefix}-position-d`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.52, add(targetBase(0.52), mul(basis.up, scale * 0.08)), "cubic", [0.2, 0.8, 0.2, 1]),
      vectorKey(`${prefix}-target-c`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.5, clampFov(camera.from.fov - 4), "cubic", [0.16, 1, 0.3, 1]]]);
  } else if (name === "director-pullback-reveal") {
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.4, add(add(base(0.4), mul(basis.forward, -scale * 0.75)), mul(basis.up, scale * 0.35)), "cubic", [0.2, 0, 0.2, 1]),
      vectorKey(`${prefix}-position-c`, 0.76, add(base(0.76), mul(basis.up, scale * 0.14)), "smooth"),
      vectorKey(`${prefix}-position-d`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.48, add(targetBase(0.48), mul(basis.up, scale * 0.14)), "smooth"),
      vectorKey(`${prefix}-target-c`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.44, clampFov(camera.from.fov + 5), "smooth"]]);
  } else if (name === "director-parallax-truck") {
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.28, add(base(0.28), mul(basis.right, scale * 0.72)), "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 0.68, add(base(0.68), mul(basis.right, -scale * 0.38)), "cubic", [0.3, 0, 0.2, 1]),
      vectorKey(`${prefix}-position-d`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.3, add(targetBase(0.3), mul(basis.right, -scale * 0.14)), "smooth"),
      vectorKey(`${prefix}-target-c`, 0.68, add(targetBase(0.68), mul(basis.right, scale * 0.08)), "smooth"),
      vectorKey(`${prefix}-target-d`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.5, clampFov(camera.from.fov - 1.5), "smooth"]]);
  } else if (name === "director-crane-reveal") {
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.46, add(add(base(0.46), mul(basis.up, scale * 0.95)), mul(basis.forward, -scale * 0.26)), "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 0.78, add(base(0.78), mul(basis.up, scale * 0.24)), "smooth"),
      vectorKey(`${prefix}-position-d`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.48, add(targetBase(0.48), mul(basis.up, scale * 0.3)), "cubic", [0.2, 0.8, 0.2, 1]),
      vectorKey(`${prefix}-target-c`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.55, clampFov(camera.from.fov - 3), "smooth"]]);
  } else if (name === "director-hero-orbit") {
    const midTarget = targetBase(0.5);
    const threeQuarterTarget = targetBase(0.76);
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.42, orbitAroundY(base(0.42), midTarget, 26), "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 0.76, orbitAroundY(base(0.76), threeQuarterTarget, -10), "cubic", [0.3, 0, 0.2, 1]),
      vectorKey(`${prefix}-position-d`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.5, midTarget, "smooth"),
      vectorKey(`${prefix}-target-c`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.5, clampFov(camera.from.fov - 2), "smooth"]]);
  } else if (name === "director-s-curve") {
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.25, add(base(0.25), mul(basis.right, scale * 0.62)), "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 0.62, add(base(0.62), mul(basis.right, -scale * 0.56)), "cubic", [0.3, 0, 0.2, 1]),
      vectorKey(`${prefix}-position-d`, 0.84, add(base(0.84), mul(basis.right, scale * 0.16)), "smooth"),
      vectorKey(`${prefix}-position-e`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.38, add(targetBase(0.38), mul(basis.right, -scale * 0.12)), "smooth"),
      vectorKey(`${prefix}-target-c`, 0.7, add(targetBase(0.7), mul(basis.right, scale * 0.1)), "smooth"),
      vectorKey(`${prefix}-target-d`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.34, clampFov(camera.from.fov - 1.5), "smooth"], [0.7, clampFov(camera.to.fov + 1), "smooth"]]);
  } else if (name === "director-macro-approach") {
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.52, add(add(base(0.52), mul(basis.forward, scale * 0.92)), mul(basis.up, -scale * 0.08)), "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 0.8, add(base(0.8), mul(basis.forward, scale * 0.3)), "smooth"),
      vectorKey(`${prefix}-position-d`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.58, add(targetBase(0.58), mul(basis.up, -scale * 0.06)), "cubic", [0.2, 0.8, 0.2, 1]),
      vectorKey(`${prefix}-target-c`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.56, clampFov(camera.from.fov - 9), "cubic", [0.16, 1, 0.3, 1]], [0.82, clampFov(camera.to.fov - 4), "smooth"]]);
  } else {
    const pushed = add(base(0.5), mul(basis.forward, scale * 0.9));
    const startDistance = Math.max(0.05, distance(camera.from.position, camera.from.target));
    const pushedTarget = targetBase(0.5);
    const pushedDistance = Math.max(0.05, distance(pushed, pushedTarget));
    const compensated = dollyZoomFov(camera.from.fov, startDistance, pushedDistance);
    positions = [
      vectorKey(`${prefix}-position-a`, 0, camera.from.position, "ease-out"),
      vectorKey(`${prefix}-position-b`, 0.5, pushed, "cubic", [0.16, 1, 0.3, 1]),
      vectorKey(`${prefix}-position-c`, 1, camera.to.position, "ease-in-out"),
    ];
    targets = [
      vectorKey(`${prefix}-target-a`, 0, camera.from.target, "smooth"),
      vectorKey(`${prefix}-target-b`, 0.5, pushedTarget, "smooth"),
      vectorKey(`${prefix}-target-c`, 1, camera.to.target, "ease-in-out"),
    ];
    fovs = lensKeys(prefix, camera, [[0.5, compensated, "cubic", [0.16, 1, 0.3, 1]]]);
  }

  return [
    vectorTrack(`${prefix}-position`, `${labelFor(name)} position`, "camera.position", positions, viewport),
    vectorTrack(`${prefix}-target`, `${labelFor(name)} target`, "camera.target", targets, viewport),
    numberTrack(`${prefix}-fov`, `${labelFor(name)} lens`, "camera.fov", fovs, viewport),
  ];
}

type CameraVectorKey = {
  id: string;
  at: number;
  value: Vec3;
  easing: MotionEasing;
  curve?: [number, number, number, number];
};
type CameraNumberKey = {
  id: string;
  at: number;
  value: number;
  easing: MotionEasing;
  curve?: [number, number, number, number];
};

function vectorTrack(
  id: string,
  label: string,
  target: Extract<MotionTrack, { type: "vector" }>["target"],
  keyframes: CameraVectorKey[],
  viewport: MotionViewport,
): MotionTrack {
  return { id, label, type: "vector", target, blend: "absolute", viewport, muted: false, locked: false, keyframes } as MotionTrack;
}

function numberTrack(
  id: string,
  label: string,
  target: Extract<MotionTrack, { type: "number" }>["target"],
  keyframes: CameraNumberKey[],
  viewport: MotionViewport,
): MotionTrack {
  return { id, label, type: "number", target, blend: "absolute", viewport, muted: false, locked: false, keyframes } as MotionTrack;
}

function vectorKey(id: string, at: number, value: Vec3, easing: MotionEasing, curve?: [number, number, number, number]): CameraVectorKey {
  return { id, at, value: [...value], easing, ...(curve ? { curve } : {}) };
}

function lensKeys(
  prefix: string,
  camera: CameraDefinition,
  middle: Array<[number, number, MotionEasing, [number, number, number, number]?]>,
): CameraNumberKey[] {
  return [
    { id: `${prefix}-fov-a`, at: 0, value: camera.from.fov, easing: "ease-out" },
    ...middle.map(([at, value, easing, curve], index) => ({ id: `${prefix}-fov-${index + 2}`, at, value: clampFov(value), easing, ...(curve ? { curve } : {}) })),
    { id: `${prefix}-fov-z`, at: 1, value: camera.to.fov, easing: "ease-in-out" },
  ];
}

function labelFor(name: CameraChoreographyName) {
  return cameraChoreographyCatalog.find((item) => item.id === name)?.label.replace("Director · ", "") ?? name;
}

function cameraBasis(position: Vec3, target: Vec3) {
  const forward = normalize(sub(target, position), [0, 0, -1]);
  const right = normalize(cross(forward, [0, 1, 0]), [1, 0, 0]);
  const up = normalize(cross(right, forward), [0, 1, 0]);
  return { forward, right, up };
}

function orbitAroundY(position: Vec3, target: Vec3, degrees: number): Vec3 {
  const offset = sub(position, target);
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    target[0] + offset[0] * cosine + offset[2] * sine,
    position[1],
    target[2] - offset[0] * sine + offset[2] * cosine,
  ];
}

function dollyZoomFov(fov: number, fromDistance: number, toDistance: number) {
  const radians = fov * Math.PI / 180;
  const tangent = Math.tan(radians * 0.5) * (fromDistance / Math.max(0.05, toDistance));
  return clampFov(2 * Math.atan(tangent) * 180 / Math.PI);
}

function add(a: Vec3, b: Vec3): Vec3 { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a: Vec3, b: Vec3): Vec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul(a: Vec3, scalar: number): Vec3 { return [a[0] * scalar, a[1] * scalar, a[2] * scalar]; }
function cross(a: Vec3, b: Vec3): Vec3 { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function distance(a: Vec3, b: Vec3) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function normalize(value: Vec3, fallback: Vec3): Vec3 {
  const length = Math.hypot(...value);
  return length > 0.00001 ? [value[0] / length, value[1] / length, value[2] / length] : [...fallback];
}
function clampFov(value: number) { return Math.max(15, Math.min(90, value)); }
