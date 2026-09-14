import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MAX_STUDIO_GLB_BYTES, validateStudioGlb } from '@/src/studio/studioAssetUpload';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  // This is an explicitly local authoring capability, never an open production upload API.
  if (process.env.NODE_ENV !== 'development') return Response.json({ error: 'Local GLB import is available in the development Studio. For a hosted Studio, prepare a model URL instead.' }, { status: 403 });
  const origin = request.headers.get('origin');
  // Next's development server may construct request.url with its bind address
  // (0.0.0.0); the browser's Origin must match the actual HTTP Host instead.
  let sameOrigin = false;
  try { const parsed = new URL(origin || ''); sameOrigin = ['http:', 'https:'].includes(parsed.protocol) && parsed.origin === origin && parsed.host === request.headers.get('host'); } catch { sameOrigin = false; }
  if (!sameOrigin || request.headers.get('x-forge-studio') !== 'local-asset-import') return Response.json({ error: 'Same-origin Studio requests only.' }, { status: 403 });
  if (request.headers.get('content-type') !== 'model/gltf-binary') return Response.json({ error: 'Expected a GLB file.' }, { status: 415 });
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_STUDIO_GLB_BYTES) return Response.json({ error: 'The local model limit is 25 MB.' }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Empty upload.' }, { status: 400 });
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > MAX_STUDIO_GLB_BYTES) { await reader.cancel(); return Response.json({ error: 'The local model limit is 25 MB.' }, { status: 413 }); } chunks.push(value); }
    const buffer = Buffer.concat(chunks); validateStudioGlb(buffer);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const directory = join(process.cwd(), 'public', 'models', 'studio');
    await mkdir(directory, { recursive: true });
    try { await writeFile(join(directory, `${hash}.glb`), buffer, { flag: 'wx' }); }
    catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error; }
    return Response.json({ url: `/models/studio/${hash}.glb`, bytes, sha256: hash }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Could not import this GLB.' }, { status: 400 }); }
  finally { reader.releaseLock(); }
}
