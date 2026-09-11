import type { MaskPreset, MaskRevealDefinition } from "@/src/types/experience";

export const maskRevealVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const maskRevealPreviewVertexShader = `
attribute vec2 aPosition;
attribute vec2 aUv;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const maskRevealFragmentShader = `
precision highp float;
uniform sampler2D uMap;
uniform float uProgress;
uniform float uPreset;
uniform float uDirection;
uniform vec2 uOrigin;
uniform float uSoftness;
uniform float uScale;
uniform float uRotation;
uniform float uIntensity;
uniform float uSeed;
uniform float uInvert;
uniform vec3 uEdgeColor;
uniform float uEdgeWidth;
uniform vec2 uViewport;
uniform vec2 uTextureSize;
uniform float uPanelOpacity;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345 + uSeed * 0.013);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float layeredNoise(vec2 p) {
  float result = valueNoise(p);
  result += valueNoise(p * 2.03 + 13.7) * 0.5;
  result += valueNoise(p * 4.01 + 29.1) * 0.25;
  return result / 1.75;
}

vec2 coverUv(vec2 uv) {
  float viewportAspect = uViewport.x / max(1.0, uViewport.y);
  float textureAspect = uTextureSize.x / max(1.0, uTextureSize.y);
  vec2 scale = viewportAspect > textureAspect
    ? vec2(1.0, textureAspect / viewportAspect)
    : vec2(viewportAspect / textureAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

vec2 maskUv(vec2 uv) {
  float angle = -uRotation;
  float c = cos(angle);
  float s = sin(angle);
  vec2 p = (uv - uOrigin) / max(0.01, uScale);
  return mat2(c, -s, s, c) * p + 0.5;
}

float maskField(vec2 uv) {
  vec2 p = maskUv(uv);
  float directional = uDirection < 0.5 ? p.x
    : uDirection < 1.5 ? 1.0 - p.x
    : uDirection < 2.5 ? p.y
    : 1.0 - p.y;
  float cells = 8.0 + uIntensity * 10.0;
  float pixel = hash21(floor(uv * cells));
  float organic = layeredNoise(uv * (3.5 + uIntensity * 4.0));
  float radial = length(p - 0.5) * 1.42;
  float field = directional;
  if (uPreset > 0.5 && uPreset < 1.5) field = radial;
  else if (uPreset > 1.5 && uPreset < 2.5) field = (p.x + p.y) * 0.5;
  else if (uPreset > 2.5 && uPreset < 3.5) field = abs(p.x - 0.5) * 2.0;
  else if (uPreset > 3.5 && uPreset < 4.5) field = pixel;
  else if (uPreset > 4.5 && uPreset < 5.5) field = directional * 0.42 + organic * 0.58;
  else if (uPreset > 5.5 && uPreset < 6.5) field = radial * 0.64 + organic * 0.36;
  else if (uPreset > 6.5) field = directional * 0.72 + organic * 0.28;
  field = clamp(field, 0.0, 1.0);
  return uInvert > 0.5 ? 1.0 - field : field;
}

void main() {
  float progress = clamp(uProgress, 0.0, 1.0);
  progress = progress * progress * (3.0 - 2.0 * progress);
  vec2 uv = coverUv(vUv);
  float organic = layeredNoise(vUv * (4.0 + uIntensity * 2.0));
  if (uPreset > 4.5) uv += (organic - 0.5) * 0.018 * uIntensity * sin(progress * 3.14159265);
  vec4 media = texture2D(uMap, uv);
  float field = maskField(vUv);
  float feather = max(0.001, uSoftness * 0.5);
  float alpha = smoothstep(field - feather, field + feather, progress);
  if (uProgress <= 0.0) alpha = 0.0;
  if (uProgress >= 1.0) alpha = 1.0;
  float edgeWidth = uEdgeWidth * 0.5;
  float edge = edgeWidth > 0.0 ? 1.0 - smoothstep(0.0, edgeWidth, abs(progress - field)) : 0.0;
  vec3 color = mix(media.rgb, uEdgeColor, edge * (1.0 - alpha * 0.35));
  gl_FragColor = vec4(color, media.a * max(alpha, edge) * uPanelOpacity);
}
`;

const presetIndices: Record<MaskPreset, number> = {
  "linear-soft": 0,
  "radial-iris": 1,
  "diagonal-cut": 2,
  "split-center": 3,
  "pixel-grid": 4,
  "noise-dissolve": 5,
  "ink-spread": 6,
  "film-burn": 7,
};

const directionIndices: Record<MaskRevealDefinition["direction"], number> = {
  right: 0,
  left: 1,
  down: 2,
  up: 3,
};

export function maskPresetIndex(preset: MaskPreset) {
  return presetIndices[preset];
}

export function maskDirectionIndex(direction: MaskRevealDefinition["direction"]) {
  return directionIndices[direction];
}
