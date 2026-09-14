/** GLB intake validation is separate so tests never write into a project. */
export const MAX_STUDIO_GLB_BYTES = 25 * 1024 * 1024;
export function validateStudioGlb(buffer: Uint8Array) {
  if (buffer.byteLength < 20 || buffer.byteLength > MAX_STUDIO_GLB_BYTES) throw new Error('Choose a GLB between 20 bytes and 25 MB.');
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw new Error('This is not a complete GLB 2.0 file.');
  const length = view.getUint32(12, true);
  if (length % 4 || length > buffer.byteLength - 20 || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('The GLB JSON chunk is invalid.');
  const model = JSON.parse(new TextDecoder().decode(buffer.subarray(20, 20 + length)).trim());
  if (model.asset?.version !== '2.0') throw new Error('Only GLB 2.0 is supported.');
  // Reject external resource references; a local import must be portable and self-contained.
  for (const entry of [...(model.buffers ?? []), ...(model.images ?? [])]) {
    if (entry.uri && !/^data:(?:image\/(?:png|jpeg|webp)|application\/octet-stream);base64,/.test(entry.uri)) throw new Error('Embed textures and buffers before importing this GLB. External resource URLs are not allowed.');
  }
}
