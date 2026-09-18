"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { readSearch, useClientValue } from "@/src/lib/useClientValue";
import Link from "next/link";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { preferredAssetProvider, type AssetGenerationStatus, type AssetGenerationTicket, type ForgeAssetType } from "@/src/platform/assetGeneration";
import { replaceScene } from "@/src/platform/studioPresets";
import { useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest, AssetManifestEntry } from "@/src/types/assets";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialManifest = rawAssetManifest as AssetManifest;
const initialGraph = parseInteractionGraph(rawInteractionGraph);
const supportedTypes: ForgeAssetType[] = ["model", "image", "video", "texture", "ui"];

export function AssetCreationWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialManifest, initialGraph);
  const [name, setName] = useState("hero-environment.webp");
  const [type, setType] = useState<ForgeAssetType>("image");
  const [reason, setReason] = useState("Create the missing visual asset needed to complete this scene.");
  const [priority, setPriority] = useState("supporting");
  const [prompt, setPrompt] = useState("Cinematic premium environment plate with strong foreground, midground and background separation, realistic materials, restrained lighting, no text.");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [ticket, setTicket] = useState<AssetGenerationTicket | null>(null);
  const [status, setStatus] = useState<AssetGenerationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [installed, setInstalled] = useState(false);
  const refineStarted = useRef(false);

  // An asset gap hands this workspace its brief in the URL. Read it during render and apply it
  // once, rather than rendering empty fields and then filling them from an effect.
  const search = useClientValue(readSearch, "");
  const [seededFrom, setSeededFrom] = useState(search);
  if (seededFrom !== search) {
    setSeededFrom(search);
    const params = new URLSearchParams(search);
    const nextName = params.get("asset");
    const nextType = params.get("type") as ForgeAssetType | null;
    const nextReason = params.get("reason");
    const nextPriority = params.get("priority");
    const nextScene = Number(params.get("scene") ?? 0);
    if (nextName) setName(nextName.slice(0, 140));
    if (nextType && ["model", "image", "video", "texture", "hdri", "audio", "ui", "copy"].includes(nextType)) setType(nextType);
    if (nextReason) setReason(nextReason.slice(0, 800));
    if (nextPriority) setPriority(nextPriority.slice(0, 40));
    if (Number.isInteger(nextScene) && nextScene >= 0) setSceneIndex(Math.min(nextScene, initialExperience.scenes.length - 1));
    const seededPrompt = params.get("prompt");
    if (seededPrompt) setPrompt(seededPrompt.slice(0, 4000));
    else if (nextName || nextReason) setPrompt(buildPrompt(nextName ?? name, nextType ?? type, nextReason ?? reason));
  }

  const provider = preferredAssetProvider(type);
  const providerLabel = provider === "meshy" ? "Meshy" : provider?.startsWith("higgsfield") ? "Higgsfield" : "Not connected";
  const scene = draft.experience.scenes[Math.min(sceneIndex, draft.experience.scenes.length - 1)];
  const canGenerate = Boolean(provider) && prompt.trim().length >= 8 && !busy;

  const submit = async (action: "submit" | "refine", taskId?: string) => {
    setBusy(true);
    setMessage(action === "refine" ? "Preparing production-quality 3D asset…" : `Sending this asset to ${providerLabel}…`);
    setInstalled(false);
    try {
      const response = await fetch("/api/studio/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, name, type, prompt, taskId }),
      });
      const data = await response.json() as { ok?: boolean; ticket?: AssetGenerationTicket; error?: string };
      if (!response.ok || !data.ok || !data.ticket) throw new Error(data.error || "Asset generation did not start.");
      setTicket(data.ticket);
      setStatus(null);
      setMessage(data.ticket.message);
      if (action === "submit") refineStarted.current = false;
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Asset generation failed to start.");
    }
  };

  useEffect(() => {
    if (!ticket) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const query = new URLSearchParams({ provider: ticket.provider, taskId: ticket.taskId, phase: ticket.phase });
        const response = await fetch(`/api/studio/assets/generate?${query.toString()}`, { cache: "no-store" });
        const data = await response.json() as { ok?: boolean; status?: AssetGenerationStatus; error?: string };
        if (!response.ok || !data.ok || !data.status) throw new Error(data.error || "Could not read generation status.");
        if (cancelled) return;
        setStatus(data.status);
        if (data.status.status === "failed" || data.status.status === "canceled") {
          setBusy(false);
          setMessage(data.status.error || `Generation ${data.status.status}.`);
          return;
        }
        if (data.status.status === "succeeded") {
          if (ticket.provider === "meshy" && ticket.phase === "preview" && !refineStarted.current) {
            refineStarted.current = true;
            setMessage("Geometry preview approved automatically. Forge is asking Meshy for the textured production GLB…");
            await submit("refine", ticket.taskId);
            return;
          }
          setBusy(false);
          setMessage("Asset ready. Use it in the current Forge draft or generate another direction.");
          return;
        }
        timer = window.setTimeout(poll, 3500);
      } catch (error) {
        if (cancelled) return;
        setBusy(false);
        setMessage(error instanceof Error ? error.message : "Asset generation status failed.");
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  // submit is intentionally not a dependency; a new ticket restarts polling.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  const generatedPath = useMemo(() => {
    if (!ticket || status?.status !== "succeeded") return "";
    return `/api/studio/assets/generated-file/${encodeURIComponent(ticket.provider)}/${encodeURIComponent(ticket.taskId)}/${ticket.phase}/${type}`;
  }, [status?.status, ticket, type]);

  const install = async () => {
    if (!generatedPath) return;
    setBusy(true);
    setMessage("Bringing the generated asset into the active Forge draft…");
    try {
      const response = await fetch(generatedPath, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Generated asset could not be loaded into Forge.");
      }
      const blob = await response.blob();
      const sha256 = await hashBlob(blob);
      const record: AssetManifestEntry = { path: generatedPath, bytes: blob.size, sha256 };
      const group = type === "model" ? "models" : type === "video" ? "video" : "textures";
      draft.setAssetManifest((current) => ({ ...current, [group]: [...current[group].filter((item) => item.path !== generatedPath), record] }));
      if (type === "model") {
        draft.setExperience((current) => parseExperience({ ...current, heroModel: generatedPath, heroVisible: true }));
      } else {
        draft.setExperience((current) => {
          const active = Math.min(sceneIndex, current.scenes.length - 1);
          const target = current.scenes[active];
          const media = type === "video"
            ? { kind: "video" as const, src: generatedPath, poster: "/textures/reference/reveal-field.svg", alt: name, transition: "dissolve" as const, maskSoftness: 18, layers: [], position: [50, 50] as [number, number], mobilePosition: [50, 50] as [number, number], overlap: .25, direction: "up" as const, zoom: 1.05, textEnd: .28 }
            : { kind: "image" as const, src: generatedPath, alt: name, transition: "dissolve" as const, maskSoftness: 18, layers: [], position: [50, 50] as [number, number], mobilePosition: [50, 50] as [number, number], overlap: .25, direction: "up" as const, zoom: 1.05, textEnd: .28 };
          return parseExperience(replaceScene(current, active, { ...target, media }));
        });
      }
      setInstalled(true);
      setMessage(`${name} is now registered in the draft${type === "model" ? " and assigned as the hero model" : ` and assigned to ${scene?.label ?? "the selected scene"}`}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generated asset could not be installed.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="asset-creator">
    <header className="asset-creator__topbar">
      <div><Link href="/studio">FORGE</Link><strong>Asset Creator</strong></div>
      <nav><Link href="/studio/agent">Creative Agent</Link><Link href="/studio">Studio</Link></nav>
    </header>

    <section className="asset-creator__layout">
      <aside className="asset-creator__brief">
        <span>ASSET REQUEST</span>
        <h1>Create the missing production asset without leaving Forge.</h1>
        <p>The Creative Agent can hand a scene requirement directly here. Forge selects the connected generation path, tracks the job, and can place the finished result into the active draft.</p>
        <label>Asset name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Asset type<select value={type} onChange={(event) => setType(event.target.value as ForgeAssetType)}>{["model", "image", "video", "texture", "ui", "hdri", "audio"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Why it exists<textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="asset-creator__meta"><span>Priority<strong>{priority}</strong></span><span>Scene<strong>{scene?.label ?? "Project-wide"}</strong></span><span>Generator<strong>{providerLabel}</strong></span></div>
      </aside>

      <section className="asset-creator__stage">
        <div className="asset-creator__statusline">
          <span>PRODUCTION PATH</span>
          <strong>{provider ? `${providerLabel} → Forge draft` : `${type.toUpperCase()} needs a supported generator or manual import`}</strong>
        </div>
        <article className="asset-creator__prompt">
          <header><div><span>GENERATION BRIEF</span><h2>{name}</h2></div><button type="button" onClick={() => setPrompt(buildPrompt(name, type, reason))}>Rewrite from requirement</button></header>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          {!provider && <p className="asset-creator__warning">Forge currently creates 3D models with Meshy and images/video with Higgsfield. HDRI and audio remain import-only so Forge does not pretend a normal image/audio request is production-ready for those roles.</p>}
          <button className="asset-creator__generate" type="button" disabled={!canGenerate} onClick={() => void submit("submit")}>{busy ? "Creating…" : provider ? `Create with ${providerLabel}` : "Generator not connected for this type"}</button>
        </article>

        <section className="asset-creator__progress">
          <div><span>STATE</span><strong>{status?.status ?? (ticket ? "submitted" : "waiting")}</strong></div>
          <div><span>PROGRESS</span><strong>{status?.progress != null ? `${Math.round(status.progress)}%` : "—"}</strong></div>
          <div><span>PHASE</span><strong>{ticket?.phase ?? "—"}</strong></div>
          <div><span>PROVIDER</span><strong>{ticket?.provider ?? providerLabel}</strong></div>
        </section>

        {message && <p className="asset-creator__message" role="status">{message}</p>}

        {status?.previewUrl && <section className="asset-creator__result"><span>PREVIEW</span><img src={status.previewUrl} alt={`${name} generated preview`} /></section>}
        {status?.status === "succeeded" && <section className="asset-creator__ready">
          <div><span>ASSET READY</span><h3>Put it into the project.</h3><p>Forge will register the generated file in the local draft manifest and assign it to the selected scene or hero model. Generated provider files should still be promoted to permanent project storage before final publishing.</p></div>
          <div><button type="button" className="asset-creator__generate" disabled={busy || installed} onClick={() => void install()}>{installed ? "Added to Forge" : "Use in current project"}</button><button type="button" onClick={() => { setTicket(null); setStatus(null); setInstalled(false); setMessage(""); refineStarted.current = false; }}>Generate another</button></div>
        </section>}

        <section className="asset-creator__providers">
          <article><span>3D</span><strong>Meshy</strong><p>Text → geometry preview → automatic PBR refine → GLB → Forge draft.</p></article>
          <article><span>IMAGE</span><strong>Higgsfield</strong><p>Production brief → 2K image generation → Forge scene media.</p></article>
          <article><span>VIDEO</span><strong>Higgsfield</strong><p>Production brief → cinematic 5-second generation → Forge scene media.</p></article>
        </section>
      </section>
    </section>
  </main>;
}

function buildPrompt(name: string, type: ForgeAssetType, reason: string) {
  const role = type === "model" ? "production-ready 3D asset" : type === "video" ? "cinematic website video asset" : "high-end cinematic website image asset";
  return `Create a ${role} named ${name}. Purpose: ${reason} Preserve premium art direction, believable scale and materials, clean composition, and enough visual clarity for camera movement and responsive web presentation. Avoid decorative clutter, text, logos and generic stock imagery.`;
}

async function hashBlob(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
