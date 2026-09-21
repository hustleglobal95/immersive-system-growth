import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import { isProtectedAuthoringPath, studioAuthEnabled, studioAvailableInProduction } from "../../src/platform/studioPerimeter";

test("Studio auth defaults off in development, on in production, and lab remains public",()=>{
  assert.equal(studioAuthEnabled({}),false);
  assert.equal(studioAuthEnabled({NODE_ENV:"development"}),false);
  assert.equal(studioAuthEnabled({NODE_ENV:"production"}),true);
  assert.equal(studioAuthEnabled({NODE_ENV:"development",STUDIO_AUTH_ENABLED:"true"}),true);
  assert.equal(studioAuthEnabled({NODE_ENV:"production",STUDIO_AUTH_ENABLED:"false"}),false);
  assert.equal(studioAvailableInProduction({NODE_ENV:"production"}),false);
  assert.equal(studioAvailableInProduction({NODE_ENV:"production",ENABLE_STUDIO_IN_PROD:"true"}),true);
  assert.equal(isProtectedAuthoringPath("/studio"),true);
  assert.equal(isProtectedAuthoringPath("/api/studio/vault/projects"),true);
  assert.equal(isProtectedAuthoringPath("/api/project/demo"),true);
  assert.equal(isProtectedAuthoringPath("/api/asset-vault/promote"),true);
  assert.equal(isProtectedAuthoringPath("/lab"),false);
  assert.equal(isProtectedAuthoringPath("/"),false);
});

test("unauthenticated Studio access is rejected at the perimeter",async()=>{
  const previous={
    STUDIO_AUTH_ENABLED:process.env.STUDIO_AUTH_ENABLED,
    ENABLE_STUDIO_IN_PROD:process.env.ENABLE_STUDIO_IN_PROD,
    FORGE_INTERNAL_SESSION_SECRET:process.env.FORGE_INTERNAL_SESSION_SECRET,
    FORGE_INTERNAL_USERS_JSON:process.env.FORGE_INTERNAL_USERS_JSON,
  };
  process.env.STUDIO_AUTH_ENABLED="true";
  process.env.ENABLE_STUDIO_IN_PROD="true";
  process.env.FORGE_INTERNAL_SESSION_SECRET="x".repeat(40);
  process.env.FORGE_INTERNAL_USERS_JSON=JSON.stringify([{id:"kevin",name:"Kevin",role:"owner",secretHash:"pbkdf2$210000$c2FsdA$aGFzaA"}]);
  try{
    const response=await proxy(new NextRequest("https://forge.example/studio"));
    assert.ok([307,308].includes(response.status));
    assert.equal(new URL(response.headers.get("location")!).pathname,"/studio/login");

    const api=await proxy(new NextRequest("https://forge.example/api/studio/vault/projects"));
    assert.equal(api.status,401);
  }finally{
    restore("STUDIO_AUTH_ENABLED",previous.STUDIO_AUTH_ENABLED);
    restore("ENABLE_STUDIO_IN_PROD",previous.ENABLE_STUDIO_IN_PROD);
    restore("FORGE_INTERNAL_SESSION_SECRET",previous.FORGE_INTERNAL_SESSION_SECRET);
    restore("FORGE_INTERNAL_USERS_JSON",previous.FORGE_INTERNAL_USERS_JSON);
  }
});

test("auth-enabled Studio with no configured owner routes to setup instead of impossible login",async()=>{
  const previous={
    STUDIO_AUTH_ENABLED:process.env.STUDIO_AUTH_ENABLED,
    ENABLE_STUDIO_IN_PROD:process.env.ENABLE_STUDIO_IN_PROD,
    FORGE_INTERNAL_SESSION_SECRET:process.env.FORGE_INTERNAL_SESSION_SECRET,
    FORGE_INTERNAL_USERS_JSON:process.env.FORGE_INTERNAL_USERS_JSON,
  };
  process.env.STUDIO_AUTH_ENABLED="true";
  process.env.ENABLE_STUDIO_IN_PROD="true";
  process.env.FORGE_INTERNAL_SESSION_SECRET="x".repeat(40);
  process.env.FORGE_INTERNAL_USERS_JSON="[]";
  try{
    const response=await proxy(new NextRequest("https://forge.example/studio"));
    assert.ok([307,308].includes(response.status));
    const location=new URL(response.headers.get("location")!);
    assert.equal(location.pathname,"/studio/login");
    assert.equal(location.searchParams.get("setup"),"1");

    const api=await proxy(new NextRequest("https://forge.example/api/studio/vault/projects"));
    assert.equal(api.status,503);
    const body=await api.json() as {setupRequired?:boolean;error?:string};
    assert.equal(body.setupRequired,true);
    assert.match(body.error ?? "",/No Forge Studio users are configured/i);
  }finally{
    restore("STUDIO_AUTH_ENABLED",previous.STUDIO_AUTH_ENABLED);
    restore("ENABLE_STUDIO_IN_PROD",previous.ENABLE_STUDIO_IN_PROD);
    restore("FORGE_INTERNAL_SESSION_SECRET",previous.FORGE_INTERNAL_SESSION_SECRET);
    restore("FORGE_INTERNAL_USERS_JSON",previous.FORGE_INTERNAL_USERS_JSON);
  }
});

function restore(name:string,value:string|undefined){
  if(value===undefined) delete process.env[name];
  else process.env[name]=value;
}
