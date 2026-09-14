import { allowLocalAssetRequest, getLocalAsset } from '@/src/studio/server/localAssets';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{file:string}>}) {
  if(!allowLocalAssetRequest(request,false))return new Response('Local asset access is disabled.',{status:403});
  const {file}=await params;const bytes=await getLocalAsset(file);if(!bytes)return new Response('Model not found.',{status:404});
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'model/gltf-binary','Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
}
