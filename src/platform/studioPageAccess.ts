import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { STUDIO_SESSION_COOKIE, verifyStudioSessionToken, type StudioIdentity } from "@/src/platform/studioAccess";
import { studioAuthEnabled, studioAvailableInProduction } from "@/src/platform/studioPerimeter";

export async function requireStudioPageAccess(nextPath="/studio"):Promise<StudioIdentity> {
  if(!studioAvailableInProduction(process.env)) notFound();
  if(!studioAuthEnabled(process.env)) return {id:"local-owner",name:"Local owner",role:"owner"};
  const store=await cookies();
  const token=store.get(STUDIO_SESSION_COOKIE)?.value ?? "";
  const identity=await verifyStudioSessionToken(token,process.env.FORGE_INTERNAL_SESSION_SECRET ?? "");
  if(identity) return identity;
  redirect("/studio/login?next="+encodeURIComponent(nextPath));
}
