"use client";

/**
 * Casa Lumen draws nothing into the world canvas.
 *
 * Every chapter carries an opaque media plate at z-index 2, so anything rendered here sits
 * permanently behind it. The sky dome and animated water plane this used to draw came to about
 * 20,600 triangles a frame, with a per-vertex wave shader, for zero visible output.
 *
 * The canvas itself still has work to do and stays mounted: masks authored with a shader preset
 * -- noise-dissolve on 01, ink-spread on 04, film-burn on the closing chapter -- resolve to the
 * WebGL backend on a high-quality device and are drawn by MaskedMediaLayer inside this canvas.
 * Removing the canvas would strand those three panels, because CinematicMedia deliberately skips
 * rendering a DOM panel whose mask has resolved to WebGL.
 */
export function AtelierMarisEnvironment() {
  return null;
}
