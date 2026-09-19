import { NextResponse, type NextRequest } from "next/server";
import { STUDIO_SESSION_COOKIE, verifyStudioSessionToken } from "@/src/platform/studioAccess";

export async function proxy(request: NextRequest) {
  if (process.env.FORGE_INTERNAL_ACCESS_ENABLED !== "true") return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (path === "/studio/login" || path.startsWith("/api/studio/auth/")) return NextResponse.next();

  const token = request.cookies.get(STUDIO_SESSION_COOKIE)?.value ?? "";
  const identity = await verifyStudioSessionToken(token, process.env.FORGE_INTERNAL_SESSION_SECRET ?? "");
  if (identity) return NextResponse.next();

  if (path.startsWith("/api/")) return NextResponse.json({ ok: false, error: "Forge internal access is required" }, { status: 401 });
  const login = new URL("/studio/login", request.url);
  login.searchParams.set("next", path + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const proxyConfig = {
  matcher: ["/studio/:path*", "/director/:path*", "/structure/:path*", "/api/studio/:path*"],
};
