import { Buffer } from "node:buffer";
import { z } from "zod";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseAssetManifest } from "@/src/platform/assetManifestSchema";
import { parseStudioProject } from "@/src/platform/studioSchema";

const vaultSummarySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(100),
  status: z.enum(["active", "archived"]),
  updatedAt: z.iso.datetime(),
  updatedBy: z.string().min(1).max(100),
  sceneCount: z.number().int().nonnegative(),
  versionCount: z.number().int().nonnegative(),
}).strict();

const vaultIndexSchema = z.object({ version: z.literal(1), projects: z.array(vaultSummarySchema).max(1000) }).strict();
const vaultHistoryEntrySchema = z.object({
  versionId: z.string().regex(/^v-[a-zA-Z0-9-]+$/),
  label: z.string().min(1).max(120),
  note: z.string().max(1000),
  savedAt: z.iso.datetime(),
  savedBy: z.string().min(1).max(100),
}).strict();
const vaultHistorySchema = z.object({ version: z.literal(1), entries: z.array(vaultHistoryEntrySchema).max(250) }).strict();
const vaultJournalEventSchema = z.object({
  id: z.string().min(1).max(120),
  at: z.iso.datetime(),
  actor: z.string().min(1).max(100),
  role: z.string().min(1).max(40),
  action: z.enum(["save", "restore", "archive", "unarchive", "publish", "asset-promote", "lesson", "loop-run", "loop-candidate", "loop-accept", "loop-stop", "loop-escalate"]),
  detail: z.string().max(1000),
}).strict();
const vaultJournalSchema = z.object({ version: z.literal(1), events: z.array(vaultJournalEventSchema).max(1000) }).strict();

type VaultConfigurationEnvironment={ [key:string]:string|undefined };

export interface VaultActor { id: string; name: string; role: string; }
export interface VaultDraftInput { experience: unknown; project: unknown; assetManifest: unknown; interactionGraph: unknown; }
export type VaultProjectSummary = z.infer<typeof vaultSummarySchema>;
export type VaultHistoryEntry = z.infer<typeof vaultHistoryEntrySchema>;
export type VaultJournalEvent = z.infer<typeof vaultJournalEventSchema>;

export interface VaultSnapshot {
  version: 1;
  versionId: string;
  label: string;
  note: string;
  savedAt: string;
  savedBy: string;
  experience: ReturnType<typeof parseExperience>;
  project: ReturnType<typeof parseStudioProject>;
  assetManifest: ReturnType<typeof parseAssetManifest>;
  interactionGraph: ReturnType<typeof parseInteractionGraph>;
}

export function vaultConfiguration(environment: VaultConfigurationEnvironment = process.env) {
  return {
    configured: Boolean(environment.FORGE_GITHUB_REPOSITORY && environment.FORGE_GITHUB_TOKEN),
    repositoryConfigured: Boolean(environment.FORGE_GITHUB_REPOSITORY),
    tokenConfigured: Boolean(environment.FORGE_GITHUB_TOKEN),
    branch: environment.FORGE_VAULT_BRANCH || "forge-vault",
  };
}

export async function listVaultProjects(environment: NodeJS.ProcessEnv = process.env) {
  const github = vaultGithub(environment);
  const index = await github.readJson(".forge/vault/index.json", { version: 1, projects: [] });
  return vaultIndexSchema.parse(index).projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readVaultProject(projectId: string, environment: NodeJS.ProcessEnv = process.env): Promise<VaultSnapshot | null> {
  assertProjectId(projectId);
  const github = vaultGithub(environment);
  const value = await github.readJson<unknown | null>(`.forge/vault/projects/${projectId}/current.json`, null);
  return value ? parseSnapshot(value) : null;
}

export async function listVaultVersions(projectId: string, environment: NodeJS.ProcessEnv = process.env) {
  assertProjectId(projectId);
  const github = vaultGithub(environment);
  const value = await github.readJson(`.forge/vault/projects/${projectId}/history.json`, { version: 1, entries: [] });
  return vaultHistorySchema.parse(value).entries.slice().reverse();
}

export async function readVaultVersion(projectId: string, versionId: string, environment: NodeJS.ProcessEnv = process.env): Promise<VaultSnapshot | null> {
  assertProjectId(projectId); assertVersionId(versionId);
  const github = vaultGithub(environment);
  const value = await github.readJson<unknown | null>(`.forge/vault/projects/${projectId}/versions/${versionId}.json`, null);
  return value ? parseSnapshot(value) : null;
}

export async function saveVaultProject(input: VaultDraftInput, actor: VaultActor, label = "Saved from Studio", note = "", environment: NodeJS.ProcessEnv = process.env) {
  const snapshot = makeSnapshot(input, actor, label, note);
  const projectId = snapshot.project.id;
  const github = vaultGithub(environment);
  const index = vaultIndexSchema.parse(await github.readJson(".forge/vault/index.json", { version: 1, projects: [] }));
  const history = vaultHistorySchema.parse(await github.readJson(`.forge/vault/projects/${projectId}/history.json`, { version: 1, entries: [] }));
  const journal = vaultJournalSchema.parse(await github.readJson(`.forge/vault/projects/${projectId}/journal.json`, { version: 1, events: [] }));

  const entry = vaultHistoryEntrySchema.parse({ versionId: snapshot.versionId, label: snapshot.label, note: snapshot.note, savedAt: snapshot.savedAt, savedBy: actor.name });
  const nextHistory = { version: 1 as const, entries: [...history.entries, entry].slice(-250) };
  const prior = index.projects.find((project) => project.id === projectId);
  const summary = vaultSummarySchema.parse({
    id: projectId,
    name: snapshot.project.name,
    status: prior?.status ?? "active",
    updatedAt: snapshot.savedAt,
    updatedBy: actor.name,
    sceneCount: snapshot.experience.scenes.length,
    versionCount: nextHistory.entries.length,
  });
  const nextIndex = { version: 1 as const, projects: [...index.projects.filter((project) => project.id !== projectId), summary] };
  const event = journalEvent(actor, "save", `${snapshot.label}${snapshot.note ? `: ${snapshot.note}` : ""}`);
  const nextJournal = { version: 1 as const, events: [...journal.events, event].slice(-1000) };

  await github.commitFiles({
    ".forge/vault/index.json": nextIndex,
    [`.forge/vault/projects/${projectId}/current.json`]: snapshot,
    [`.forge/vault/projects/${projectId}/versions/${snapshot.versionId}.json`]: snapshot,
    [`.forge/vault/projects/${projectId}/history.json`]: nextHistory,
    [`.forge/vault/projects/${projectId}/journal.json`]: nextJournal,
  }, `Forge Vault: save ${snapshot.project.name} · ${snapshot.label}`);
  return { summary, entry, snapshot };
}

export async function restoreVaultVersion(projectId: string, versionId: string, actor: VaultActor, environment: NodeJS.ProcessEnv = process.env) {
  const snapshot = await readVaultVersion(projectId, versionId, environment);
  if (!snapshot) throw new Error("Vault version not found");
  const github = vaultGithub(environment);
  const index = vaultIndexSchema.parse(await github.readJson(".forge/vault/index.json", { version: 1, projects: [] }));
  const journal = vaultJournalSchema.parse(await github.readJson(`.forge/vault/projects/${projectId}/journal.json`, { version: 1, events: [] }));
  const now = new Date().toISOString();
  const prior = index.projects.find((project) => project.id === projectId);
  if (!prior) throw new Error("Vault project index entry is missing");
  const summary = vaultSummarySchema.parse({ ...prior, updatedAt: now, updatedBy: actor.name, sceneCount: snapshot.experience.scenes.length });
  const nextIndex = { version: 1 as const, projects: [...index.projects.filter((project) => project.id !== projectId), summary] };
  const nextJournal = { version: 1 as const, events: [...journal.events, journalEvent(actor, "restore", `Restored ${versionId} · ${snapshot.label}`)].slice(-1000) };
  await github.commitFiles({
    ".forge/vault/index.json": nextIndex,
    [`.forge/vault/projects/${projectId}/current.json`]: snapshot,
    [`.forge/vault/projects/${projectId}/journal.json`]: nextJournal,
  }, `Forge Vault: restore ${snapshot.project.name} · ${versionId}`);
  return { summary, snapshot };
}

export async function setVaultProjectArchived(projectId: string, archived: boolean, actor: VaultActor, environment: NodeJS.ProcessEnv = process.env) {
  assertProjectId(projectId);
  const github = vaultGithub(environment);
  const index = vaultIndexSchema.parse(await github.readJson(".forge/vault/index.json", { version: 1, projects: [] }));
  const prior = index.projects.find((project) => project.id === projectId);
  if (!prior) throw new Error("Vault project not found");
  const now = new Date().toISOString();
  const summary = vaultSummarySchema.parse({ ...prior, status: archived ? "archived" : "active", updatedAt: now, updatedBy: actor.name });
  const nextIndex = { version: 1 as const, projects: [...index.projects.filter((project) => project.id !== projectId), summary] };
  const journal = vaultJournalSchema.parse(await github.readJson(`.forge/vault/projects/${projectId}/journal.json`, { version: 1, events: [] }));
  const nextJournal = { version: 1 as const, events: [...journal.events, journalEvent(actor, archived ? "archive" : "unarchive", archived ? "Archived project" : "Returned project to active work")].slice(-1000) };
  await github.commitFiles({ ".forge/vault/index.json": nextIndex, [`.forge/vault/projects/${projectId}/journal.json`]: nextJournal }, `Forge Vault: ${archived ? "archive" : "unarchive"} ${prior.name}`);
  return summary;
}

export async function readVaultJournal(projectId: string, environment: NodeJS.ProcessEnv = process.env) {
  assertProjectId(projectId);
  const github = vaultGithub(environment);
  const value = await github.readJson(`.forge/vault/projects/${projectId}/journal.json`, { version: 1, events: [] });
  return vaultJournalSchema.parse(value).events.slice().reverse();
}

export async function appendVaultJournal(projectId: string, actor: VaultActor, action: VaultJournalEvent["action"], detail: string, environment: NodeJS.ProcessEnv = process.env) {
  assertProjectId(projectId);
  const github = vaultGithub(environment);
  const journal = vaultJournalSchema.parse(await github.readJson(`.forge/vault/projects/${projectId}/journal.json`, { version: 1, events: [] }));
  const nextJournal = { version: 1 as const, events: [...journal.events, journalEvent(actor, action, detail)].slice(-1000) };
  await github.commitFiles({ [`.forge/vault/projects/${projectId}/journal.json`]: nextJournal }, `Forge Vault: ${action} ${projectId}`);
}

function makeSnapshot(input: VaultDraftInput, actor: VaultActor, label: string, note: string): VaultSnapshot {
  const savedAt = new Date().toISOString();
  const versionId = `v-${savedAt.replace(/[-:.TZ]/g, "").slice(0, 17)}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    version: 1,
    versionId,
    label: clean(label, 120) || "Saved from Studio",
    note: clean(note, 1000),
    savedAt,
    savedBy: actor.name,
    experience: parseExperience(input.experience),
    project: parseStudioProject(input.project),
    assetManifest: parseAssetManifest(input.assetManifest),
    interactionGraph: parseInteractionGraph(input.interactionGraph),
  };
}

function parseSnapshot(input: unknown): VaultSnapshot {
  if (!input || typeof input !== "object") throw new Error("Vault snapshot is invalid");
  const value = input as Record<string, unknown>;
  if (value.version !== 1 || typeof value.versionId !== "string" || typeof value.label !== "string" || typeof value.note !== "string" || typeof value.savedAt !== "string" || typeof value.savedBy !== "string") throw new Error("Vault snapshot metadata is invalid");
  return {
    version: 1,
    versionId: value.versionId,
    label: clean(value.label, 120),
    note: clean(value.note, 1000),
    savedAt: new Date(value.savedAt).toISOString(),
    savedBy: clean(value.savedBy, 100),
    experience: parseExperience(value.experience),
    project: parseStudioProject(value.project),
    assetManifest: parseAssetManifest(value.assetManifest),
    interactionGraph: parseInteractionGraph(value.interactionGraph),
  };
}

function journalEvent(actor: VaultActor, action: VaultJournalEvent["action"], detail: string): VaultJournalEvent {
  return vaultJournalEventSchema.parse({ id: `e-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, at: new Date().toISOString(), actor: actor.name, role: actor.role, action, detail: clean(detail, 1000) });
}

function clean(value: string, max: number) { return value.replace(/[<>\u0000-\u001f]/g, " ").trim().slice(0, max); }
function assertProjectId(value: string) { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error("Invalid Forge Vault project id"); }
function assertVersionId(value: string) { if (!/^v-[a-zA-Z0-9-]+$/.test(value)) throw new Error("Invalid Forge Vault version id"); }

function vaultGithub(environment: NodeJS.ProcessEnv) {
  const repository = environment.FORGE_GITHUB_REPOSITORY ?? "";
  const token = environment.FORGE_GITHUB_TOKEN ?? "";
  const branch = environment.FORGE_VAULT_BRANCH || "forge-vault";
  const baseBranch = environment.FORGE_VAULT_BASE_BRANCH || "main";
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) throw new Error("Forge Vault requires FORGE_GITHUB_REPOSITORY and FORGE_GITHUB_TOKEN");
  if (!/^[A-Za-z0-9._-]+$/.test(branch) || !/^[A-Za-z0-9._/-]+$/.test(baseBranch)) throw new Error("Forge Vault branch configuration is invalid");
  const api = `https://api.github.com/repos/${repository}`;
  const headers = { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "content-type": "application/json", "x-github-api-version": "2022-11-28" };

  const request = async <T>(path: string, init?: RequestInit, allow404 = false): Promise<T | null> => {
    const response = await fetch(api + path, { ...init, headers: { ...headers, ...init?.headers }, cache: "no-store" });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`Forge Vault GitHub request failed (${response.status}): ${(await response.text()).slice(0, 240)}`);
    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  };

  const ensureBranch = async () => {
    const existing = await request<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(branch)}`, undefined, true);
    if (existing) return existing.object.sha;
    const base = await request<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(baseBranch)}`);
    if (!base) throw new Error("Forge Vault base branch was not found");
    await request("/git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }) });
    return base.object.sha;
  };

  return {
    async readJson<T>(filePath: string, fallback: T): Promise<T> {
      await ensureBranch();
      const response = await request<{ content: string; encoding: string }>(`/contents/${filePath}?ref=${encodeURIComponent(branch)}`, undefined, true);
      if (!response) return fallback;
      if (response.encoding !== "base64") throw new Error("Forge Vault received unsupported GitHub content encoding");
      return JSON.parse(Buffer.from(response.content.replace(/\n/g, ""), "base64").toString("utf8")) as T;
    },
    async commitFiles(files: Record<string, unknown>, message: string) {
      const parentSha = await ensureBranch();
      const commit = await request<{ tree: { sha: string } }>(`/git/commits/${parentSha}`);
      if (!commit) throw new Error("Forge Vault could not read the branch head");
      const entries = [];
      for (const [filePath, value] of Object.entries(files)) {
        const content = JSON.stringify(value, null, 2) + "\n";
        if (Buffer.byteLength(content) > 900_000) throw new Error(`Forge Vault file exceeds the 900 KB durable snapshot limit: ${filePath}`);
        const blob = await request<{ sha: string }>("/git/blobs", { method: "POST", body: JSON.stringify({ content: Buffer.from(content).toString("base64"), encoding: "base64" }) });
        if (!blob) throw new Error("Forge Vault could not create a Git blob");
        entries.push({ path: filePath, mode: "100644", type: "blob", sha: blob.sha });
      }
      const tree = await request<{ sha: string }>("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: entries }) });
      if (!tree) throw new Error("Forge Vault could not create a Git tree");
      const next = await request<{ sha: string }>("/git/commits", { method: "POST", body: JSON.stringify({ message: clean(message, 180), tree: tree.sha, parents: [parentSha] }) });
      if (!next) throw new Error("Forge Vault could not create a commit");
      await request(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: JSON.stringify({ sha: next.sha, force: false }) });
      return next.sha;
    },
  };
}
