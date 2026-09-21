import fs from "node:fs";

const checks = [
  check("Studio product shell", 12, () => files("src/studio/ProductionStudioWorkbench.tsx", "src/studio/StudioWorkflowGuide.tsx")),
  check("Project Vault implementation", 18, () => files("src/platform/studioVault.ts", "src/studio/StudioVaultPanel.tsx", "app/api/studio/vault/projects/route.ts")),
  check("Asset Vault implementation", 16, () => files("src/platform/assetVault.ts", "app/api/studio/assets/vault/promote/route.ts")),
  check("Internal access implementation", 14, () => files("src/platform/studioAccess.ts", "proxy.ts", "app/studio/login/page.tsx")),
  check("Project Vault environment", 12, projectVaultReady),
  check("Asset Vault environment", 12, assetVaultReady),
  check("Internal access environment", 8, internalAccessReady),
  check("Review publishing environment", 5, publishReady),
  check("Validation contract", 3, () => files("docs/VALIDATION.md", "tests/studio-productization.test.ts")),
];

const possible = checks.reduce((sum, item) => sum + item.weight, 0);
const earned = checks.filter((item) => item.ok).reduce((sum, item) => sum + item.weight, 0);
const score = Math.round(earned / possible * 100);

console.log("Forge internal-product readiness");
for (const item of checks) console.log(`${item.ok ? "PASS" : "HOLD"}  ${String(item.weight).padStart(2)}  ${item.label}`);
console.log(`\nConfigured readiness: ${score}/100`);
console.log("External release evidence still required: hosted CI execution, real-device performance, and production object-storage verification.");

if (process.argv.includes("--strict") && checks.some((item) => !item.ok)) process.exitCode = 1;

function check(label, weight, fn) {
  try { return { label, weight, ok: Boolean(fn()) }; }
  catch { return { label, weight, ok: false }; }
}
function files(...paths) { return paths.every((file) => fs.existsSync(file)); }
function env(...names) { return names.every((name) => Boolean(process.env[name]?.trim())); }


function projectVaultReady() {
  const remote=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(process.env.FORGE_GITHUB_REPOSITORY ?? "") && Boolean(process.env.FORGE_GITHUB_TOKEN?.trim());
  const local=process.env.NODE_ENV!=="production" && process.env.FORGE_LOCAL_STORAGE_ENABLED==="true";
  return remote || local;
}
function assetVaultReady() {
  if (process.env.NODE_ENV!=="production" && process.env.FORGE_LOCAL_STORAGE_ENABLED==="true") return true;
  if (!env("FORGE_ASSET_VAULT_ENDPOINT", "FORGE_ASSET_VAULT_PUBLIC_BASE_URL", "FORGE_ASSET_VAULT_TOKEN")) return false;
  try {
    return [process.env.FORGE_ASSET_VAULT_ENDPOINT, process.env.FORGE_ASSET_VAULT_PUBLIC_BASE_URL].every((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    });
  } catch { return false; }
}
function internalAccessReady() {
  if (process.env.STUDIO_AUTH_ENABLED === "false" || (process.env.FORGE_INTERNAL_SESSION_SECRET?.length ?? 0) < 32) return false;
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STUDIO_IN_PROD !== "true") return false;
  try {
    const users = JSON.parse(process.env.FORGE_INTERNAL_USERS_JSON ?? "[]");
    return Array.isArray(users) && users.length > 0 && users.every((user) => user && typeof user.id === "string" && typeof user.name === "string" && typeof user.role === "string" && /^pbkdf2\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/.test(user.secretHash ?? ""));
  } catch { return false; }
}
function publishReady() {
  return process.env.FORGE_STUDIO_PUBLISH_ENABLED === "true" && (process.env.FORGE_STUDIO_PUBLISH_SECRET?.length ?? 0) >= 24 && projectVaultReady();
}
