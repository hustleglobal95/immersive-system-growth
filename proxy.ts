import { NextResponse, type NextRequest } from "next/server";
import { STUDIO_SESSION_COOKIE, studioAuthConfiguration, verifyStudioSessionToken } from "@/src/platform/studioAccess";
import {
  isProtectedAuthoringPath,
  isStudioAuthBootstrapPath,
  studioAuthEnabled,
  studioAvailableInProduction,
} from "@/src/platform/studioPerimeter";

export async function proxy(request:NextRequest) {
  const path=request.nextUrl.pathname;
  if(!isProtectedAuthoringPath(path)) return NextResponse.next();

  if(!studioAvailableInProduction(process.env)) {
    if(path.startsWith("/api/")) return NextResponse.json({ok:false,error:"Not found"},{status:404});
    return new NextResponse("Not Found",{status:404});
  }

  if(!studioAuthEnabled(process.env)) return NextResponse.next();
  if(isStudioAuthBootstrapPath(path)) return NextResponse.next();

  const auth=studioAuthConfiguration(process.env);
  if(!auth.configured) {
    if(path.startsWith("/api/")) {
      return NextResponse.json({
        ok:false,
        error:auth.issue ?? "Forge Studio authentication setup is incomplete.",
        setupRequired:true,
      },{status:503});
    }
    const login=new URL("/studio/login",request.url);
    login.searchParams.set("next",path+request.nextUrl.search);
    login.searchParams.set("setup","1");
    return NextResponse.redirect(login);
  }

  const token=request.cookies.get(STUDIO_SESSION_COOKIE)?.value ?? "";
  const identity=await verifyStudioSessionToken(token,process.env.FORGE_INTERNAL_SESSION_SECRET ?? "");
  if(identity) return NextResponse.next();

  if(path.startsWith("/api/")) {
    return NextResponse.json({ok:false,error:"Forge Studio authentication is required"},{status:401});
  }
  const login=new URL("/studio/login",request.url);
  login.searchParams.set("next",path+request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config={
  matcher:[
    "/studio/:path*",
    "/forge/:path*",
    "/director/:path*",
    "/structure/:path*",
    "/design/:path*",
    "/type-vault/:path*",
    "/api/studio/:path*",
    "/api/forge/:path*",
    "/api/asset-bank/:path*",
    "/api/integrations/:path*",
    "/api/type-vault/:path*",
    "/api/project/:path*",
    "/api/asset-vault/:path*",
  ],
};
