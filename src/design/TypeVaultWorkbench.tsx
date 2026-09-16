"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fontCatalog, fontMoods, fontPairings, type FontCategory, type FontMood } from "./catalog";

type RemoteFont = {
  id: string;
  name: string;
  category: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  variable: boolean;
  source: string;
  license: string;
};

const categoryMap: Record<string, FontCategory> = {
  serif: "Serif",
  "sans-serif": "Sans",
  display: "Display",
  monospace: "Mono",
  handwriting: "Script",
};

const foundries = [
  { name: "Fontsource", count: "Full live catalog", license: "Open-source packages; verify per-family license", url: "https://fontsource.org/fonts" },
  { name: "Fontshare", count: "100+ families", license: "Free personal + commercial; ITF FFL or OFL", url: "https://www.fontshare.com/" },
  { name: "Collletttivo", count: "16 families", license: "SIL OFL", url: "https://www.collletttivo.it/typefaces" },
  { name: "League of Moveable Type", count: "Curated catalog", license: "Open-source / SIL OFL", url: "https://www.theleagueofmoveabletype.com/" },
  { name: "Google Fonts", count: "Large open catalog", license: "Open licenses, family-specific", url: "https://fonts.google.com/" },
];

const specialCollections = [
  { name: "Collletttivo", fonts: ["Borges", "Ronzino", "Aujournuit", "Absans", "Mazius Display", "Ribes", "Mattone", "Coconat", "Sinistre", "Apfel Grotezk", "Ortica", "Messapia", "Halibut", "Sprat", "Sneaky Times", "Necto Mono"] },
  { name: "League of Moveable Type", fonts: ["The Neue Black", "Blackout", "Chunk", "Fanwood", "Goudy Bookletter 1911", "Junction", "Knewave", "League Gothic", "League Mono", "League Script", "League Spartan", "Linden Hill", "Orbitron", "Ostrich Sans", "Prociono", "Raleway", "Sniglet", "Sorts Mill Goudy"] },
];

export function TypeVaultWorkbench() {
  const [remote, setRemote] = useState<RemoteFont[]>([]);
  const [remoteStatus, setRemoteStatus] = useState("Loading full Fontsource catalog…");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "All">("All");
  const [mood, setMood] = useState<FontMood | "All">("All");
  const [source, setSource] = useState<"All" | "Curated" | "Fontsource">("All");

  useEffect(() => {
    fetch("/api/type-vault")
      .then((r) => r.json())
      .then((data: { count?: number; fonts?: RemoteFont[]; warning?: string }) => {
        setRemote(data.fonts ?? []);
        setRemoteStatus(data.count ? `${data.count.toLocaleString()} Fontsource families available` : data.warning ?? "Using curated fallback");
      })
      .catch(() => setRemoteStatus("Using curated fallback"));
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const curated = fontCatalog.map((font) => ({
      id: font.id,
      name: font.name,
      category: font.category,
      sourceKind: "Curated" as const,
      source: font.source,
      variable: font.variable ?? false,
      detail: `${font.use} ${font.moods.join(" ")} ${font.roles.join(" ")} ${font.tags.join(" ")}`,
      moods: font.moods,
      license: font.bundled ? "Locally bundled" : "Reference",
    }));
    const live = remote.map((font) => ({
      id: `fs-${font.id}`,
      name: font.name,
      category: categoryMap[font.category] ?? "Sans",
      sourceKind: "Fontsource" as const,
      source: font.source,
      variable: font.variable,
      detail: `${font.category} ${font.subsets.join(" ")} ${font.weights.join(" ")} ${font.styles.join(" ")}`,
      moods: [] as FontMood[],
      license: font.license,
    }));
    const seen = new Set<string>();
    return [...curated, ...live].filter((font) => {
      const key = font.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      if (source !== "All" && font.sourceKind !== source) return false;
      if (category !== "All" && font.category !== category) return false;
      if (mood !== "All" && font.sourceKind === "Curated" && !font.moods.includes(mood)) return false;
      if (mood !== "All" && font.sourceKind === "Fontsource") return false;
      return !needle || `${font.name} ${font.detail} ${font.category}`.toLowerCase().includes(needle);
    });
  }, [remote, query, category, mood, source]);

  return <main className="tv-root">
    <header className="tv-topbar">
      <Link href="/design">← Design Atelier</Link>
      <strong>FORGE / TYPE VAULT</strong>
      <span>{remoteStatus}</span>
    </header>

    <section className="tv-hero">
      <p className="tv-kicker">Typography infrastructure</p>
      <h1>Fonts without a ceiling.</h1>
      <p>Curated art direction on top of a live open-font index. Search by family, category, language coverage, weight support, mood or use case—without shipping the whole library to client sites.</p>
    </section>

    <section className="tv-foundries" aria-label="Font sources">
      {foundries.map((item) => <article key={item.name}><h2>{item.name}</h2><p>{item.count}</p><p>{item.license}</p><a href={item.url} target="_blank" rel="noreferrer">Open source ↗</a></article>)}
    </section>

    <section className="tv-pairings">
      <div><p className="tv-kicker">Curated systems</p><h2>{fontPairings.length} ready-made pairings</h2></div>
      <div className="tv-pairing-grid">{fontPairings.map((pair) => <article key={pair.id}><p>{pair.name}</p><strong>{pair.display}</strong><span> + {pair.body}{pair.accent ? ` + ${pair.accent}` : ""}</span><small>{pair.use}</small></article>)}</div>
    </section>

    <section className="tv-special">
      {specialCollections.map((collection) => <article key={collection.name}><p className="tv-kicker">{collection.name}</p><p>{collection.fonts.join(" · ")}</p></article>)}
    </section>

    <section className="tv-browser">
      <div className="tv-controls">
        <label>Search<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="luxury, Arabic, variable, automotive…" /></label>
        <label>Category<select value={category} onChange={(e) => setCategory(e.target.value as FontCategory | "All")}><option>All</option><option>Serif</option><option>Sans</option><option>Display</option><option>Mono</option><option>Script</option></select></label>
        <label>Mood<select value={mood} onChange={(e) => setMood(e.target.value as FontMood | "All")}>{fontMoods.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Source<select value={source} onChange={(e) => setSource(e.target.value as typeof source)}><option>All</option><option>Curated</option><option>Fontsource</option></select></label>
      </div>
      <p className="tv-count">{rows.length.toLocaleString()} matching families</p>
      <div className="tv-list">{rows.slice(0, 500).map((font) => <article key={font.id}><div><strong>{font.name}</strong><span>{font.category} · {font.sourceKind}{font.variable ? " · Variable" : ""}</span></div><p>{font.detail}</p><footer><span>{font.license}</span><a href={font.source} target="_blank" rel="noreferrer">Source ↗</a></footer></article>)}</div>
      {rows.length > 500 && <p className="tv-limit">Showing the first 500 matches. Narrow the search to inspect the rest.</p>}
    </section>
  </main>;
}
