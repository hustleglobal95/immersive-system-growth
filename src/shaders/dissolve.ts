export const dissolveVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const dissolveFragment = /* glsl */ `
uniform float uProgress;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vPosition;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + .1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  float noise = hash(floor(vPosition * 10.0));
  float edge = smoothstep(uProgress - 0.08, uProgress + 0.08, noise);
  if (edge < 0.08) discard;
  float glow = 1.0 - smoothstep(0.08, 0.2, abs(noise - uProgress));
  gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.35, 0.02), glow * 0.8), 1.0);
}`;
