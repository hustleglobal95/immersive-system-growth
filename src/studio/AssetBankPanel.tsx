"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { bankKinds, type BankAsset, type SceneKit } from "@/src/platform/assetBankSchema";
import { addBankFiles, insertBankAsset } from "@/src/platform/assetBank";
import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";
import type { InteractionGraph } from "@/src/lib/interactionGraph";
import { downloadJson } from "@/src/studio/useStudioDraft";
import styles from "./AssetBankPanel.module.css";

const ModelPreview = dynamic(() => import("./AssetBankPreview").then((m) => m.AssetBankPreview), { ssr: false });
const KitPreview = dynamic(() => import("./StudioLivePreview").then((m) => m.StudioLivePreview), { ssr: false });
type Results = { total: number; catalogTotal: number; page: number; limit: number; facets: { industries: string[]; providers: string[] }; items: BankAsset[]; kits: SceneKit[] };

export function AssetBankPanel({ experience, setExperience, assetManifest, setAssetManifest, interactionGraph, undo, canUndo }: {
  experience: ExperienceConfig; setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  assetManifest: AssetManifest; setAssetManifest: Dispatch<SetStateAction<AssetManifest>>;
  interactionGraph: InteractionGraph; undo: () => void; canUndo: boolean;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [industry, setIndustry] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<BankAsset | null>(null);
  const [sceneId, setSceneId] = useState(experience.scenes[0].id);
  const [preview, setPreview] = useState(false);
  const [kit, setKit] = useState<{ kit: SceneKit; experience: ExperienceConfig; assets: BankAsset[] } | null>(null);
  const kitRequest = useRef(0);
  const [kitActive, setKitActive] = useState(0);
  const [shortlist, setShortlist] = useState<BankAsset[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ q, page: String(page), limit: "24" });
        for (const [key, value] of Object.entries({ kind, status, provider, industry })) if (value) params.set(key, value);
        const response = await fetch("/api/asset-bank?" + params, { signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Catalog request failed");
        if (!controller.signal.aborted) setResults(data);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Catalog unavailable"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, kind, status, provider, industry, page]);

  const select = (asset: BankAsset) => { kitRequest.current++; setSelected(asset); setPreview(false); setKit(null); setMessage(""); };
  const loadKit = async (id: string) => {
    const request = ++kitRequest.current;
    setMessage("Loading scene kit…"); setSelected(null); setKit(null); setPreview(false);
    try {
      const response = await fetch("/api/asset-bank?kit=" + encodeURIComponent(id));
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (request !== kitRequest.current) return;
      setKit({ kit: data.kit, experience: parseExperience(data.experience), assets: data.assets }); setKitActive(0); setMessage("");
    } catch (e) { if (request === kitRequest.current) setMessage(e instanceof Error ? e.message : "Kit unavailable"); }
  };
  const insert = () => {
    if (!selected) return;
    try {
      const result = insertBankAsset(selected, experience, assetManifest, sceneId);
      setExperience(result.experience); setAssetManifest(result.assetManifest);
      setMessage(`${selected.title} added to ${sceneId}. Open Preview to position and review it.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot insert asset"); }
  };
  const applyKit = () => {
    if (!kit) return;
    const ids = new Set(kit.experience.scenes.map((s) => s.id));
    const missing = interactionGraph.nodes.filter((n) => n.kind === "trigger" && n.sceneId && !ids.has(n.sceneId));
    if (missing.length) { setMessage("Existing interactions reference scenes outside this kit. Export the kit for a new project, or update those interactions first."); return; }
    try {
      const nextManifest = addBankFiles(kit.assets, assetManifest);
      setExperience(parseExperience(kit.experience)); setAssetManifest(nextManifest); setSceneId(kit.experience.scenes[0].id);
      setMessage("Reference kit applied. Undo restores your prior experience. Review all concept copy before publishing.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Cannot apply kit"); }
  };
  const selectedFile = selected?.files.find((f) => f.role === "runtime");
  return <section className={`studio-card ${styles.bank}`} aria-labelledby="bank-heading">
    <div className={styles.heading}><div><span>PRODUCTION LIBRARY</span><h2 id="bank-heading">Asset bank</h2><p>Find sources, inspect prepared assets, and explore coordinated scene kits.</p></div><div><strong>{results?.catalogTotal.toLocaleString() ?? "…"}</strong><small>catalog entries</small></div></div>
    <div className={styles.filters}>
      <label>Search assets<input type="search" value={q} maxLength={200} placeholder="Wood, studio, chair, kitchen…" onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
      <label>Asset type<select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">All types</option>{bankKinds.map((k) => <option key={k}>{k}</option>)}</select></label>
      <label>Preparation<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All stages</option><option value="source">Needs preparation</option><option value="prepared">Client approved</option><option value="reference">Reference fixtures</option></select></label>
      <label>Provider<select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}><option value="">All providers</option>{results?.facets.providers.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label>Industry<select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }}><option value="">All / unclassified</option>{results?.facets.industries.map((p) => <option key={p}>{p}</option>)}</select></label>
    </div>
    <div className={styles.toolbar}><p role="status">{loading ? "Searching…" : `${results?.total ?? 0} matching entries`}</p><button type="button" disabled={!shortlist.length} onClick={() => downloadJson("asset-bank-selection.json", { version: 1, assets: shortlist, kits: [] })}>Export shortlist ({shortlist.length})</button><button type="button" disabled={!canUndo} onClick={undo}>Undo experience change</button></div>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status" className="studio-message">{message}</p>}
    <div className={styles.layout}>
      <div>
        <div className={styles.grid} aria-busy={loading}>{!loading && !error && results?.items.map((asset) => <button type="button" className={styles.tile} key={asset.id} aria-pressed={selected?.id === asset.id} onClick={() => select(asset)}>
          <div className={styles.thumb}>{asset.thumbnail ? <Thumb src={asset.thumbnail} alt={asset.title} /> : <span>{asset.kind.toUpperCase()}<small>Open to inspect</small></span>}</div>
          <strong>{asset.title}</strong><small>{asset.provider} · {asset.kind}</small><span className={styles.badge}>{asset.status === "source" ? "Needs preparation" : asset.status === "reference" ? "Reference fixture" : "Client approved"}</span>
        </button>)}</div>
        {!loading && results?.total === 0 && <p>No matching assets. Try fewer filters.</p>}
        <div className={styles.toolbar}><button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous page</button><span>Page {page} of {Math.max(1, Math.ceil((results?.total ?? 0) / 24))}</span><button type="button" disabled={loading || page * 24 >= (results?.total ?? 0)} onClick={() => setPage(page + 1)}>Next page</button></div>
      </div>
      <aside className={styles.detail} aria-label="Asset details">
        {selected ? <><h3>{selected.title}</h3><p>{selected.description}</p><p>{selected.authors.join(", ")}</p><a href={selected.sourceUrl} target="_blank" rel="noreferrer">View original source</a><p><a href={selected.license.url} target="_blank" rel="noreferrer">{selected.license.id}</a></p><small>{selected.license.attribution}</small>
          <dl>{selected.metadata.triangles !== undefined && <><dt>Verified triangles</dt><dd>{selected.metadata.triangles.toLocaleString()}</dd></>}{selected.metadata.sourcePolycount !== undefined && <><dt>Provider polygon count</dt><dd>{selected.metadata.sourcePolycount.toLocaleString()}</dd></>}{selected.metadata.resolution && <><dt>Source resolution</dt><dd>{selected.metadata.resolution.join(" × ")}</dd></>}</dl>
          {selected.files.map((file) => <p key={file.role}><strong>{file.role}</strong> · {file.format} · {(file.bytes / 1024).toFixed(0)} KiB</p>)}
          {selected.approval && <p>Reviewed by {selected.approval.by} · {selected.approval.date} · {selected.approval.scope}</p>}
          <button type="button" onClick={() => setShortlist((items) => items.some((a) => a.id === selected.id) ? items.filter((a) => a.id !== selected.id) : [...items, selected])}>{shortlist.some((a) => a.id === selected.id) ? "Remove from shortlist" : "Add to shortlist"}</button>
          {selected.kind === "model" && selectedFile && <><button type="button" onClick={() => setPreview(!preview)}>{preview ? "Close 3D preview" : "Open 3D preview"}</button>{preview && <ModelPreview key={selected.id} url={selectedFile.url} />}</>}
          {selected.status === "source" ? <p>Source listing only. Download from the provider, optimize, then use bank:prepare to register verified runtime files.</p> : <><label>Destination scene<select value={sceneId} onChange={(e) => setSceneId(e.target.value)}>{experience.scenes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label><button type="button" className="studio-primary" disabled={!["model", "image", "video"].includes(selected.kind)} onClick={insert}>Insert asset into scene</button><small>Model insertion adds a scene object. It does not replace the persistent hero or its rig.</small></>}
          {!!selected.metadata.nodes?.length && <details><summary>{selected.metadata.nodes.length} inspected nodes</summary><ul>{selected.metadata.nodes.map((node, i) => <li key={i}>{node}</li>)}</ul></details>}
        </> : <><h3>Inspect an asset</h3><p>Select a card to see its source, license, preparation status and available variants.</p><p>Source entries need optimization and runtime verification. Reference fixtures support layout and motion development.</p></>}
      </aside>
    </div>
    <h3>Coordinated reference kits</h3><div className={styles.kits}>{results?.kits.map((item) => <article key={item.id}><small>{item.industry} · reference</small><h4>{item.title}</h4><p>{item.description}</p><button type="button" onClick={() => void loadKit(item.id)}>Review {item.industry} kit</button></article>)}</div>
    {kit && <div className={styles.kitReview}><h3>Review: {kit.kit.title}</h3><p>{kit.kit.artDirection}</p><p>Applying this kit replaces {experience.scenes.length} current scenes with {kit.experience.scenes.length} reference scenes, including camera, lighting, model and concept copy.</p><button type="button" onClick={() => setPreview(!preview)}>{preview ? "Close kit preview" : "Preview kit"}</button><button type="button" onClick={() => downloadJson(kit.kit.recipe + ".json", kit.experience)}>Export kit experience</button><button type="button" onClick={applyKit}>Apply reviewed kit</button>{preview && <KitPreview key={kit.kit.id} experience={kit.experience} active={kitActive} setActive={setKitActive} />}</div>}
    <p className={styles.credit}>Source catalog: <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Powered by Poly Haven</a>. Prepared files are staged separately. Shortlists remain in this workspace until exported.</p>
  </section>;
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  // Provider thumbnails are not proxied, downloaded or promoted to client artwork.
  // eslint-disable-next-line @next/next/no-img-element
  return failed ? <span>Preview unavailable</span> : <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
