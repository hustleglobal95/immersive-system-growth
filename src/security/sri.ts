import rawManifest from "@/config/sri-manifest.json";

export interface SriManifestEntry {
  bytes:number;
  sha384:string;
  sha512:string;
  kind:"decoder"|"model"|"texture"|"hdr"|"video";
}
export interface SriManifest {
  version:1;
  entries:Record<string,SriManifestEntry>;
}

const manifest=rawManifest as SriManifest;
const SRI_GUARD_KEY="__forgeSriFetchInstalled";

export class SriSecurityViolationError extends Error {
  readonly name="SriSecurityViolationError";
  constructor(public readonly resource:string,message:string) {
    super(`SRI security violation for ${resource}: ${message}`);
  }
}

export function sriManifest():SriManifest {
  return manifest;
}

export function protectedSriEntry(input:string|URL,origin?:string) {
  const normalized=normalizeLocalPath(input,origin);
  return normalized ? {path:normalized,entry:manifest.entries[normalized]} : null;
}

export async function verifyBytesAgainstSri(resource:string,bytes:ArrayBuffer|Uint8Array,entry:SriManifestEntry) {
  const view=bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if(view.byteLength!==entry.bytes) {
    throw new SriSecurityViolationError(resource,`byte length mismatch (expected ${entry.bytes}, received ${view.byteLength})`);
  }
  const [sha384,sha512]=await Promise.all([
    digest("SHA-384",view),
    digest("SHA-512",view),
  ]);
  if(sha384!==entry.sha384 || sha512!==entry.sha512) {
    throw new SriSecurityViolationError(resource,"cryptographic hash mismatch");
  }
}

export async function verifyResponseIntegrity(input:string|URL|Request,response:Response) {
  const raw=input instanceof Request ? input.url : input;
  const found=protectedSriEntry(raw,typeof location!=="undefined"?location.origin:undefined);
  if(!found?.entry) return response;
  if(!response.ok) return response;
  try {
    const buffer=await response.clone().arrayBuffer();
    await verifyBytesAgainstSri(found.path,buffer,found.entry);
    return response;
  } catch(error) {
    reportSriViolation(found.path,error);
    throw error;
  }
}

export function installSriFetchGuard() {
  if(typeof window==="undefined" || typeof globalThis.fetch!=="function") return;
  const guarded=globalThis as typeof globalThis & Record<string,unknown>;
  if(guarded[SRI_GUARD_KEY]) return;
  const nativeFetch=globalThis.fetch.bind(globalThis);
  guarded[SRI_GUARD_KEY]=true;
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await nativeFetch(input,init);
    return verifyResponseIntegrity(input instanceof Request?input:input,response);
  }) as typeof fetch;
}

export function applySriAttributes(element:HTMLScriptElement|HTMLLinkElement,resource:string) {
  const found=protectedSriEntry(resource,typeof location!=="undefined"?location.origin:undefined);
  if(!found?.entry) throw new SriSecurityViolationError(resource,"no integrity entry exists");
  element.integrity=found.entry.sha384;
  element.crossOrigin="anonymous";
}

function normalizeLocalPath(input:string|URL,origin?:string) {
  try {
    const base=origin || "http://forge.local";
    const url=input instanceof URL ? input : new URL(input,base);
    if(origin && url.origin!==origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

async function digest(algorithm:"SHA-384"|"SHA-512",bytes:Uint8Array) {
  const copy=bytes.slice().buffer;
  const hash=await crypto.subtle.digest(algorithm,copy);
  return `${algorithm==="SHA-384"?"sha384":"sha512"}-${toBase64(new Uint8Array(hash))}`;
}

function toBase64(bytes:Uint8Array) {
  let binary="";
  for(let offset=0;offset<bytes.length;offset+=0x8000) {
    binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  }
  return btoa(binary);
}

function reportSriViolation(resource:string,error:unknown) {
  const message=error instanceof Error?error.message:String(error);
  console.error("FORGE_SECURITY_SRI",{resource,message});
  window.dispatchEvent(new CustomEvent("forge:security-telemetry",{detail:{source:"sri",reason:"integrity-mismatch",resource}}));
}
