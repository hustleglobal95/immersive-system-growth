"use client";

import type { CSSProperties, DragEvent } from "react";
import type { NavigationMode, SiteArchetypeId, StructurePlan, StructureSection, StructureTier } from "@/src/platform/siteStructure";

/** Visual language sampled per project type so the preview reads like that kind of website. */
const themes: Record<SiteArchetypeId, { brand: string; bg: string; surface: string; fg: string; muted: string; accent: string; heading: string; image: [string, string]; uppercase?: boolean }> = {
  "brand-flagship": { brand: "MAISON NORD", bg: "#0d0c0b", surface: "#17150f", fg: "#f2ece2", muted: "#a39a8b", accent: "#c8a878", heading: "Georgia, 'Times New Roman', serif", image: ["#3b2f22", "#0f0d0a"] },
  "product-launch": { brand: "AXIS ONE", bg: "#0a0b0d", surface: "#14171b", fg: "#f5f6f7", muted: "#8e97a3", accent: "#5ab0ff", heading: "Arial, Helvetica, sans-serif", image: ["#1f3550", "#07090c"] },
  "property-development": { brand: "THE ALDER", bg: "#efe9df", surface: "#e4dccf", fg: "#1f1b16", muted: "#6f655a", accent: "#8a6a45", heading: "Georgia, 'Times New Roman', serif", image: ["#9c8a70", "#3f352a"] },
  "hospitality-destination": { brand: "CASA SALINA", bg: "#f4efe6", surface: "#e9e0d2", fg: "#2a241c", muted: "#7a6d5d", accent: "#b5714a", heading: "Georgia, 'Times New Roman', serif", image: ["#d7a67a", "#4b6a73"] },
  "portfolio-studio": { brand: "STUDIO FORM", bg: "#f6f6f4", surface: "#e9e9e5", fg: "#111111", muted: "#6b6b66", accent: "#111111", heading: "Arial, Helvetica, sans-serif", image: ["#c9c9c3", "#5c5c57"] },
  "saas-product": { brand: "Lumen", bg: "#ffffff", surface: "#f1f3f9", fg: "#0f172a", muted: "#5b6478", accent: "#4f46e5", heading: "Arial, Helvetica, sans-serif", image: ["#c7d2fe", "#eef2ff"] },
  "editorial-commerce": { brand: "OLIVE & ASH", bg: "#f3eee7", surface: "#e7dfd3", fg: "#1c1a17", muted: "#72685c", accent: "#a23b2a", heading: "Georgia, 'Times New Roman', serif", image: ["#b99b7a", "#5a4636"] },
  "campaign-story": { brand: "NIGHTFALL", bg: "#050505", surface: "#131313", fg: "#ffffff", muted: "#9a9a9a", accent: "#ff5a1f", heading: "Arial Black, Arial, Helvetica, sans-serif", image: ["#ff5a1f", "#1a0a05"], uppercase: true },
};

/** Believable sample copy per project type, so the preview reads like a website rather than a brief. */
const sampleCopy: Record<SiteArchetypeId, { headline: string; sub: string; statement: string; cta: string }> = {
  "brand-flagship": { headline: "Made for the long view.", sub: "A house of objects, places and ideas shaped with patience.", statement: "We believe the most enduring things are made slowly, and made to be lived with.", cta: "Discover the house" },
  "product-launch": { headline: "Precision, redrawn.", sub: "The lightest, quietest AXIS ever engineered.", statement: "Every millimetre was questioned. What remained is only what matters.", cta: "Pre-order now" },
  "property-development": { headline: "Residences above the river.", sub: "Forty-two homes shaped by light, stone and the water below.", statement: "A building that belongs to its street, its skyline and the people who return to it.", cta: "Book a private viewing" },
  "hospitality-destination": { headline: "Where the coast slows down.", sub: "Twenty-four suites between the pines and the sea.", statement: "Arrive by the old road. Leave with the salt still on your skin.", cta: "Reserve your stay" },
  "portfolio-studio": { headline: "Spaces, identities, objects.", sub: "An independent studio working across architecture and brand.", statement: "We design with restraint so that what matters can be felt, not explained.", cta: "Start a project" },
  "saas-product": { headline: "Your data, finally clear.", sub: "Lumen turns scattered metrics into decisions your whole team can see.", statement: "Teams lose hours every week reconciling reports that disagree.", cta: "Start free trial" },
  "editorial-commerce": { headline: "The autumn collection.", sub: "Linen, wool and oak, made in small runs by people we know.", statement: "Fewer, better things, with a story you can trace back to the hands that made them.", cta: "Shop the collection" },
  "campaign-story": { headline: "After dark, everything changes.", sub: "A film in three acts. Premieres worldwide this October.", statement: "It started with a single light left on in an empty city.", cta: "Watch the film" },
};

const tierDepth: Record<StructureTier, number> = { cinematic: 0, immersive: 1, signature: 2, flagship: 3 };

export function StructurePreview({
  plan,
  navigation,
  viewport,
  annotations,
  selectedId,
  onSelect,
  onDragStartSection,
  onDropAt,
  dropIndex,
  setDropIndex,
}: {
  plan: StructurePlan;
  navigation: NavigationMode;
  viewport: "desktop" | "mobile";
  annotations: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDragStartSection: (event: DragEvent, index: number) => void;
  onDropAt: (event: DragEvent, index: number) => void;
  dropIndex: number | null;
  setDropIndex: (index: number | null) => void;
}) {
  const theme = themes[plan.archetype];
  const depth = tierDepth[plan.tier];
  const primary = plan.pages.find((page) => page.primary) ?? plan.pages[0];
  const copy = sampleCopy[plan.archetype];
  const cta = copy.cta;
  const style = {
    "--sp-bg": theme.bg, "--sp-surface": theme.surface, "--sp-fg": theme.fg, "--sp-muted": theme.muted, "--sp-accent": theme.accent,
    "--sp-heading": theme.heading, "--sp-img-a": theme.image[0], "--sp-img-b": theme.image[1],
    "--sp-heading-transform": theme.uppercase ? "uppercase" : "none",
  } as CSSProperties;

  const indexFromPointer = (event: DragEvent, index: number) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
  };

  return (
    <div className="structure-preview" data-viewport={viewport}>
      <div className="structure-preview__chrome" aria-hidden="true">
        <i /><i /><i />
        <span>{theme.brand.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com/{primary?.id ?? ""}</span>
      </div>
      <div className="structure-preview__site" style={style} data-tier={plan.tier} data-archetype={plan.archetype}>
        <SiteHeader navigation={navigation} brand={theme.brand} pages={plan.pages} sections={plan.sections} cta={cta} viewport={viewport} />
        {navigation === "chaptered" && viewport === "desktop" && (
          <ol className="sp-rail" aria-hidden="true">{plan.sections.filter((s) => s.role !== "footer").map((s, i) => <li key={s.id} data-active={s.id === selectedId || undefined}>{String(i + 1).padStart(2, "0")}</li>)}</ol>
        )}
        {plan.sections.map((section, index) => (
          <div
            key={section.id}
            className="sp-block"
            data-selected={section.id === selectedId || undefined}
            data-drop-before={dropIndex === index || undefined}
            data-drop-after={dropIndex === index + 1 && index === plan.sections.length - 1 ? true : undefined}
            draggable
            role="button"
            tabIndex={0}
            aria-label={`${section.label} section, position ${index + 1}. Drag to reorder.`}
            onClick={() => onSelect(section.id)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(section.id); } }}
            onDragStart={(event) => onDragStartSection(event, index)}
            onDragOver={(event) => { event.preventDefault(); setDropIndex(indexFromPointer(event, index)); }}
            onDrop={(event) => onDropAt(event, indexFromPointer(event, index))}
          >
            {annotations && <div className="sp-tag"><b>{String(index + 1).padStart(2, "0")} · {section.label}</b><span>{section.energy} · {section.density}</span></div>}
            <SectionSample section={section} index={index} depth={depth} viewport={viewport} brand={theme.brand} pages={plan.pages} cta={cta} copy={copy} />
          </div>
        ))}
        {!plan.sections.length && (
          <div className="sp-empty" onDragOver={(event) => { event.preventDefault(); setDropIndex(0); }} onDrop={(event) => onDropAt(event, 0)}>Drag sections here to build the page.</div>
        )}
      </div>
    </div>
  );
}

function SiteHeader({ navigation, brand, pages, sections, cta, viewport }: { navigation: NavigationMode; brand: string; pages: StructurePlan["pages"]; sections: StructureSection[]; cta: string; viewport: "desktop" | "mobile" }) {
  const anchors = sections.filter((s) => !["hero", "footer", "conversion"].includes(s.role)).slice(0, 4);
  return (
    <header className="sp-header" data-nav={navigation}>
      <strong className="sp-logo">{brand}</strong>
      {viewport === "mobile" ? <span className="sp-burger" aria-hidden="true"><i /><i /></span> : (
        <>
          {navigation === "full-site" && <nav>{pages.map((page) => <span key={page.id} data-primary={page.primary || undefined}>{page.label}</span>)}</nav>}
          {navigation === "anchored" && <nav>{anchors.map((s) => <span key={s.id}>{s.label}</span>)}</nav>}
          {navigation === "chaptered" && <nav><span>Chapters · {sections.filter((s) => s.role !== "footer").length}</span></nav>}
          {navigation === "minimal" && <nav />}
          <span className="sp-cta">{cta}</span>
        </>
      )}
    </header>
  );
}

const pick = <T,>(items: T[], count: number) => items.slice(0, Math.max(1, count));

function SampleMedia({ label, tall, depth, fallback }: { label?: string; tall?: boolean; depth: number; fallback: string }) {
  const text = label ?? fallback;
  const kind = /3d/i.test(text) ? "3d" : /video/i.test(text) ? "video" : /ui|interface|prototype/i.test(text) ? "ui" : "image";
  return <div className="sp-media" data-tall={tall || undefined} data-depth={depth} data-kind={kind}><span>{text}</span></div>;
}

function SectionSample({ section, index, depth, viewport, brand, pages, cta, copy }: { section: StructureSection; index: number; depth: number; viewport: "desktop" | "mobile"; brand: string; pages: StructurePlan["pages"]; cta: string; copy: (typeof sampleCopy)[SiteArchetypeId] }) {
  const count = section.density === "dense" ? 6 : section.density === "balanced" ? 3 : 2;
  const cols = viewport === "mobile" ? 1 : Math.min(count, 3);
  const loud = section.energy === "cinematic" || section.energy === "intense";
  const media = section.preferredMedia[0] ?? "image";

  switch (section.role) {
    case "hero":
      return (
        <section className="sp-hero" data-loud={loud || depth > 0 || undefined} data-depth={depth}>
          <SampleMedia depth={depth} fallback={media} tall label={media} />
          <div className="sp-hero__copy">
            <small>{brand}</small>
            <h1>{copy.headline}</h1>
            <p>{copy.sub}</p>
            <div className="sp-actions"><span className="sp-button">{cta}</span>{depth > 0 && <span className="sp-button sp-button--ghost">Explore</span>}</div>
          </div>
          {depth >= 2 && <div className="sp-scroll-cue">Scroll</div>}
        </section>
      );
    case "manifesto":
    case "context":
      return (
        <section className="sp-section sp-statement" data-loud={loud || undefined}>
          <small>{section.label}</small>
          <h2>{section.role === "manifesto" ? copy.statement : section.userQuestion}</h2>
          <p>{section.purpose}</p>
          {loud && <SampleMedia depth={depth} fallback={media} label={media} />}
        </section>
      );
    case "proof":
    case "social-proof":
      return (
        <section className="sp-section">
          <small>{section.label}</small>
          <h3>{section.userQuestion}</h3>
          {section.role === "proof" ? (
            <div className="sp-metrics" style={{ gridTemplateColumns: `repeat(${viewport === "mobile" ? 2 : 4}, 1fr)` }}>
              {["98%", "12", "40+", "5★"].map((value, i) => <div key={value}><b>{value}</b><span>{section.evidence[i % section.evidence.length]}</span></div>)}
            </div>
          ) : (
            <div className="sp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {pick(["“Quietly extraordinary.”", "“Worth every detail.”", "“A new standard.”"], cols).map((quote) => <blockquote key={quote}>{quote}<cite>{section.evidence[0]}</cite></blockquote>)}
            </div>
          )}
        </section>
      );
    case "gallery":
    case "journal":
      return (
        <section className="sp-section" data-loud={loud || undefined}>
          <div className="sp-section__head"><small>{section.label}</small><h3>{section.userQuestion}</h3></div>
          <div className="sp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: count }, (_, i) => <article key={i} className="sp-card"><SampleMedia depth={depth} fallback={media} label={section.role === "journal" ? "story" : section.preferredMedia[i % section.preferredMedia.length]} /><b>{section.evidence[i % section.evidence.length]}</b></article>)}
          </div>
        </section>
      );
    case "product":
    case "experience":
    case "location":
      return (
        <section className="sp-section sp-split" data-loud={loud || undefined} data-flip={index % 2 === 1 || undefined} style={{ gridTemplateColumns: viewport === "mobile" ? "1fr" : "1.2fr 1fr" }}>
          <SampleMedia depth={depth} fallback={media} tall={loud} label={media} />
          <div><small>{section.label}</small><h2>{section.userQuestion}</h2><p>{section.purpose}</p><ul>{pick(section.evidence, 3).map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>
      );
    case "feature":
    case "process":
    case "team":
      return (
        <section className="sp-section">
          <div className="sp-section__head"><small>{section.label}</small><h3>{section.userQuestion}</h3></div>
          <div className="sp-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: Math.max(3, count) > 3 && viewport === "mobile" ? 3 : Math.max(3, Math.min(count, 6)) }, (_, i) => (
              <article key={i} className="sp-feature">
                {section.role === "team" ? <div className="sp-avatar" /> : <span className="sp-step">{String(i + 1).padStart(2, "0")}</span>}
                <b>{section.evidence[i % section.evidence.length]}</b>
                <p>{section.purpose.split(" ").slice(0, 8).join(" ")}…</p>
              </article>
            ))}
          </div>
        </section>
      );
    case "specs":
    case "comparison":
      return (
        <section className="sp-section">
          <div className="sp-section__head"><small>{section.label}</small><h3>{section.userQuestion}</h3></div>
          <table className="sp-table"><tbody>
            {pick(section.evidence, 4).map((item, i) => <tr key={item}><th>{item}</th><td>{section.role === "comparison" ? "✓" : ["—", "Available", "Standard", "Included"][i % 4]}</td>{section.role === "comparison" && viewport === "desktop" && <td>—</td>}</tr>)}
          </tbody></table>
        </section>
      );
    case "pricing":
      return (
        <section className="sp-section">
          <div className="sp-section__head"><small>{section.label}</small><h3>{section.userQuestion}</h3></div>
          <div className="sp-grid" style={{ gridTemplateColumns: `repeat(${viewport === "mobile" ? 1 : 3}, 1fr)` }}>
            {["Starter", "Team", "Enterprise"].map((name, i) => <article key={name} className="sp-price" data-featured={i === 1 || undefined}><b>{name}</b><strong>{["$0", "$49", "Custom"][i]}</strong><span className="sp-button">{i === 2 ? "Contact" : "Start"}</span></article>)}
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="sp-section">
          <div className="sp-section__head"><small>{section.label}</small><h3>{section.userQuestion}</h3></div>
          <div className="sp-faq">{["How long does it take?", "What is included?", "Can I change plans later?", "Who do I contact?"].slice(0, viewport === "mobile" ? 3 : 4).map((q) => <div key={q}><span>{q}</span><b>+</b></div>)}</div>
        </section>
      );
    case "conversion":
      return (
        <section className="sp-section sp-conversion" data-loud={depth > 0 || undefined}>
          {depth >= 2 && <SampleMedia depth={depth} fallback={media} label="final hero" />}
          <div><small>{section.label}</small><h2>{section.userQuestion}</h2><p>{section.purpose}</p>
            <div className="sp-form"><span>Name</span><span>Email</span><span className="sp-button">{cta}</span></div>
          </div>
        </section>
      );
    case "footer":
      return (
        <footer className="sp-footer">
          <strong className="sp-logo">{brand}</strong>
          <div>{pages.map((page) => <span key={page.id}>{page.label}</span>)}</div>
          <small>© {brand} · Privacy · Terms</small>
        </footer>
      );
    default:
      return <section className="sp-section"><small>{section.label}</small><h3>{section.userQuestion}</h3><SampleMedia depth={depth} fallback={media} label={media} /></section>;
  }
}
