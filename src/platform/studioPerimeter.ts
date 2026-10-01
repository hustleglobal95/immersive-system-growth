export type StudioPerimeterEnvironment={ [key:string]:string|undefined };

const protectedPrefixes=[
  "/studio",
  "/forge",
  "/director",
  "/structure",
  "/design",
  "/type-vault",
  "/api/studio",
  "/api/forge",
  "/api/asset-bank",
  "/api/integrations",
  "/api/type-vault",
  "/api/project",
  "/api/asset-vault",
] as const;

// This repository is intentionally deployed behind Vercel Authentication.
// When the request is already inside this exact production project, Forge
// can trust Vercel as the outer perimeter unless internal auth is explicitly
// forced back on with STUDIO_AUTH_ENABLED=true.
const TRUSTED_VERCEL_PROJECT_ID="prj_bk5GbceP0Bqjo0tADAzAA3wpPfye";

export function isProtectedAuthoringPath(pathname:string) {
  return protectedPrefixes.some((prefix)=>pathname===prefix || pathname.startsWith(prefix+"/"));
}

export function isStudioAuthBootstrapPath(pathname:string) {
  return pathname==="/studio/login" || pathname.startsWith("/api/studio/auth/");
}

export function studioUsesTrustedVercelPerimeter(environment:StudioPerimeterEnvironment=process.env) {
  return environment.NODE_ENV==="production"
    && environment.VERCEL==="1"
    && environment.VERCEL_ENV==="production"
    && environment.VERCEL_PROJECT_ID===TRUSTED_VERCEL_PROJECT_ID;
}

export function studioAuthEnabled(environment:StudioPerimeterEnvironment=process.env) {
  if(environment.NODE_ENV==="production") {
    const testBypass=environment.CI==="true"
      && environment.FORGE_STUDIO_TEST_AUTH_BYPASS==="true"
      && environment.STUDIO_AUTH_ENABLED==="false";
    if(testBypass) return false;

    const configured=environment.STUDIO_AUTH_ENABLED?.trim().toLowerCase();
    if(configured==="true") return true;

    // Production is already protected by Vercel Authentication for this
    // exact internal project. Avoid forcing a second unconfigured login on
    // top of the verified Vercel session.
    if(studioUsesTrustedVercelPerimeter(environment)) return false;

    return true;
  }
  const configured=environment.STUDIO_AUTH_ENABLED?.trim().toLowerCase();
  if(configured==="true") return true;
  if(configured==="false") return false;
  return false;
}

export function studioAvailableInProduction(environment:StudioPerimeterEnvironment=process.env) {
  return environment.NODE_ENV!=="production"
    || environment.ENABLE_STUDIO_IN_PROD==="true"
    || studioUsesTrustedVercelPerimeter(environment);
}
