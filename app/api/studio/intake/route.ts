import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { once } from 'node:events';

export const runtime = 'nodejs';
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const allowed = new Set('svg ai eps pdf fig psd png jpg jpeg webp avif tif tiff raw dng cr2 nef arw mov mp4 webm mxf wav aif aiff flac mp3 step stp iges igs sldprt catpart 3dm blend fbx obj glb gltf rvt ifc skp max dwg dxf usd usdz bvh csv json xlsx parquet geojson kml gpx zip docx md txt woff2 woff otf ttf vtt srt yaml yml aep riv lottie mmd eml'.split(' '));

function safeSegment(value: string, fallback: string) {
  const safe = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
  return safe || fallback;
}
function ext(name: string) { const part = name.split('.').pop()?.toLowerCase() ?? ''; return part === name.toLowerCase() ? '' : part; }

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') return Response.json({ error: 'Client intake uploads are local-development only. Use approved client storage for hosted Studio deployments.' }, { status: 403 });
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { const parsed = new URL(origin || ''); sameOrigin = ['http:','https:'].includes(parsed.protocol) && parsed.origin === origin && parsed.host === request.headers.get('host'); } catch { sameOrigin = false; }
  if (!sameOrigin || request.headers.get('x-forge-studio') !== 'client-intake') return Response.json({ error: 'Same-origin Studio intake requests only.' }, { status: 403 });
  const encodedName = request.headers.get('x-forge-intake-file');
  if (!encodedName) return Response.json({ error: 'File name is required.' }, { status: 400 });
  let original = '';
  try { original = decodeURIComponent(encodedName); } catch { return Response.json({ error: 'Invalid file name.' }, { status: 400 }); }
  original = basename(original);
  const extension = ext(original);
  if (!extension || !allowed.has(extension)) return Response.json({ error: `.${extension || 'unknown'} files are not accepted by the local intake vault.` }, { status: 415 });
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BYTES) return Response.json({ error: 'Local intake files are limited to 2 GiB each. Register larger masters as externally delivered.' }, { status: 413 });
  const body = request.body?.getReader();
  if (!body) return Response.json({ error: 'Empty upload.' }, { status: 400 });
  const project = safeSegment(request.headers.get('x-forge-intake-project') || '', 'untitled-project');
  const item = safeSegment(request.headers.get('x-forge-intake-item') || '', 'unassigned');
  const directory = join(process.cwd(), 'data', 'client-intake', project, item);
  await mkdir(directory, { recursive: true });
  const temp = join(directory, `.upload-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  const stream = createWriteStream(temp, { flags: 'wx' });
  const hash = createHash('sha256');
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await body.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error('Local intake files are limited to 2 GiB each. Register larger masters as externally delivered.');
      hash.update(value);
      if (!stream.write(Buffer.from(value))) await once(stream, 'drain');
    }
    stream.end(); await once(stream, 'finish');
    const sha256 = hash.digest('hex');
    const finalName = `${sha256.slice(0, 12)}-${safeSegment(original, `asset.${extension}`)}`;
    const finalPath = join(directory, finalName);
    try { await rename(temp, finalPath); } catch (error) { await unlink(temp).catch(() => {}); throw error; }
    return Response.json({ bytes, sha256, storedPath: `data/client-intake/${project}/${item}/${finalName}` }, { status: 201 });
  } catch (error) {
    stream.destroy(); await unlink(temp).catch(() => {});
    return Response.json({ error: error instanceof Error ? error.message : 'Could not store this intake file.' }, { status: 400 });
  } finally { body.releaseLock(); }
}
