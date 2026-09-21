"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fontCatalog,
  fontMoods,
  fontPairings,
  type FontCategory,
  type FontMood,
  type FontRole,
} from "./catalog";
import {
  premiumLibraries,
  premiumFoundries,
  premiumSignatureFamilyCount,
  premiumTypeSources,
  type PremiumAccess,
  type PremiumSourceKind,
} from "./premiumTypeNetwork";

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

type SourceKind = "All" | "Curated" | "Fontsource";
type SortMode = "Featured" | "A-Z" | "Variable first";
type Coverage = "All" | "latin" | "latin-ext" | "cyrillic" | "greek" | "vietnamese" | "arabic" | "hebrew" | "devanagari" | "thai";

const categoryMap: Record<string, FontCategory> = {
  serif: "Serif",
  "sans-serif": "Sans",
  display: "Display",
  monospace: "Mono",
  handwriting: "Script",
};

const categories: Array<FontCategory | "All"> = ["All", "Serif", "Sans", "Display", "Mono", "Script"];
const roles: Array<FontRole | "All"> = ["All", "Display", "Body", "UI", "Label", "Editorial", "Accent"];
const coverageOptions: Coverage[] = ["All", "latin", "latin-ext", "cyrillic", "greek", "vietnamese", "arabic", "hebrew", "devanagari", "thai"];

const foundries = [
  { name: "Fontsource", count: "Full live catalog", license: "Open-source packages; verify per-family license", url: "https://fontsource.org/fonts" },
  { name: "Fontshare", count: "100+ families", license: "Free personal + commercial; verify family license", url: "https://www.fontshare.com/" },
  { name: "Collletttivo", count: "Independent collection", license: "Open-license families", url: "https://www.collletttivo.it/typefaces" },
  { name: "League of Moveable Type", count: "Curated collection", license: "Open-source families", url: "https://www.theleagueofmoveabletype.com/" },
  { name: "Google Fonts", count: "Large open catalog", license: "Open licenses, family-specific", url: "https://fonts.google.com/" },
];

const specialCollections = [
  { name: "Collletttivo", note: "Independent display, editorial and experimental references.", fonts: ["Borges", "Ronzino", "Aujournuit", "Absans", "Mazius Display", "Ribes", "Mattone", "Coconat", "Sinistre", "Apfel Grotezk", "Ortica", "Messapia", "Halibut", "Sprat", "Sneaky Times", "Necto Mono"] },
  { name: "League of Moveable Type", note: "Open classics spanning grotesk, mono, script and display.", fonts: ["The Neue Black", "Blackout", "Chunk", "Fanwood", "Goudy Bookletter 1911", "Junction", "Knewave", "League Gothic", "League Mono", "League Script", "League Spartan", "Linden Hill", "Orbitron", "Ostrich Sans", "Prociono", "Raleway", "Sniglet", "Sorts Mill Goudy"] },
];

const additionalPairings = [
  { id: "art-book", name: "Art Book", display: "Cormorant", body: "Schibsted Grotesk", accent: "DM Mono", use: "Art books, galleries, cultural launches and collector-facing editorial.", moods: ["Editorial", "Experimental"] as FontMood[] },
  { id: "precision-luxury", name: "Precision Luxury", display: "Prata", body: "Manrope", accent: "IBM Plex Mono", use: "Watches, jewelry, engineered luxury and premium product storytelling.", moods: ["Luxury", "Technical"] as FontMood[] },
  { id: "resort-modern", name: "Resort Modern", display: "Newsreader", body: "Plus Jakarta Sans", use: "Resorts, destinations and premium travel experiences.", moods: ["Warm", "Luxury"] as FontMood[] },
  { id: "industrial-culture", name: "Industrial Culture", display: "Archivo", body: "Source Serif 4", accent: "Azeret Mono", use: "Architecture, industrial design and culture-led technology.", moods: ["Bold", "Editorial"] as FontMood[] },
  { id: "soft-product", name: "Soft Product", display: "Onest", body: "DM Sans", use: "Consumer software, wellness, modern services and approachable technology.", moods: ["Modern", "Warm"] as FontMood[] },
  { id: "museum-modern", name: "Museum Modern", display: "Instrument Sans", body: "Spectral", accent: "Fragment Mono", use: "Museums, institutions and contemporary cultural programs.", moods: ["Editorial", "Modern"] as FontMood[] },
  { id: "night-drive", name: "Night Drive", display: "Titillium Web", body: "Barlow", accent: "JetBrains Mono", use: "Automotive, motorsport, mobility and technical product launches.", moods: ["Technical", "Bold"] as FontMood[] },
  { id: "fashion-editorial", name: "Fashion Editorial", display: "Italiana", body: "Newsreader", accent: "Instrument Sans", use: "Fashion houses, fragrance, jewelry and luxury campaigns.", moods: ["Luxury", "Editorial"] as FontMood[] },
  { id: "future-cultural", name: "Future Cultural", display: "Syne", body: "Source Sans 3", accent: "Space Mono", use: "Creative technology, festivals and experimental cultural work.", moods: ["Experimental", "Bold"] as FontMood[] },
  { id: "heritage-hospitality", name: "Heritage Hospitality", display: "Libre Caslon Display", body: "Alegreya Sans", use: "Historic hotels, private clubs, wine and legacy destinations.", moods: ["Classic", "Warm"] as FontMood[] },
  { id: "research-system", name: "Research System", display: "IBM Plex Sans Condensed", body: "Literata", accent: "IBM Plex Mono", use: "Research, science, data-rich storytelling and institutional technology.", moods: ["Technical", "Editorial"] as FontMood[] },
  { id: "creative-commerce", name: "Creative Commerce", display: "Unbounded", body: "Figtree", use: "Fashion commerce, creator brands and expressive product launches.", moods: ["Bold", "Modern"] as FontMood[] },
];

const territories = [
  { label: "Quiet luxury", query: "luxury", note: "High-contrast serif, restraint, premium space." },
  { label: "Editorial", query: "editorial", note: "Publication rhythm, narrative authority, culture." },
  { label: "Automotive", query: "automotive", note: "Condensed, technical, engineered, kinetic." },
  { label: "Technical", query: "technical", note: "UI precision, data, mono accents, product systems." },
  { label: "Hospitality", query: "hospitality", note: "Warmth, humanism, place and sensory storytelling." },
  { label: "Experimental", query: "experimental", note: "Expressive display, cultural and future-facing work." },
  { label: "Multilingual", query: "multilingual", note: "Broad language coverage and international delivery." },
  { label: "Minimal", query: "minimal", note: "Neutral systems, generous spacing, quiet hierarchy." },
];

function inferredRoles(category: FontCategory): FontRole[] {
  if (category === "Mono") return ["UI", "Label", "Accent"];
  if (category === "Display" || category === "Script") return ["Display", "Accent"];
  if (category === "Serif") return ["Display", "Body", "Editorial"];
  return ["Display", "Body", "UI"];
}

function coverageLabel(value: Coverage) {
  if (value === "All") return "All coverage";
  if (value === "latin-ext") return "Latin extended";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function TypeVaultWorkbench() {
  const [remote, setRemote] = useState<RemoteFont[]>([]);
  const [remoteStatus, setRemoteStatus] = useState("Connecting to Fontsource");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "All">("All");
  const [mood, setMood] = useState<FontMood | "All">("All");
  const [role, setRole] = useState<FontRole | "All">("All");
  const [source, setSource] = useState<SourceKind>("All");
  const [coverage, setCoverage] = useState<Coverage>("All");
  const [variableOnly, setVariableOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("Featured");
  const [visibleCount, setVisibleCount] = useState(120);
  const [premiumQuery, setPremiumQuery] = useState("");
  const [premiumKind, setPremiumKind] = useState<PremiumSourceKind | "All">("All");
  const [premiumAccess, setPremiumAccess] = useState<PremiumAccess | "All">("All");
  const [premiumVisible, setPremiumVisible] = useState(18);

  useEffect(() => {
    fetch("/api/type-vault")
      .then((response) => response.json())
      .then((data: { count?: number; fonts?: RemoteFont[]; warning?: string }) => {
        setRemote(data.fonts ?? []);
        setRemoteStatus(data.count ? data.count.toLocaleString() + " Fontsource families online" : data.warning ?? "Curated library online");
      })
      .catch(() => setRemoteStatus("Curated library online"));
  }, []);


  const pairings = useMemo(() => [...fontPairings, ...additionalPairings], []);

  const rows = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const curated = fontCatalog.map((font) => ({
      id: font.id,
      name: font.name,
      category: font.category,
      sourceKind: "Curated" as const,
      source: font.source,
      variable: font.variable ?? false,
      detail: font.use,
      searchDetail: font.use + " " + font.moods.join(" ") + " " + font.roles.join(" ") + " " + font.tags.join(" "),
      moods: font.moods,
      roles: font.roles,
      subsets: font.tags.includes("multilingual") ? ["multilingual"] : ["curated"],
      weights: [] as number[],
      license: font.bundled ? "Bundled in Forge" : "Curated reference",
      featured: true,
    }));

    const live = remote.map((font) => {
      const mappedCategory = categoryMap[font.category] ?? "Sans";
      return {
        id: "fs-" + font.id,
        name: font.name,
        category: mappedCategory,
        sourceKind: "Fontsource" as const,
        source: font.source,
        variable: font.variable,
        detail: font.subsets.slice(0, 5).join(" · ") || "Open-source web family",
        searchDetail: font.category + " " + font.subsets.join(" ") + " " + font.weights.join(" ") + " " + font.styles.join(" "),
        moods: [] as FontMood[],
        roles: inferredRoles(mappedCategory),
        subsets: font.subsets,
        weights: font.weights,
        license: font.license,
        featured: false,
      };
    });

    const seen = new Set<string>();
    const filtered = [...curated, ...live].filter((font) => {
      const key = font.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      if (source !== "All" && font.sourceKind !== source) return false;
      if (category !== "All" && font.category !== category) return false;
      if (mood !== "All" && !font.moods.includes(mood)) return false;
      if (role !== "All" && !font.roles.includes(role)) return false;
      if (coverage !== "All") {
        if (font.sourceKind === "Curated") {
          if (!font.subsets.includes("multilingual")) return false;
        } else if (!font.subsets.includes(coverage)) return false;
      }
      if (variableOnly && !font.variable) return false;
      const haystack = (font.name + " " + font.searchDetail + " " + font.category + " " + font.sourceKind).toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });

    return filtered.sort((a, b) => {
      if (sort === "A-Z") return a.name.localeCompare(b.name);
      if (sort === "Variable first") return Number(b.variable) - Number(a.variable) || a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
    });
  }, [remote, query, category, mood, role, source, coverage, variableOnly, sort]);

  const premiumRows = useMemo(() => {
    const terms = premiumQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return premiumTypeSources
      .filter((item) => premiumKind === "All" || item.kind === premiumKind)
      .filter((item) => premiumAccess === "All" || item.access === premiumAccess)
      .filter((item) => {
        if (!terms.length) return true;
        const haystack = [
          item.name,
          item.kind,
          item.access,
          item.scale,
          item.note,
          ...item.tags,
          ...item.signatureFamilies,
        ].join(" ").toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .sort((a, b) => b.signatureFamilies.length - a.signatureFamilies.length || a.name.localeCompare(b.name));
  }, [premiumQuery, premiumKind, premiumAccess]);

  const activeFilters = [category, mood, role, source, coverage].filter((value) => value !== "All").length + (variableOnly ? 1 : 0) + (query ? 1 : 0);
  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setMood("All");
    setRole("All");
    setSource("All");
    setCoverage("All");
    setVariableOnly(false);
    setSort("Featured");
  };

  return (
    <main className="tv-root">
      <header className="tv-topbar">
        <Link href="/design" className="tv-back">← Design Atelier</Link>
        <Link href="/forge" className="tv-brand" aria-label="Forge home">
          <span className="tv-brand-mark">F</span>
          <span>FORGE</span>
          <em>Type Vault</em>
        </Link>
        <span className="tv-status"><i aria-hidden="true" />{remoteStatus}</span>
      </header>

      <div className="tv-shell">
        <section className="tv-hero" aria-labelledby="type-vault-title">
          <div className="tv-hero-copy">
            <p className="tv-eyebrow">Typography intelligence / 01</p>
            <h1 id="type-vault-title">The typography universe, made usable.</h1>
            <p className="tv-lede">Forge now spans two different worlds: a production-safe open-font atlas and a premium research network of elite commercial libraries and foundries. Search broadly, art-direct aggressively, then license and ship only what the project actually needs.</p>
            <div className="tv-hero-actions">
              <a href="#premium-network" className="tv-primary-action">Explore premium network <span>↓</span></a>
              <a href="#library-atlas" className="tv-secondary-action">Open production atlas</a>
            </div>
          </div>
          <div className="tv-metrics" aria-label="Type Vault summary">
            <div><strong>{fontCatalog.length}</strong><span>Forge curated</span></div>
            <div><strong>{pairings.length}</strong><span>Pairing systems</span></div>
            <div><strong>{remote.length ? remote.length.toLocaleString() : "—"}</strong><span>Live families</span></div>
            <div><strong>{premiumTypeSources.length}</strong><span>Premium sources</span></div>
          </div>
        </section>

        <section className="tv-section tv-territories" aria-labelledby="territories-title">
          <div className="tv-section-head">
            <div><p className="tv-eyebrow">Creative territories / 02</p><h2 id="territories-title">Start with a point of view.</h2></div>
            <p>Jump into a semantic search instead of browsing alphabetically.</p>
          </div>
          <div className="tv-territory-grid">
            {territories.map((territory, index) => (
              <button key={territory.label} type="button" className="tv-territory-card" onClick={() => { setQuery(territory.query); setVisibleCount(120); }}>
                <span className="tv-index">{String(index + 1).padStart(2, "0")}</span>
                <strong>{territory.label}</strong>
                <p>{territory.note}</p>
                <span className="tv-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        <section className="tv-section tv-sources" aria-labelledby="sources-title">
          <div className="tv-section-head">
            <div><p className="tv-eyebrow">Source network / 03</p><h2 id="sources-title">A wider research perimeter.</h2></div>
            <p>Forge keeps discovery broad and production selective.</p>
          </div>
          <div className="tv-source-grid">
            {foundries.map((item, index) => (
              <a className="tv-source-card" href={item.url} target="_blank" rel="noreferrer" key={item.name}>
                <span className="tv-index">{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.name}</strong><p>{item.count}</p></div>
                <small>{item.license}</small>
                <span className="tv-arrow">↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className="tv-section tv-premium" id="premium-network" aria-labelledby="premium-title">
          <div className="tv-section-head tv-premium-head">
            <div>
              <p className="tv-eyebrow">Premium network / 04</p>
              <h2 id="premium-title">The serious type world, indexed.</h2>
            </div>
            <p>{premiumLibraries.length} major libraries + {premiumFoundries.length} premium foundries, with {premiumSignatureFamilyCount}+ named signature-family references already mapped.</p>
          </div>

          <div className="tv-premium-banner">
            <div>
              <span className="tv-premium-kicker">Research layer ≠ bundled license</span>
              <strong>Premium fonts stay references until a project owns the rights.</strong>
            </div>
            <p>Forge can recommend, compare and route you to the source. It does not copy paid binaries into the repository or imply commercial rights you have not purchased.</p>
          </div>

          <div className="tv-premium-toolbar">
            <label className="tv-premium-search">
              <span>Search foundry, family, style or specialty</span>
              <input
                type="search"
                value={premiumQuery}
                onChange={(event) => { setPremiumQuery(event.target.value); setPremiumVisible(18); }}
                placeholder="Graphik, Swiss grotesk, Arabic, fashion, editorial, variable…"
              />
            </label>
            <div className="tv-premium-selects">
              <label><span>Source type</span><select value={premiumKind} onChange={(event) => { setPremiumKind(event.target.value as PremiumSourceKind | "All"); setPremiumVisible(18); }}><option>All</option><option>Library</option><option>Foundry</option></select></label>
              <label><span>Access</span><select value={premiumAccess} onChange={(event) => { setPremiumAccess(event.target.value as PremiumAccess | "All"); setPremiumVisible(18); }}><option>All</option><option>Subscription</option><option>Retail</option><option>Trial + retail</option><option>Mixed</option></select></label>
            </div>
          </div>

          <div className="tv-premium-stats" aria-label="Premium network summary">
            <div><span>Mapped sources</span><strong>{premiumTypeSources.length}</strong></div>
            <div><span>Signature families</span><strong>{premiumSignatureFamilyCount}+</strong></div>
            <div><span>Libraries</span><strong>{premiumLibraries.length}</strong></div>
            <div><span>Foundries</span><strong>{premiumFoundries.length}</strong></div>
          </div>

          <div className="tv-premium-grid">
            {premiumRows.slice(0, premiumVisible).map((item, index) => (
              <article className="tv-premium-card" key={item.id}>
                <header>
                  <span className="tv-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className={"tv-access-badge tv-access-badge--" + item.access.toLowerCase().replaceAll(" ", "-").replace("+", "plus")}>{item.access}</span>
                </header>
                <div className="tv-premium-card-title">
                  <p>{item.kind}</p>
                  <h3>{item.name}</h3>
                  <span>{item.scale}</span>
                </div>
                <p className="tv-premium-note">{item.note}</p>
                <div className="tv-premium-tags">{item.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
                {item.signatureFamilies.length ? (
                  <div className="tv-premium-families">
                    <span>Signature references</span>
                    <p>{item.signatureFamilies.slice(0, 8).join(" · ")}{item.signatureFamilies.length > 8 ? " · +" + (item.signatureFamilies.length - 8) : ""}</p>
                  </div>
                ) : null}
                <footer>
                  <small>Verified {item.verified}</small>
                  <a href={item.url} target="_blank" rel="noreferrer">Open source ↗</a>
                </footer>
              </article>
            ))}
          </div>

          {premiumRows.length > premiumVisible ? (
            <button className="tv-load-more tv-load-more--premium" type="button" onClick={() => setPremiumVisible((count) => Math.min(count + 18, premiumRows.length))}>
              Show more premium sources <span>{premiumVisible} / {premiumRows.length}</span>
            </button>
          ) : null}
        </section>

        <section className="tv-section tv-pairings" aria-labelledby="pairings-title">
          <div className="tv-section-head">
            <div><p className="tv-eyebrow">Curated systems / 05</p><h2 id="pairings-title">Pairings with a job to do.</h2></div>
            <p>{pairings.length} starting systems spanning luxury, editorial, culture, product, automotive, hospitality and technology.</p>
          </div>
          <div className="tv-pairing-grid">
            {pairings.map((pair, index) => (
              <article className="tv-pairing-card" key={pair.id}>
                <header><span className="tv-index">{String(index + 1).padStart(2, "0")}</span><span>{pair.moods.join(" / ")}</span></header>
                <div className="tv-pairing-specimen" aria-hidden="true"><span>Aa</span></div>
                <div className="tv-pairing-copy">
                  <h3>{pair.name}</h3>
                  <p className="tv-pairing-fonts">{pair.display}<span> + </span>{pair.body}{pair.accent ? <><span> + </span>{pair.accent}</> : null}</p>
                  <p>{pair.use}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="tv-section tv-collections" aria-labelledby="collections-title">
          <div className="tv-section-head">
            <div><p className="tv-eyebrow">Independent references / 06</p><h2 id="collections-title">Do not let the algorithm narrow your taste.</h2></div>
            <p>Named collections sit beside the live index to preserve less-obvious directions.</p>
          </div>
          <div className="tv-collection-grid">
            {specialCollections.map((collection, index) => (
              <article className="tv-collection-card" key={collection.name}>
                <header><span className="tv-index">{String(index + 1).padStart(2, "0")}</span><strong>{collection.name}</strong></header>
                <p>{collection.note}</p>
                <div className="tv-chip-cloud">{collection.fonts.map((font) => <span key={font}>{font}</span>)}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="tv-section tv-browser" id="library-atlas" aria-labelledby="browser-title">
          <div className="tv-section-head tv-browser-head">
            <div><p className="tv-eyebrow">Production atlas / 07</p><h2 id="browser-title">Search the full field.</h2></div>
            <div className="tv-result-summary"><strong>{rows.length.toLocaleString()}</strong><span>matching families</span></div>
          </div>

          <div className="tv-filter-panel">
            <label className="tv-search-field">
              <span>Search intent, family, industry, language or use</span>
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(120); }} placeholder="luxury architecture, automotive, multilingual, editorial…" />
            </label>
            <div className="tv-filter-grid">
              <label><span>Category</span><select value={category} onChange={(event) => { setCategory(event.target.value as FontCategory | "All"); setVisibleCount(120); }}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span>Mood</span><select value={mood} onChange={(event) => { setMood(event.target.value as FontMood | "All"); setVisibleCount(120); }}>{fontMoods.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span>Role</span><select value={role} onChange={(event) => { setRole(event.target.value as FontRole | "All"); setVisibleCount(120); }}>{roles.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span>Coverage</span><select value={coverage} onChange={(event) => { setCoverage(event.target.value as Coverage); setVisibleCount(120); }}>{coverageOptions.map((value) => <option key={value} value={value}>{coverageLabel(value)}</option>)}</select></label>
              <label><span>Source</span><select value={source} onChange={(event) => { setSource(event.target.value as SourceKind); setVisibleCount(120); }}><option>All</option><option>Curated</option><option>Fontsource</option></select></label>
              <label><span>Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value as SortMode); setVisibleCount(120); }}><option>Featured</option><option>A-Z</option><option>Variable first</option></select></label>
            </div>
            <div className="tv-filter-actions">
              <label className="tv-toggle"><input type="checkbox" checked={variableOnly} onChange={(event) => { setVariableOnly(event.target.checked); setVisibleCount(120); }} /><span>Variable families only</span></label>
              <button type="button" onClick={clearFilters} disabled={!activeFilters}>Reset {activeFilters ? "(" + activeFilters + ")" : ""}</button>
            </div>
          </div>

          <div className="tv-library-head" aria-hidden="true">
            <span>Family</span><span>Direction / coverage</span><span>Source</span><span />
          </div>
          <div className="tv-list">
            {rows.slice(0, visibleCount).map((font, index) => (
              <article className="tv-font-row" key={font.id}>
                <div className="tv-font-identity">
                  <span className="tv-index">{String(index + 1).padStart(3, "0")}</span>
                  <div><strong>{font.name}</strong><span>{font.category}{font.variable ? " · Variable" : ""}</span></div>
                </div>
                <div className="tv-font-detail">
                  <p>{font.detail}</p>
                  <div className="tv-mini-chips">
                    {font.roles.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                    {font.subsets.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                    {font.weights.length ? <span>{font.weights.length} weights</span> : null}
                  </div>
                </div>
                <div className="tv-font-source"><span>{font.sourceKind}</span><small>{font.license}</small></div>
                <a href={font.source} target="_blank" rel="noreferrer" aria-label={"Open source for " + font.name}>↗</a>
              </article>
            ))}
          </div>

          {rows.length === 0 ? <div className="tv-empty"><strong>No families match this combination.</strong><p>Reset one or more filters or search a broader creative direction.</p><button type="button" onClick={clearFilters}>Reset filters</button></div> : null}

          {rows.length > visibleCount ? (
            <button className="tv-load-more" type="button" onClick={() => setVisibleCount((count) => Math.min(count + 120, rows.length))}>
              Load 120 more <span>{visibleCount.toLocaleString()} / {rows.length.toLocaleString()}</span>
            </button>
          ) : rows.length > 0 ? <p className="tv-end">End of current result set · {rows.length.toLocaleString()} families</p> : null}
        </section>

        <footer className="tv-footer">
          <div><span className="tv-brand-mark">F</span><strong>FORGE / TYPE VAULT</strong></div>
          <p>Metadata-first by design. Final production projects install or self-host only approved families after license and glyph verification.</p>
        </footer>
      </div>
    </main>
  );
}
