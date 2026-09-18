"use client";

import { useEffect, useRef } from "react";
import { cinematicProgress } from "@/src/lib/cinematicProgress";
import { useExperienceStore } from "@/src/store/experienceStore";

/**
 * A live field standing in for a flat colour plate.
 *
 * It occupies a surface the chapter already had, so it adds no scroll, no layout and no new
 * stacking context, and it sits inside `.media-panel__inner` like any other plate -- every
 * transition, mask and overlap rule applies to it unchanged.
 *
 * Cost is deliberately bounded: one full-screen triangle, a dependency-free fragment shader,
 * a 0.7 resolution scale on a soft field nobody can measure, and a loop that only runs while
 * the plate is on screen and the tab is visible. If WebGL is unavailable the element simply
 * never paints and the panel's flat fill shows through, which is why the schema requires one.
 */

const VERTEX = `#version 300 es
precision mediump float;
void main(){
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const TIDE = `#version 300 es
precision mediump float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform vec3 uDeep;
uniform vec3 uLight;

float grain(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0);

  // Three slow bands at different rates, so the field never repeats on a readable cycle.
  float a = sin(p.x * 1.7 - uTime * 0.06 + uProgress * 1.4) * 0.5 + 0.5;
  float b = sin(p.y * 2.3 + uTime * 0.041 - uProgress * 0.9) * 0.5 + 0.5;
  float c = sin((p.x + p.y) * 1.15 + uTime * 0.027) * 0.5 + 0.5;
  float field = (a * 0.42 + b * 0.33 + c * 0.25);

  // A single soft light that drifts with the chapter rather than with the pointer.
  vec2 centre = vec2(0.34 + uProgress * 0.30, 0.44 - uProgress * 0.12);
  float glow = 1.0 - smoothstep(0.0, 0.92, distance(uv, centre));
  glow = pow(glow, 2.4);

  vec3 colour = mix(uDeep, uLight, field * 0.30 + glow * 0.42);

  // Fine grain, so the gradient never bands on a wide screen.
  colour += (grain(gl_FragCoord.xy + uTime) - 0.5) * 0.016;

  // Hold the corners down so copy keeps its ground.
  float vignette = 1.0 - smoothstep(0.55, 1.35, distance(uv, vec2(0.5)));
  colour *= mix(0.82, 1.0, vignette);

  outColor = vec4(colour, 1.0);
}`;

const SHADERS: Record<string, string> = { tide: TIDE };

function hex(value: string): [number, number, number] {
  const v = value.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function MediaShader({ shader, deep, light }: { shader: string; deep: string; light: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useExperienceStore((state) => state.reducedMotion);

  useEffect(() => {
    const element = canvas.current;
    const source = SHADERS[shader];
    if (!element || !source) return;
    const gl = element.getContext("webgl2", { alpha: false, antialias: false, depth: false });
    if (!gl) return;

    const compile = (type: number, code: string) => {
      const part = gl.createShader(type);
      if (!part) return null;
      gl.shaderSource(part, code);
      gl.compileShader(part);
      if (!gl.getShaderParameter(part, gl.COMPILE_STATUS)) { gl.deleteShader(part); return null; }
      return part;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, source);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return; }
    gl.useProgram(program);

    const u = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
      progress: gl.getUniformLocation(program, "uProgress"),
      deep: gl.getUniformLocation(program, "uDeep"),
      light: gl.getUniformLocation(program, "uLight"),
    };
    gl.uniform3fv(u.deep, hex(deep));
    gl.uniform3fv(u.light, hex(light));

    let progress = useExperienceStore.getState().progress;
    let raf = 0;
    let visible = false;
    let start = 0;

    // A media panel mounts one chapter ahead of itself, so being on screen is not the same as
    // being seen: at the top of the page this plate sits behind chapter 01's photograph at zero
    // opacity. CinematicMedia writes the panel's visibility and opacity inline, so both can be
    // read back off the style object without touching layout or computed style.
    const panel = element.closest<HTMLElement>("[data-media-panel]");
    const shown = () => {
      if (!panel) return true;
      if (panel.style.visibility === "hidden") return false;
      const opacity = panel.style.opacity;
      return opacity === "" || Number(opacity) > 0.01;
    };

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.7;
      const w = Math.max(1, Math.round(element.clientWidth * scale));
      const h = Math.max(1, Math.round(element.clientHeight * scale));
      if (element.width !== w || element.height !== h) {
        element.width = w; element.height = h;
      }
      gl.viewport(0, 0, element.width, element.height);
      gl.uniform2f(u.resolution, element.width, element.height);
    };

    const draw = (time: number) => {
      raf = 0;
      if (gl.isContextLost()) return;
      if (!start) start = time;
      resize();
      gl.uniform1f(u.time, reduced ? 0 : (time - start) / 1000);
      gl.uniform1f(u.progress, progress);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // Reduced motion renders one frame and stops; the field is still, not absent. A plate that
      // has gone transparent stops too, and scrolling back to it pumps the loop again.
      if (visible && shown() && !reduced && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const pump = () => { if (!raf && shown()) raf = requestAnimationFrame(draw); };

    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) pump();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { rootMargin: "10% 0px" });
    watcher.observe(element);

    const onProgress = (value: number) => { progress = value; if (visible) pump(); };
    const frame = cinematicProgress.subscribe(onProgress);
    const onVisibility = () => { if (visible && !document.hidden) pump(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", pump);
    pump();

    return () => {
      frame();
      watcher.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", pump);
      if (raf) cancelAnimationFrame(raf);
      gl.deleteProgram(program);
      // Drop the context only on a real unmount. React invokes this effect twice in development
      // and the second run is handed the same canvas, so losing the context here unconditionally
      // left it dead: the element kept its 300x150 default and never painted a frame. By the time
      // a microtask runs after the commit, a genuinely unmounted canvas is detached.
      queueMicrotask(() => {
        if (!element.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
      });
    };
  }, [deep, light, reduced, shader]);

  return <canvas className="media-panel__shader" ref={canvas} aria-hidden="true" />;
}
