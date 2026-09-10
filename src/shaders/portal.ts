export const portalVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const portalFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p);
  float ring = sin(r * 42.0 - uTime * 2.0) * 0.5 + 0.5;
  float mask = smoothstep(0.55, 0.05, r);
  vec3 color = mix(uA, uB, ring);
  gl_FragColor = vec4(color, mask);
}`;
