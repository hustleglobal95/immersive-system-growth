"use client";
import Link from "next/link";
import { useState } from "react";
import { directions, directionStyles, defaultDirection, exportDirection, type DesignDirection } from "./directions";
import { fontCatalog, searchFonts, type FontCategory } from "./catalog";
import { InquiryForm } from "./InquiryForm";
import { ArchitecturalStudy, CollectionGrid, DisclosureGroup, EditorialHero, EditorialQuote, InquirySection, SectionHeading, SpecificationList } from "./sections";

export function DesignWorkbench() {
  const [direction, setDirection] = useState<DesignDirection>(defaultDirection);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "All">("All");
  const [specimen, setSpecimen] = useState("Spaces for a slower kind of living.");
  const fonts = searchFonts(query, category);
  return <div className="ds-root" style={directionStyles(direction)} data-direction={direction}>
    <a className="ds-skip" href="#design-content">Skip to design preview</a>
    <header className="ds-toolbar"><Link href="/" className="ds-brand">FORGE <span>/ Design atelier</span></Link><nav aria-label="Workbench"><a href="#font-library">Font library</a><Link href="/lab">Scene lab ↗</Link></nav></header>
    <div className="ds-controls">
      <fieldset><legend>Art direction</legend><div className="ds-directions">{(Object.keys(directions) as DesignDirection[]).map(id => <button key={id} type="button" aria-pressed={direction === id} onClick={() => setDirection(id)}>{directions[id].name}</button>)}</div></fieldset>
      <p>{directions[direction].description}</p>
    </div>
    <main id="design-content">
      <div className="ds-container">
        <div className="ds-project-nav"><span className="ds-label">STILL / A spatial design study</span><a href="#collection">Explore the collection ↓</a></div>
        <EditorialHero eyebrow="Architecture · Objects · Everyday rituals" title="Room to live. Space to feel." description="An exploration of natural materials, quiet proportions and the places we choose to call our own." action={{ label: "Explore the study", href: "#collection" }} visual={<ArchitecturalStudy />} />
        <div className="ds-caption-row"><span>CONCEPT SERIES — 01 / 03</span><span>Form follows feeling.</span></div>
        <section className="ds-section" id="collection">
          <SectionHeading index="01" eyebrow="Selected studies" title="Considered in every detail."><p>Three ways to frame an idea. A common grid holds the collection together while scale, crop and proportion create variety.</p></SectionHeading>
          <CollectionGrid items={[
            { id: "pavilion", title: "The open pavilion", description: "Light, shelter and a generous threshold.", visual: <ArchitecturalStudy variant={1} />, href: "#principles" },
            { id: "courtyard", title: "The quiet courtyard", description: "A closer look at rhythm and material.", visual: <ArchitecturalStudy variant={2} />, href: "#principles" },
          ]} />
        </section>
        <section className="ds-section ds-split" id="principles">
          <SectionHeading index="02" eyebrow="Design language" title="An order you can feel."><p>Hierarchy helps a visitor understand what matters, what belongs together and where to go next.</p></SectionHeading>
          <SpecificationList items={[
            { term: "Typography", detail: "One expressive voice. One clear reading voice." },
            { term: "Composition", detail: "Shared edges, deliberate asymmetry and room around the subject." },
            { term: "Material", detail: "A restrained palette, repeated with purpose." },
            { term: "Interaction", detail: "Clear actions, visible focus and useful feedback." },
          ]} />
        </section>
        <EditorialQuote quote="Give the important things enough room to be understood." attribution="Design principle / Forge specimen — not a customer testimonial" />
        <section className="ds-section ds-split" id="process">
          <SectionHeading index="03" eyebrow="From direction to detail" title="Built around a clear idea."><p>A repeatable structure supports the work without making every project look the same.</p></SectionHeading>
          <DisclosureGroup items={[
            { question: "01 — Establish the purpose", answer: "Name the audience, their immediate question and the next useful action. Decide what evidence the page needs before choosing its effects." },
            { question: "02 — Set the visual language", answer: "Choose a type pairing, readable color roles and a spacing rhythm. Test the actual headlines, longest labels and smallest screen." },
            { question: "03 — Compose and refine", answer: "Build the sequence from introduction to evidence, detail and inquiry. Review both still frames and the motion between them." },
          ]} />
        </section>
        <InquirySection title="Bring the direction into motion." description="Explore the camera and transition tools that turn a visual direction into a continuous experience." action={{ label: "Open the scene lab", href: "/lab" }} />
        <section className="ds-section ds-split"><SectionHeading index="04" eyebrow="Interaction specimen" title="A clear path to inquiry."><p>Try the required fields and email validation. This form is a demonstration; nothing is transmitted or stored.</p></SectionHeading><InquiryForm onSubmit={async () => ({ ok: false, message: "Preview complete. Nothing was sent. Connect your delivery handler when using this component in a project." })} /></section>
      </div>
      <section className="ds-library" id="font-library"><div className="ds-container">
        <SectionHeading index="04" eyebrow="Type resources" title="A library with a point of view."><p>{fontCatalog.length} curated references. Three locally bundled families. References open their source; they do not silently load extra fonts.</p></SectionHeading>
        <div className="ds-font-controls"><label>Search fonts<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, use or style" /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value as FontCategory | "All")}>{["All", "Serif", "Sans", "Mono"].map(c => <option key={c}>{c}</option>)}</select></label><label>Try your own headline<input maxLength={180} value={specimen} onChange={e => setSpecimen(e.target.value)} /></label></div>
        <div className="ds-type-specimens" aria-label="Bundled font specimens">{[
          { name: "Cormorant Garamond", family: "var(--font-cormorant), Georgia, serif", detail: "Display / weights 300–700" },
          { name: "DM Sans", family: "var(--font-dm-sans), Arial, sans-serif", detail: "Body & UI / weights 100–1000" },
          { name: "Manrope", family: "var(--font-manrope), Arial, sans-serif", detail: "Display & UI / weights 200–800" },
        ].map(f => <article key={f.name}><p className="ds-label">{f.name} · {f.detail}</p><p className="ds-font-sample" style={{ fontFamily: f.family }}>{specimen || "Try a headline above."}</p><p>ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz · 0123456789</p></article>)}</div>
        <p role="status" className="ds-result-count">{fonts.length} font references</p>
        <ul className="ds-font-list">{fonts.map(f => <li key={f.id}><div><a href={f.source} target="_blank" rel="noreferrer">{f.name} <span aria-hidden="true">↗</span></a><span className="ds-font-badge">{f.category} / {f.bundled ? "Bundled · OFL-1.1" : "Reference"}</span></div><p>{f.use}</p></li>)}</ul>
        {!fonts.length && <p>No matches. Try another name or choose All categories.</p>}
        <details className="ds-export"><summary>Export this direction</summary><p>Use these tokens with <code>directionStyles</code>. The font variables require the bundled font setup. This preview does not change the saved project default.</p><textarea aria-label="Design direction JSON" readOnly value={exportDirection(direction)} rows={12} /></details>
      </div></section>
    </main>
    <footer className="ds-footer ds-container"><p>FORGE / Design foundations</p><p>Concept content and original illustrations. Replace with verified project evidence.</p><a href="#design-content">Back to top ↑</a></footer>
  </div>;
}
