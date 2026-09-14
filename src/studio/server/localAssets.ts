import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
export const MAX_ASSET_BYTES=20*1024*1024;
const folder=()=>path.join(process.cwd(),'data','studio-assets');
const loopback=(host:string)=>['localhost','127.0.0.1','[::1]'].includes(host);
export function allowLocalAssetRequest(request: Request, write: boolean, production=process.env.NODE_ENV==='production', enabled=process.env.STUDIO_LOCAL_ASSET_UPLOADS==='1') {
  const url=new URL(request.url);
  if(!loopback(url.hostname)) return false;
  const forwarded=request.headers.get('x-forwarded-host');
  if(forwarded&&forwarded!==url.host)return false;
  if(production&&!enabled) return false;
  if(!write) return true;
  const origin=request.headers.get('origin');
  return origin===url.origin && (request.headers.get('sec-fetch-site')??'same-origin')==='same-origin';
}
export function validateGlb(bytes: Uint8Array): void {
  if(bytes.byteLength<20||bytes.byteLength>MAX_ASSET_BYTES)throw new Error('Choose a valid GLB smaller than 20 MB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw new Error('The file is not a valid binary glTF 2 model.');
  const length=view.getUint32(12,true);
  if(view.getUint32(16,true)!==0x4e4f534a||length<2||20+length>bytes.byteLength)throw new Error('The GLB JSON chunk is invalid.');
  const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+length)));
  if(json.asset?.version!=='2.0')throw new Error('Only glTF 2 models are supported.');
  for(const item of [...(json.images??[]),...(json.buffers??[])])if(item.uri&&!/^data:/i.test(item.uri))throw new Error('Embed textures and buffers in a self-contained GLB before uploading.');
}
export async function readBoundedBody(request: Request) {
  const reader=request.body?.getReader();if(!reader)throw new Error('No model data received.');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_ASSET_BYTES){await reader.cancel();throw new Error('The maximum model size is 20 MB.');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
export async function storeLocalAsset(bytes: Uint8Array) {
  validateGlb(bytes);const hash=createHash('sha256').update(bytes).digest('hex');
  await fs.mkdir(folder(),{recursive:true});
  await fs.writeFile(path.join(folder(),`${hash}.glb`),bytes,{flag:'wx'}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e;});
  return {url:`/api/studio/assets/${hash}.glb`,bytes:bytes.byteLength,sha256:hash};
}
export async function getLocalAsset(file: string) {
  if(!/^[a-f0-9]{64}\.glb$/.test(file))return null;
  try{return await fs.readFile(path.join(folder(),file));}catch{return null;}
}
