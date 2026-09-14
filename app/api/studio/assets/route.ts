import { allowLocalAssetRequest, readBoundedBody, storeLocalAsset, MAX_ASSET_BYTES } from '@/src/studio/server/localAssets';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  if(!allowLocalAssetRequest(request,true))return Response.json({error:'File upload is local-only. Run npm run dev on localhost, or explicitly enable STUDIO_LOCAL_ASSET_UPLOADS=1 for a local production server.'},{status:403});
  const size=Number(request.headers.get('content-length')??0);
  if(size>MAX_ASSET_BYTES)return Response.json({error:'The maximum model size is 20 MB.'},{status:413});
  try{return Response.json(await storeLocalAsset(await readBoundedBody(request)),{status:201});}
  catch(error){return Response.json({error:error instanceof Error?error.message:'Model upload failed.'},{status:400});}
}
