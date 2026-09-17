"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  auditStructure,
  createStructurePlan,
  navigationModeCatalog,
  structureArchetypeCatalog,
  structureSectionLibrary,
  structureTierCatalog,
  type NavigationMode,
  type SiteArchetypeId,
  type StructureLibraryItem,
  type StructurePlan,
  type StructureSection,
  type StructureTier,
} from "@/src/platform/siteStructure";
import { StructurePreview } from "@/src/studio/StructurePreview";

const STORAGE_KEY = "forge-structure-planner-v1";
const LIBRARY_MIME = "application/x-forge-structure-library";
const SECTION_MIME = "application/x-forge-structure-section";
const PAGE_MIME = "application/x-forge-structure-page";

type Draft = {
  archetype: SiteArchetypeId;
  tier: StructureTier;
  navigation: NavigationMode;
  sections: StructureSection[];
  pages: StructurePlan["pages"];
};

const recommended = (archetype: SiteArchetypeId, tier: StructureTier): Draft => {
  const plan = createStructurePlan(archetype, tier);
  return { archetype, tier, navigation: plan.navigation, sections: plan.sections, pages: plan.pages };
};

const move = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, item);
  return next;
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";

export function StructurePlanner() {
  const [draft, setDraft] = useState<Draft>(() => recommended("brand-flagship", "immersive"));
  const [history, setHistory] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [pageDrop, setPageDrop] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [libraryScope, setLibraryScope] = useState<"type" | "all">("type");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [annotations, setAnnotations] = useState(true);
  const [newPage, setNewPage] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const counter = useRef(0);

  // Restore the last architecture from this browser before anything is saved over it.
  useEffect(() => {
    let value: Draft | null = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Draft) : null;
      if (parsed && Array.isArray(parsed.sections) && Array.isArray(parsed.pages) && structureArchetypeCatalog.some((item) => item.id === parsed.archetype)) value = parsed;
    } catch { localStorage.removeItem(STORAGE_KEY); }
    void Promise.resolve().then(() => { if (value) setDraft(value); setLoaded(true); });
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }, [draft, loaded]);

  const base = useMemo(() => createStructurePlan(draft.archetype, draft.tier), [draft.archetype, draft.tier]);
  const plan: StructurePlan = useMemo(() => ({ ...base, navigation: draft.navigation, sections: draft.sections, pages: draft.pages }), [base, draft]);
  const audit = useMemo(() => auditStructure(plan), [plan]);
  const selected = draft.sections.find((section) => section.id === selectedId) ?? null;
  const customized = JSON.stringify(recommended(draft.archetype, draft.tier)) !== JSON.stringify(draft);

  const commit = (next: Draft | ((current: Draft) => Draft), message = "") => {
    const value = typeof next === "function" ? next(draft) : next;
    if (value !== draft) {
      setHistory((stack) => [...stack.slice(-49), draft]);
      setDraft(value);
    }
    setNotice(message);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((stack) => stack.slice(0, -1));
    setDraft(previous);
    setNotice("Undone.");
  };

  // Filters rebuild the recommended architecture; the previous one stays one Undo away.
  const applyFilters = (archetype: SiteArchetypeId, tier: StructureTier, navigation?: NavigationMode) => {
    commit((current) => {
      const next = recommended(archetype, tier);
      return { ...next, navigation: navigation ?? (archetype === current.archetype ? current.navigation : next.navigation) };
    }, customized ? "Architecture rebuilt from filters. Undo restores your previous arrangement." : "");
    setSelectedId(null);
  };

  const library = structureSectionLibrary.filter((item) =>
    (libraryScope === "all" || item.archetypes.includes(draft.archetype)) &&
    (!query.trim() || `${item.label} ${item.role} ${item.purpose}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const insertFromLibrary = (item: StructureLibraryItem, index: number) => {
    const { key, archetypes, ...seed } = item;
    void key; void archetypes;
    const id = `${seed.role}-custom-${++counter.current}-${draft.sections.length}`;
    commit((current) => {
      const sections = [...current.sections];
      sections.splice(Math.max(0, Math.min(index, sections.length)), 0, { ...seed, id });
      return { ...current, sections };
    }, `${item.label} added.`);
    setSelectedId(id);
  };
  const removeSection = (id: string) => {
    const target = draft.sections.find((section) => section.id === id);
    commit((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== id) }), `${target?.label ?? "Section"} removed.`);
    if (selectedId === id) setSelectedId(null);
  };
  const moveSection = (from: number, to: number) => {
    if (to < 0 || to > draft.sections.length || to === from || to === from + 1) return;
    commit((current) => ({ ...current, sections: move(current.sections, from, to) }));
  };

  // Shared drag protocol for the sitemap list and the live preview.
  const startSectionDrag = (event: DragEvent, index: number) => {
    event.dataTransfer.setData(SECTION_MIME, String(index));
    event.dataTransfer.effectAllowed = "move";
    setSelectedId(draft.sections[index]?.id ?? null);
  };
  const dropSection = (event: DragEvent, index: number) => {
    event.preventDefault();
    setDropIndex(null);
    const fromLibrary = event.dataTransfer.getData(LIBRARY_MIME);
    const fromSection = event.dataTransfer.getData(SECTION_MIME);
    if (fromLibrary) {
      const item = structureSectionLibrary.find((entry) => entry.key === fromLibrary);
      if (item) insertFromLibrary(item, index);
    } else if (fromSection !== "") {
      moveSection(Number(fromSection), index);
    }
  };
  const pointerIndex = (event: DragEvent, index: number) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
  };

  const updateSelected = (patch: Partial<StructureSection>) => {
    if (!selected) return;
    commit((current) => ({ ...current, sections: current.sections.map((section) => section.id === selected.id ? { ...section, ...patch } : section) }));
  };

  const addPage = () => {
    const label = newPage.trim();
    if (!label) return;
    commit((current) => {
      let id = slug(label); let n = 2;
      while (current.pages.some((page) => page.id === id)) id = `${slug(label)}-${n++}`;
      return { ...current, pages: [...current.pages, { id, label, purpose: "Custom page" }] };
    }, `${label} page added.`);
    setNewPage("");
  };

  return (
    <section className="structure-planner" aria-labelledby="structure-planner-title">
      <div className="sp-toolbar">
        <div className="sp-toolbar__title">
          <span>STRUCTURE ENGINE</span>
          <h2 id="structure-planner-title">Website architecture planner</h2>
        </div>
        <div className="sp-toolbar__filters" role="group" aria-label="Architecture filters">
          <label>Project type
            <select value={draft.archetype} onChange={(event) => applyFilters(event.target.value as SiteArchetypeId, draft.tier)}>
              {structureArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="sp-seg" role="radiogroup" aria-label="Tier">
            <span>Tier</span>
            <div>{structureTierCatalog.map((item) => <button key={item.id} type="button" role="radio" aria-checked={draft.tier === item.id} title={item.description} onClick={() => applyFilters(draft.archetype, item.id, draft.navigation)}>{item.label}</button>)}</div>
          </div>
          <div className="sp-seg" role="radiogroup" aria-label="Navigation">
            <span>Navigation</span>
            <div>{navigationModeCatalog.map((item) => <button key={item.id} type="button" role="radio" aria-checked={draft.navigation === item.id} title={item.description} onClick={() => commit((current) => ({ ...current, navigation: item.id }))}>{item.label}</button>)}</div>
          </div>
        </div>
        <div className="sp-toolbar__status">
          <output data-score={audit.score >= 90 ? "good" : audit.score >= 75 ? "ok" : "low"}><b>{audit.score}</b>/100</output>
          <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
          <button type="button" onClick={() => { commit(recommended(draft.archetype, draft.tier), "Reset to the recommended architecture."); setSelectedId(null); }} disabled={!customized}>Reset</button>
        </div>
      </div>

      {notice && <p className="sp-notice" role="status">{notice}</p>}

      <div className="sp-workspace">
        {/* Library: drag sections into the sitemap or preview; drop a section here to remove it. */}
        <aside
          className="sp-library"
          aria-label="Section library"
          onDragOver={(event) => { if (event.dataTransfer.types.includes(SECTION_MIME)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
          onDrop={(event) => { const from = event.dataTransfer.getData(SECTION_MIME); if (from !== "") { event.preventDefault(); const section = draft.sections[Number(from)]; if (section) removeSection(section.id); } }}
        >
          <header><h3>Section library</h3><small>Drag into the page. Drop here to remove.</small></header>
          <input type="search" placeholder="Search sections…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search sections" />
          <div className="sp-seg sp-seg--small">
            <div>
              <button type="button" role="radio" aria-checked={libraryScope === "type"} onClick={() => setLibraryScope("type")}>This type</button>
              <button type="button" role="radio" aria-checked={libraryScope === "all"} onClick={() => setLibraryScope("all")}>All ({structureSectionLibrary.length})</button>
            </div>
          </div>
          <ul>
            {library.map((item) => (
              <li
                key={item.key}
                draggable
                data-energy={item.energy}
                onDragStart={(event) => { event.dataTransfer.setData(LIBRARY_MIME, item.key); event.dataTransfer.effectAllowed = "copy"; }}
                onDragEnd={() => setDropIndex(null)}
              >
                <div><strong>{item.label}</strong><span>{item.role} · {item.energy}</span></div>
                <button type="button" aria-label={`Add ${item.label} before the footer`} onClick={() => insertFromLibrary(item, Math.max(0, draft.sections.findIndex((section) => section.role === "footer") === -1 ? draft.sections.length : draft.sections.findIndex((section) => section.role === "footer")))}>＋</button>
              </li>
            ))}
            {!library.length && <li className="sp-library__empty">No sections match.</li>}
          </ul>
        </aside>

        {/* Sitemap: pages and the section sequence. */}
        <div className="sp-map">
          <section className="sp-pages" aria-label="Pages">
            <header><h3>Pages</h3><small>{draft.pages.length} · drag to reorder, ★ sets the primary page</small></header>
            <ol onDragLeave={() => setPageDrop(null)}>
              {draft.pages.map((page, index) => (
                <li
                  key={page.id}
                  draggable
                  data-primary={page.primary || undefined}
                  data-drop-before={pageDrop === index || undefined}
                  onDragStart={(event) => { event.dataTransfer.setData(PAGE_MIME, String(index)); event.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(event) => { if (event.dataTransfer.types.includes(PAGE_MIME)) { event.preventDefault(); setPageDrop(index); } }}
                  onDrop={(event) => { event.preventDefault(); setPageDrop(null); const from = Number(event.dataTransfer.getData(PAGE_MIME)); if (!Number.isNaN(from) && from !== index) commit((current) => ({ ...current, pages: move(current.pages, from, from < index ? index + 1 : index) })); }}
                >
                  <span className="sp-grip" aria-hidden="true">⠿</span>
                  <input aria-label={`Page name ${index + 1}`} value={page.label} onChange={(event) => commit((current) => ({ ...current, pages: current.pages.map((item) => item.id === page.id ? { ...item, label: event.target.value } : item) }))} />
                  <button type="button" aria-label={`Make ${page.label} the primary page`} aria-pressed={Boolean(page.primary)} onClick={() => commit((current) => ({ ...current, pages: current.pages.map((item) => ({ ...item, primary: item.id === page.id })) }))}>★</button>
                  <button type="button" aria-label={`Remove ${page.label} page`} disabled={draft.pages.length <= 1} onClick={() => commit((current) => ({ ...current, pages: current.pages.filter((item) => item.id !== page.id).map((item, i, all) => ({ ...item, primary: page.primary ? i === 0 : item.primary || (!all.some((p) => p.primary) && i === 0) })) }), `${page.label} page removed.`)}>✕</button>
                </li>
              ))}
            </ol>
            <form className="sp-inline" onSubmit={(event) => { event.preventDefault(); addPage(); }}>
              <input value={newPage} onChange={(event) => setNewPage(event.target.value)} placeholder="New page name" aria-label="New page name" />
              <button type="submit" disabled={!newPage.trim()}>Add page</button>
            </form>
          </section>

          <section className="sp-sequence" aria-label="Home page section sequence">
            <header><h3>{(draft.pages.find((page) => page.primary) ?? draft.pages[0])?.label ?? "Page"} · sections</h3><small>{draft.sections.length} sections · target {base.targetSceneRange[0]}–{base.targetSceneRange[1]} scenes</small></header>
            <ol onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropIndex(null); }}>
              {draft.sections.map((section, index) => (
                <li
                  key={section.id}
                  draggable
                  data-energy={section.energy}
                  data-selected={section.id === selectedId || undefined}
                  data-drop-before={dropIndex === index || undefined}
                  data-drop-after={dropIndex === draft.sections.length && index === draft.sections.length - 1 ? true : undefined}
                  onClick={() => setSelectedId(section.id)}
                  onDragStart={(event) => startSectionDrag(event, index)}
                  onDragEnd={() => setDropIndex(null)}
                  onDragOver={(event) => { event.preventDefault(); setDropIndex(pointerIndex(event, index)); }}
                  onDrop={(event) => dropSection(event, pointerIndex(event, index))}
                >
                  <span className="sp-grip" aria-hidden="true">⠿</span>
                  <span className="sp-num">{String(index + 1).padStart(2, "0")}</span>
                  <div className="sp-item"><strong>{section.label}</strong><span>{section.role} · {section.energy} · {section.density}{section.optional ? " · optional" : ""}</span></div>
                  <div className="sp-item__actions">
                    <button type="button" aria-label={`Move ${section.label} up`} disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveSection(index, index - 1); }}>↑</button>
                    <button type="button" aria-label={`Move ${section.label} down`} disabled={index === draft.sections.length - 1} onClick={(event) => { event.stopPropagation(); moveSection(index, index + 2); }}>↓</button>
                    <button type="button" aria-label={`Remove ${section.label}`} onClick={(event) => { event.stopPropagation(); removeSection(section.id); }}>✕</button>
                  </div>
                </li>
              ))}
              <li
                className="sp-dropzone"
                data-active={dropIndex === draft.sections.length || undefined}
                onDragOver={(event) => { event.preventDefault(); setDropIndex(draft.sections.length); }}
                onDrop={(event) => dropSection(event, draft.sections.length)}
              >Drop a section here to add it at the end</li>
            </ol>
          </section>

          {selected ? (
            <section className="sp-details" aria-label={`${selected.label} details`}>
              <header><h3>{selected.label}</h3><button type="button" onClick={() => setSelectedId(null)} aria-label="Close section details">✕</button></header>
              <label>Name<input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>
              <div className="sp-details__row">
                <label>Energy<select value={selected.energy} onChange={(event) => updateSelected({ energy: event.target.value as StructureSection["energy"] })}>{["quiet", "measured", "cinematic", "intense"].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>Density<select value={selected.density} onChange={(event) => updateSelected({ density: event.target.value as StructureSection["density"] })}>{["sparse", "balanced", "dense"].map((value) => <option key={value}>{value}</option>)}</select></label>
              </div>
              <label>Purpose<textarea rows={2} value={selected.purpose} onChange={(event) => updateSelected({ purpose: event.target.value })} /></label>
              <label>Visitor question<input value={selected.userQuestion} onChange={(event) => updateSelected({ userQuestion: event.target.value })} /></label>
              <dl>
                <div><dt>Evidence</dt><dd>{selected.evidence.join(" · ")}</dd></div>
                <div><dt>Media</dt><dd>{selected.preferredMedia.join(" · ")}</dd></div>
                <div><dt>Motion</dt><dd>{selected.motion.join(" · ")}</dd></div>
              </dl>
            </section>
          ) : (
            <section className="sp-audit" aria-label="Structure audit">
              <header><h3>{audit.issues.length ? `${audit.issues.length} structure note${audit.issues.length === 1 ? "" : "s"}` : "Structure passes baseline rules"}</h3></header>
              {audit.issues.length ? <ul>{audit.issues.map((issue, index) => <li key={`${issue.level}-${index}`} data-level={issue.level}><b>{issue.level}</b><span>{issue.message}</span></li>)}</ul> : <p>Hero first, proof before conversion, footer last. Select a section to edit it.</p>}
            </section>
          )}
        </div>

        {/* Live preview of the website this architecture produces. */}
        <div className="sp-live">
          <header>
            <h3>Live preview</h3>
            <div className="sp-seg sp-seg--small"><div>
              <button type="button" role="radio" aria-checked={viewport === "desktop"} onClick={() => setViewport("desktop")}>Desktop</button>
              <button type="button" role="radio" aria-checked={viewport === "mobile"} onClick={() => setViewport("mobile")}>Mobile</button>
            </div></div>
            <label className="sp-check"><input type="checkbox" checked={annotations} onChange={(event) => setAnnotations(event.target.checked)} />Labels</label>
          </header>
          <StructurePreview
            plan={plan}
            navigation={draft.navigation}
            viewport={viewport}
            annotations={annotations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDragStartSection={startSectionDrag}
            onDropAt={dropSection}
            dropIndex={dropIndex}
            setDropIndex={setDropIndex}
          />
        </div>
      </div>

      <details className="structure-planner__rules"><summary>Structural rules</summary><ol>{plan.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol></details>
    </section>
  );
}
