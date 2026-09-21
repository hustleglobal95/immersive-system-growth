import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createStudioSessionToken, hasStudioRole, parseStudioUsers, studioAccessEnabled, verifyStudioSessionToken, verifyStudioUserSecret } from "../src/platform/studioAccess";
import { listVaultProjects, listVaultVersions, readVaultProject, restoreVaultVersion, saveVaultProject, vaultConfiguration } from "../src/platform/studioVault";
import { assetVaultConfiguration } from "../src/platform/assetVault";
import rawExperience from "../config/experience.json";
import rawProject from "../config/studio-project.json";
import rawManifest from "../config/asset-manifest.json";
import rawGraph from "../config/interaction-graph.json";

test("Studio authentication is fail-closed by default and role ordering is explicit", () => {
  assert.equal(studioAccessEnabled({}), true);
  assert.equal(studioAccessEnabled({ STUDIO_AUTH_ENABLED: "false" }), false);
  assert.equal(studioAccessEnabled({ STUDIO_AUTH_ENABLED: "true" }), true);
  assert.equal(hasStudioRole({ id: "d", name: "Designer", role: "designer" }, "reviewer"), true);
  assert.equal(hasStudioRole({ id: "d", name: "Designer", role: "designer" }, "developer"), false);
  assert.equal(hasStudioRole({ id: "o", name: "Owner", role: "owner" }, "developer"), true);
});

test("internal user passphrases verify from PBKDF2 hashes", async () => {
  const secret = "correct horse battery staple";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 210000;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]);
  const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
  const b64 = (value: Uint8Array) => Buffer.from(value).toString("base64url");
  const users = parseStudioUsers({ FORGE_INTERNAL_USERS_JSON: JSON.stringify([{ id: "kevin", name: "Kevin", role: "owner", secretHash: `pbkdf2$${iterations}$${b64(salt)}$${b64(hash)}` }]) });
  assert.equal(await verifyStudioUserSecret(users[0], secret), true);
  assert.equal(await verifyStudioUserSecret(users[0], "wrong passphrase"), false);
});

test("internal sessions are signed, role-bearing and expire server-side", async () => {
  const identity = { id: "kevin", name: "Kevin", role: "owner" as const };
  const secret = "server-session-secret-at-least-long-enough";
  const token = await createStudioSessionToken(identity, secret, Math.floor(Date.now() / 1000) + 60);
  assert.deepEqual(await verifyStudioSessionToken(token, secret), identity);
  assert.equal(await verifyStudioSessionToken(token, "different-secret"), null);
  const expired = await createStudioSessionToken(identity, secret, Math.floor(Date.now() / 1000) - 1);
  assert.equal(await verifyStudioSessionToken(expired, secret), null);
});

test("Project Vault and Asset Vault expose deployment readiness independently", () => {
  assert.equal(vaultConfiguration({}).configured, false);
  assert.equal(vaultConfiguration({ FORGE_GITHUB_REPOSITORY: "owner/repo", FORGE_GITHUB_TOKEN: "token" }).configured, true);
  assert.equal(vaultConfiguration({ NODE_ENV:"development", FORGE_LOCAL_STORAGE_ENABLED:"true" }).provider, "local-filesystem");
  assert.equal(vaultConfiguration({ NODE_ENV:"production", FORGE_LOCAL_STORAGE_ENABLED:"true" }).configured, false);
  assert.equal(assetVaultConfiguration({}).configured, false);
  assert.equal(assetVaultConfiguration({ NODE_ENV:"development", FORGE_LOCAL_STORAGE_ENABLED:"true" }).provider, "local-filesystem");
  assert.equal(assetVaultConfiguration({ NODE_ENV:"production", FORGE_LOCAL_STORAGE_ENABLED:"true" }).configured, false);
  assert.equal(assetVaultConfiguration({ FORGE_ASSET_VAULT_ENDPOINT: "https://upload.example.com", FORGE_ASSET_VAULT_PUBLIC_BASE_URL: "https://cdn.example.com", FORGE_ASSET_VAULT_TOKEN: "token" }).configured, true);
});

test("internal product surfaces are wired into Studio and shipping blocks temporary generated assets", () => {
  const studio = fs.readFileSync("src/studio/ProductionStudioWorkbench.tsx", "utf8");
  const publish = fs.readFileSync("src/studio/ProjectPanels.tsx", "utf8");
  const creator = fs.readFileSync("src/studio/AssetCreationWorkbench.tsx", "utf8");
  const proxy = fs.readFileSync("proxy.ts", "utf8");
  assert.match(studio, /StudioVaultPanel/);
  assert.match(studio, /StudioIdentityBadge/);
  assert.match(studio, /Project Vault/);
  assert.match(publish, /temporaryAssets/);
  assert.match(publish, /Asset durability/);
  assert.match(creator, /assets\/vault\/promote/);
  assert.match(proxy, /api\/forge/);
  assert.match(proxy, /studioAuthEnabled/);
  assert.doesNotMatch(proxy, /"\/lab\/:path\*"/);
});


test("internal product release boundaries preserve automation and gate human actions by role", () => {
  const publishRoute = fs.readFileSync("app/api/studio/publish/route.ts", "utf8");
  const generationRoute = fs.readFileSync("app/api/studio/assets/generate/route.ts", "utf8");
  const publishStatus = fs.readFileSync("app/api/studio/publish/status/route.ts", "utf8");
  const vault = fs.readFileSync("src/platform/studioVault.ts", "utf8");
  const proxy = fs.readFileSync("proxy.ts", "utf8");
  assert.match(publishRoute, /legacyAutomation/);
  assert.match(publishRoute, /requireStudioRole\(request, "developer"\)/);
  assert.match(generationRoute, /requireStudioRole\(request, "designer"\)/);
  assert.match(publishStatus, /canPublish: hasStudioRole\(identity, "developer"\)/);
  assert.match(vault, /900 KB durable snapshot limit/);
  assert.match(proxy, /export const config/);
});


test("local Project Vault performs durable save, version and restore without GitHub credentials", async () => {
  const localDir=".forge/test-vault-"+crypto.randomUUID();
  const environment={ NODE_ENV:"development", FORGE_LOCAL_STORAGE_ENABLED:"true", FORGE_LOCAL_VAULT_DIR:localDir } as NodeJS.ProcessEnv;
  const actor={id:"local-owner",name:"Local owner",role:"owner"};
  try {
    const first=await saveVaultProject({
      experience:rawExperience,
      project:rawProject,
      assetManifest:rawManifest,
      interactionGraph:rawGraph,
    },actor,"First checkpoint","Local provider test",environment);
    assert.equal(first.summary.id,rawProject.id);
    assert.equal((await listVaultProjects(environment)).length,1);
    assert.equal((await listVaultVersions(rawProject.id,environment)).length,1);
    const current=await readVaultProject(rawProject.id,environment);
    assert.equal(current?.versionId,first.snapshot.versionId);

    const secondExperience=structuredClone(rawExperience);
    secondExperience.meta.description=rawExperience.meta.description+" Revised for local Vault restore proof.";
    const second=await saveVaultProject({
      experience:secondExperience,
      project:rawProject,
      assetManifest:rawManifest,
      interactionGraph:rawGraph,
    },actor,"Second checkpoint","Mutation for restore proof",environment);
    assert.notEqual(second.snapshot.versionId,first.snapshot.versionId);
    assert.equal((await listVaultVersions(rawProject.id,environment)).length,2);

    await restoreVaultVersion(rawProject.id,first.snapshot.versionId,actor,environment);
    const restored=await readVaultProject(rawProject.id,environment);
    assert.equal(restored?.versionId,first.snapshot.versionId);
    assert.equal(restored?.experience.meta.description,rawExperience.meta.description);
  } finally {
    fs.rmSync(localDir,{recursive:true,force:true});
  }
});
