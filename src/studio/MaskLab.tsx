"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ExperienceConfig, MaskRevealDefinition } from "@/src/types/experience";
import { createCssMaskStyle, createMaskReveal, maskPresetNames } from "@/src/lib/maskReveal";
import {
  maskDirectionIndex,
  maskPresetIndex,
  maskRevealFragmentShader,
  maskRevealPreviewVertexShader,
} from "@/src/lib/maskShader";
import { applyMaskPreset, replaceScene } from "@/src/platform/studioPresets";

const referenceMedia = "/textures/reference/reveal-field.svg";

export function MaskLab({
  experience,
  setExperience,
  active,
  setActive,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  setActive: (index: number) => void;
}) {
  const scene = experience.scenes[active];
  const [progress, setProgress] = useState(0.52);
  const [playing, setPlaying] = useState(false);
  const transportProgress = useRef(progress);
  const mask = useMemo(
    () => createMaskReveal(scene.media?.mask?.preset ?? "linear-soft", scene.media?.mask),
    [scene.media?.mask],
  );
  const cssMask = useMemo(() => createCssMaskStyle(progress, mask), [mask, progress]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const started = performance.now() - transportProgress.current * 2400;
    const tick = (now: number) => {
      const next = ((now - started) % 2400) / 2400;
      transportProgress.current = next;
      setProgress(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const addReferenceMedia = () => {
    const nextMask = createMaskReveal("linear-soft");
    setExperience((current) =>
      replaceScene(current, active, {
        ...current.scenes[active],
        media: {
          kind: "image",
          src: referenceMedia,
          alt: "Abstract orange Forge reveal field",
          transition: "mask",
          blendColor: "#120805",
          maskSoftness: nextMask.softness,
          mask: nextMask,
          position: [50, 50],
          mobilePosition: [50, 50],
          overlap: 0.25,
          direction: "up",
          zoom: 1.04,
          textEnd: 0.28,
        },
      }),
    );
  };

  const updateMask = (changes: Partial<MaskRevealDefinition>, preset = mask.preset) => {
    setExperience((current) => {
      const currentScene = current.scenes[active];
      return replaceScene(current, active, applyMaskPreset(currentScene, preset, changes));
    });
  };

  return (
    <div className="mask-lab">
      <section className="studio-card mask-lab__stage" aria-labelledby="mask-lab-title">
        <div className="studio-card__head">
          <div>
            <span>LIVE COMPARISON</span>
            <h2 id="mask-lab-title">DOM and WebGL output</h2>
          </div>
          <output>{Math.round(progress * 100)}%</output>
        </div>

        <div className="mask-lab__scene-row">
          <label>
            Scene
            <select value={active} onChange={(event) => setActive(Number(event.target.value))}>
              {experience.scenes.map((item, index) => (
                <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} / {item.label}</option>
              ))}
            </select>
          </label>
          {!scene.media && <button type="button" className="studio-primary" onClick={addReferenceMedia}>Add reference image</button>}
        </div>

        {scene.media ? (
          <>
            <div className="mask-lab__previews">
              <figure>
                <div className="mask-preview mask-preview--dom">
                  {/* Studio must preview root-relative and allowlisted remote author assets without transformation. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={scene.media.kind === "image" ? scene.media.src : scene.media.poster} alt="" style={cssMask} />
                  <span>CSS MASK</span>
                </div>
                <figcaption>Fast fallback for every device tier</figcaption>
              </figure>
              <figure>
                <MaskWebGLPreview mask={mask} progress={progress} />
                <figcaption>Shader path for high-quality devices</figcaption>
              </figure>
            </div>
            <div className="mask-lab__transport">
              <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button>
              <button type="button" onClick={() => { setPlaying(false); transportProgress.current = 0; setProgress(0); }}>Start</button>
              <input aria-label="Reveal progress" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => { const value = Number(event.target.value); setPlaying(false); transportProgress.current = value; setProgress(value); }} />
              <button type="button" onClick={() => { setPlaying(false); transportProgress.current = 1; setProgress(1); }}>End</button>
            </div>
          </>
        ) : (
          <div className="mask-lab__empty">
            <strong>This scene has no media layer.</strong>
            <p>Add the bundled reference image, then tune and export a production-ready mask recipe.</p>
          </div>
        )}
      </section>

      <section className="studio-card mask-lab__controls" aria-label="Mask controls">
        <div className="studio-card__head">
          <div><span>EIGHT ORIGINAL PRESETS</span><h2>Reveal controls</h2></div>
          <code>{mask.preset}</code>
        </div>
        <div className="mask-preset-grid">
          {maskPresetNames.map((preset) => (
            <button
              key={preset}
              type="button"
              className={mask.preset === preset ? "is-active" : ""}
              disabled={!scene.media}
              onClick={() => updateMask({}, preset)}
            >
              <i aria-hidden="true" />
              {preset.replace("-", " ")}
            </button>
          ))}
        </div>
        <div className="mask-control-grid">
          <SelectControl label="Renderer" value={mask.renderer} options={["auto", "dom", "webgl"]} disabled={!scene.media} onChange={(value) => updateMask({ renderer: value as MaskRevealDefinition["renderer"] })} />
          <SelectControl label="Direction" value={mask.direction} options={["right", "left", "down", "up"]} disabled={!scene.media} onChange={(value) => updateMask({ direction: value as MaskRevealDefinition["direction"] })} />
          <RangeControl label="Origin X" value={mask.origin[0]} min={0} max={100} disabled={!scene.media} onChange={(value) => updateMask({ origin: [value, mask.origin[1]] })} />
          <RangeControl label="Origin Y" value={mask.origin[1]} min={0} max={100} disabled={!scene.media} onChange={(value) => updateMask({ origin: [mask.origin[0], value] })} />
          <RangeControl label="Softness" value={mask.softness} min={0} max={40} disabled={!scene.media} onChange={(value) => updateMask({ softness: value })} />
          <RangeControl label="Scale" value={mask.scale} min={0.5} max={2} step={0.01} disabled={!scene.media} onChange={(value) => updateMask({ scale: value })} />
          <RangeControl label="Rotation" value={mask.rotation} min={-180} max={180} disabled={!scene.media} onChange={(value) => updateMask({ rotation: value })} />
          <RangeControl label="Intensity" value={mask.intensity} min={0} max={2} step={0.01} disabled={!scene.media} onChange={(value) => updateMask({ intensity: value })} />
          <RangeControl label="Seed" value={mask.seed} min={0} max={9999} disabled={!scene.media} onChange={(value) => updateMask({ seed: Math.round(value) })} />
          <RangeControl label="Edge width" value={mask.edgeWidth} min={0} max={20} step={0.1} disabled={!scene.media} onChange={(value) => updateMask({ edgeWidth: value })} />
          <label className="mask-color-control">Edge color<input type="color" value={mask.edgeColor} disabled={!scene.media} onChange={(event) => updateMask({ edgeColor: event.target.value })} /></label>
          <label className="studio-check mask-invert-control"><input type="checkbox" checked={mask.invert} disabled={!scene.media} onChange={(event) => updateMask({ invert: event.target.checked })} />Invert field</label>
        </div>
        <p className="studio-muted">Auto selects WebGL for organic presets on high-quality devices. It uses CSS masks elsewhere and resolves reduced motion to a static semantic frame.</p>
      </section>
    </div>
  );
}

function SelectControl({ label, value, options, disabled, onChange }: { label: string; value: string; options: string[]; disabled: boolean; onChange: (value: string) => void }) {
  return <label>{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function RangeControl({ label, value, min, max, step = 1, disabled, onChange }: { label: string; value: number; min: number; max: number; step?: number; disabled: boolean; onChange: (value: number) => void }) {
  return <label><span>{label}<output>{Number.isInteger(step) ? value : value.toFixed(2)}</output></span><input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

type PreviewResources = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
};

function MaskWebGLPreview({ mask, progress }: { mask: MaskRevealDefinition; progress: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const status = useRef<HTMLSpanElement>(null);
  const resources = useRef<PreviewResources | null>(null);

  useEffect(() => {
    const target = canvas.current;
    const gl = target?.getContext("webgl", { alpha: true, preserveDrawingBuffer: true });
    if (!target || !gl) { if (status.current) status.current.textContent = "CSS FALLBACK"; return; }
    try {
      const program = createProgram(gl, maskRevealPreviewVertexShader, maskRevealFragmentShader);
      const buffer = gl.createBuffer();
      const texture = gl.createTexture();
      if (!buffer || !texture) throw new Error("WebGL resource allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,0,0, 1,-1,1,0, -1,1,0,1, 1,1,1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "aPosition");
      const uv = gl.getAttribLocation(program, "aUv");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 320, 180, 0, gl.RGBA, gl.UNSIGNED_BYTE, previewTexture(320, 180));
      resources.current = { gl, program, buffer, texture };
      if (status.current) status.current.textContent = "WEBGL LIVE";
      return () => {
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        resources.current = null;
      };
    } catch {
      if (status.current) status.current.textContent = "CSS FALLBACK";
    }
  }, []);

  useEffect(() => {
    const resource = resources.current;
    if (!resource) return;
    renderWebGLPreview(resource, mask, progress);
  }, [mask, progress]);

  return <div className="mask-preview mask-preview--webgl"><canvas ref={canvas} width="960" height="540" aria-label="WebGL mask preview" /><span ref={status}>INITIALIZING</span></div>;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL program allocation failed");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "WebGL link failed");
  gl.useProgram(program);
  return program;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "WebGL compile failed");
  return shader;
}

function renderWebGLPreview(resource: PreviewResources, mask: MaskRevealDefinition, progress: number) {
  const { gl, program, texture } = resource;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.02, 0.02, 0.02, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  uniform1(gl, program, "uMap", 0, true);
  uniform1(gl, program, "uProgress", progress);
  uniform1(gl, program, "uPreset", maskPresetIndex(mask.preset));
  uniform1(gl, program, "uDirection", maskDirectionIndex(mask.direction));
  uniform2(gl, program, "uOrigin", mask.origin[0] / 100, mask.origin[1] / 100);
  uniform1(gl, program, "uSoftness", mask.softness / 100);
  uniform1(gl, program, "uScale", mask.scale);
  uniform1(gl, program, "uRotation", mask.rotation * Math.PI / 180);
  uniform1(gl, program, "uIntensity", mask.intensity);
  uniform1(gl, program, "uSeed", mask.seed);
  uniform1(gl, program, "uInvert", mask.invert ? 1 : 0);
  const color = hexColor(mask.edgeColor);
  const edge = gl.getUniformLocation(program, "uEdgeColor");
  gl.uniform3f(edge, color[0], color[1], color[2]);
  uniform1(gl, program, "uEdgeWidth", mask.edgeWidth / 100);
  uniform2(gl, program, "uViewport", gl.canvas.width, gl.canvas.height);
  uniform2(gl, program, "uTextureSize", 320, 180);
  uniform1(gl, program, "uPanelOpacity", 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function uniform1(gl: WebGLRenderingContext, program: WebGLProgram, name: string, value: number, integer = false) {
  const location = gl.getUniformLocation(program, name);
  if (integer) gl.uniform1i(location, value); else gl.uniform1f(location, value);
}

function uniform2(gl: WebGLRenderingContext, program: WebGLProgram, name: string, x: number, y: number) {
  gl.uniform2f(gl.getUniformLocation(program, name), x, y);
}

function hexColor(value: string) {
  const normalized = value.length === 4 ? value.slice(1).split("").map((part) => part + part).join("") : value.slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
}

function previewTexture(width: number, height: number) {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    const glow = Math.max(0, 1 - Math.hypot(x / width - 0.65, y / height - 0.45) * 2);
    const stripe = Math.sin((x + y * 0.6) * 0.07) * 0.5 + 0.5;
    pixels[index] = Math.round(38 + glow * 217);
    pixels[index + 1] = Math.round(16 + glow * 85 + stripe * 28);
    pixels[index + 2] = Math.round(12 + stripe * 20);
    pixels[index + 3] = 255;
  }
  return pixels;
}
