(() => {
  const data = window.__FORGE_EMBEDDED__, objectUrls = new Map();
  const decode = (value) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const mime = (key) => key.endsWith('.glb') ? 'model/gltf-binary' : key.endsWith('.webp') ? 'image/webp' : key.endsWith('.png') ? 'image/png' : key.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
  const keyOf = value => { try { return new URL(String(value), 'https://forge-offline.invalid/').pathname; } catch { return String(value); } };
  const bytes = new Map(Object.entries(data).map(([key, value]) => [key, decode(value)]));
  delete window.__FORGE_EMBEDDED__;
  const blobUrl = key => { if (!objectUrls.has(key)) objectUrls.set(key, URL.createObjectURL(new Blob([bytes.get(key)],{type:mime(key)}))); return objectUrls.get(key); };
  // All references below resolve to embedded content. Unknown files fail explicitly.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const resolved = input instanceof NativeRequest ? input.url : String(input);
    const key = keyOf(resolved);
    if (bytes.has(key)) return new Response(bytes.get(key), { headers: { 'content-type': mime(key), 'content-length': String(bytes.get(key).byteLength) } });
    if (key === '/api/studio/assets') return Response.json({ error: 'The portable edition does not write to your project folder. Run the full Studio with npm run dev to import GLBs into public/models/studio.' }, { status: 403 });
    if (resolved.startsWith('blob:') || resolved.startsWith('data:')) return originalFetch(input, options);
    throw new Error(`Not embedded in this offline edition: ${key}. Use the full Studio for hosted assets.`);
  };
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
  Object.defineProperty(HTMLImageElement.prototype,'src', { ...descriptor, set(value) { const key=keyOf(value); descriptor.set.call(this,bytes.has(key) ? blobUrl(key) : value); } });
  // Three's FileLoader creates Request before fetch. Root-relative references have
  // no HTTP base in a file:// document, so resolve embedded resources to blob URLs.
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) { const key = keyOf(value); return setAttribute.call(this, name, this instanceof HTMLImageElement && name === 'src' && bytes.has(key) ? blobUrl(key) : value); };
  const NativeRequest=window.Request;
  window.Request = class extends NativeRequest { constructor(input, init) { const key=keyOf(input instanceof NativeRequest ? input.url : input); super(bytes.has(key) ? blobUrl(key) : input, init); } };
  const NativeImageBitmap=window.createImageBitmap;
  if(NativeImageBitmap) window.createImageBitmap=NativeImageBitmap.bind(window);
  window.addEventListener('unload',()=>objectUrls.forEach(url=>URL.revokeObjectURL(url)));
})();
