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

export function isProtectedAuthoringPath(pathname:string) {
  return protectedPrefixes.some((prefix)=>pathname===prefix || pathname.startsWith(prefix+"/"));
}

export function isStudioAuthBootstrapPath(pathname:string) {
  return pathname==="/studio/login" || pathname.startsWith("/api/studio/auth/");
}

export function studioAuthEnabled(environment:StudioPerimeterEnvironment=process.env) {
  return environment.STUDIO_AUTH_ENABLED!=="false";
}

export function studioAvailableInProduction(environment:StudioPerimeterEnvironment=process.env) {
  return environment.NODE_ENV!=="production" || environment.ENABLE_STUDIO_IN_PROD==="true";
}
