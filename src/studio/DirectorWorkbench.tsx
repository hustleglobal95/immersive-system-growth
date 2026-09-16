"use client";

import { useMemo, useState } from "react";
import { critiqueTreatment, directProject } from "@/src/platform/directorEngine";
import { compileDirectorTreatment } from "@/src/platform/directorCompiler";
import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";

const projectTypes: Array<{ id: DirectorBrief["projectType"]; label: string }> = [
  { id: "brand", label: "Brand" },
  { id: "product", label: "Product" },
  { id: "property", label: "Property" },
  { id: "hospitality", label: "Hospitality" },
  { id: "portfolio", label: "Portfolio / Studio" },
  { id: "saas", label: "SaaS" },
  { id: "commerce", label: "Editorial Commerce" },
  { id: "campaign", label: "Campaign" },
  { id: "automotive", label: "Automotive" },
  { id: "fashion", label: "Fashion" },
];

const tiers: DirectorBrief["tier"][] = ["cinematic", "immersive", "signature", "flagship"];

const starterBrief: DirectorBrief = {
  projectName: "Aster House",
  projectType: "property",
  tier: "signature",
  audience: "Affluent design-conscious buyers comparing premium urban residences.",
  objective: "Create emotional preference for the property and convert qualified interest into private inquiries.",
  primaryAction: "Request availability",
  brandTruth: "Quiet architectural confidence, elevated living and a strong relationship to the city skyline.",
  differentiators: ["Distinctive architecture", "Panoramic views", "Material restraint", "Private hospitality-level service"],
  constraints: ["Avoid generic luxury gold", "Mobile must preserve the core idea", "Use supplied architectural assets before creating unnecessary replacements"],
  existingAssets: [
    { id: "tower-glb", label: "Tower master GLB", type: "model", notes: "Hero-quality architectural model" },
    { id: "drone", label: "4K city drone footage", type: "video", notes: "Strong establishing material" },
    { id: "residence-renders", label: "Residence render set", type: "image", notes: "High-resolution interiors" },
    { id: "pool", label: "Pool marketing render", type: "image", notes: "Generic early marketing render" },
  ],
  references: [],
};

export function DirectorWorkbench() {
  const [brief, setBrief] = useState<DirectorBrief>(starterBrief);
  const [treatment, setTreatment] = useState<DirectorTreatment>(() => directProject(starterBrief));
  const [active, setActive] = useState<"territories" | "arc" | "bible" | "assets" | "critique">("territories");
  const compilation = useMemo(() => compileDirectorTreatment(treatment), [treatment]);
  const selected = treatment.territories.find((territory) => territory.id === treatment.selectedTerritoryId)!;

  const generate = () => setTreatment(directProject(brief));
  const chooseTerritory = (id: string) => {
    const regenerated = directProject(brief);
    const replacement = regenerated.territories.find((item) => item.id === id);
    if (!replacement) return;
    const next: DirectorTreatment = {
      ...regenerated,
      selectedTerritoryId: id,
      thesis: replacement.thesis,
      memoryStatement: `People will remember ${regenerated.projectName} because ${replacement.memory}.`,
      signatureMoment: {
        ...regenerated.signatureMoment,
        description: replacement.signatureMoment,
        whyMemorable: replacement.memory,
      },
      artBible: { ...regenerated.artBible, northStar: replacement.thesis },
    };
    setTreatment({ ...next, critique: critiqueTreatment(next) });
  };

  return (
    <section className="director">
      <aside className="director-brief">
        <p className="director-kicker">EXECUTIVE CREATIVE DIRECTION</p>
        <h1>Director</h1>
        <p className="director-muted">Decide what deserves to exist before Forge decides how to build it.</p>

        <label>Project
          <input value={brief.projectName} onChange={(event) => setBrief({ ...brief, projectName: event.target.value })} />
        </label>
        <div className="director-field-row">
          <label>Type
            <select value={brief.projectType} onChange={(event) => setBrief({ ...brief, projectType: event.target.value as DirectorBrief["projectType"] })}>
              {projectTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>Tier
            <select value={brief.tier} onChange={(event) => setBrief({ ...brief, tier: event.target.value as DirectorBrief["tier"] })}>
              {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </label>
        </div>
        <label>Audience
          <textarea value={brief.audience} onChange={(event) => setBrief({ ...brief, audience: event.target.value })} />
        </label>
        <label>Objective
          <textarea value={brief.objective} onChange={(event) => setBrief({ ...brief, objective: event.target.value })} />
        </label>
        <label>Brand truth
          <textarea value={brief.brandTruth} onChange={(event) => setBrief({ ...brief, brandTruth: event.target.value })} />
        </label>
        <label>Primary action
          <input value={brief.primaryAction} onChange={(event) => setBrief({ ...brief, primaryAction: event.target.value })} />
        </label>
        <button className="director-generate" onClick={generate}>Direct this project</button>

        <div className="director-status">
          <span>Creative score</span><strong>{treatment.critique.overall}/10</strong>
          <span>Creative plan</span><strong>{compilation.creativePlan.scenes.length} beats</strong>
        </div>
      </aside>

      <div className="director-stage">
        <header className="director-stage__header">
          <div>
            <span className="director-kicker">LOCKED THESIS</span>
            <h2>{treatment.thesis}</h2>
            <p>{treatment.memoryStatement}</p>
          </div>
          <div className="director-signature">
            <span>SIGNATURE MOMENT</span>
            <strong>{treatment.signatureMoment.name}</strong>
            <p>{treatment.signatureMoment.description}</p>
          </div>
        </header>

        <nav className="director-tabs">
          {(["territories", "arc", "bible", "assets", "critique"] as const).map((tab) => (
            <button key={tab} className={active === tab ? "is-active" : ""} onClick={() => setActive(tab)}>{tab}</button>
          ))}
        </nav>

        {active === "territories" && <div className="director-panel">
          <div className="director-section-heading"><span>01</span><div><h3>Creative territories</h3><p>Three credible directions. One recommendation.</p></div></div>
          <div className="director-territories">
            {treatment.territories.map((territory) => {
              const chosen = territory.id === treatment.selectedTerritoryId;
              return <article key={territory.id} className={chosen ? "director-card is-selected" : "director-card"}>
                <div className="director-card__top"><span>{chosen ? "DIRECTOR'S PICK" : "TERRITORY"}</span><button onClick={() => chooseTerritory(territory.id)}>{chosen ? "Selected" : "Choose"}</button></div>
                <h4>{territory.name}</h4>
                <p className="director-card__line">{territory.oneLine}</p>
                <p>{territory.strategicReason}</p>
                <div className="director-score-grid">
                  {Object.entries(territory.scores).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
                </div>
                <div className="director-card__signature"><span>Memory</span><p>{territory.memory}</p></div>
                <div className="director-card__signature"><span>Signature</span><p>{territory.signatureMoment}</p></div>
                <small>{territory.risk}</small>
              </article>;
            })}
          </div>
          <div className="director-selected-rationale"><span>WHY THIS DIRECTION</span><p>{selected.strategicReason}</p></div>
        </div>}

        {active === "arc" && <div className="director-panel">
          <div className="director-section-heading"><span>02</span><div><h3>Emotional cut</h3><p>Intensity is directed. The 10/10 moment is earned.</p></div></div>
          <div className="director-arc">
            {treatment.emotionalArc.map((beat, index) => <article key={beat.id} className="director-beat">
              <div className="director-beat__index">{String(index + 1).padStart(2, "0")}</div>
              <div className="director-beat__body"><div><strong>{beat.label}</strong><span>{beat.emotion}</span></div><p>{beat.purpose}</p><small>{beat.visitorQuestion}</small></div>
              <div className="director-meter"><i style={{ width: `${beat.intensity * 10}%` }} /><span>{beat.intensity}/10</span></div>
            </article>)}
          </div>
        </div>}

        {active === "bible" && <div className="director-panel">
          <div className="director-section-heading"><span>03</span><div><h3>Director's bible</h3><p>One visual grammar, then a shot-by-shot interpretation.</p></div></div>
          <div className="director-bible-grid">
            <Bible title="Camera" items={treatment.grammar.camera} />
            <Bible title="Motion" items={treatment.grammar.motion} />
            <Bible title="Typography" items={treatment.grammar.typography} />
            <Bible title="Interaction" items={treatment.grammar.interaction} />
            <Bible title="Transitions" items={treatment.grammar.transitions} />
            <Bible title="No-go" items={treatment.noGoRules} danger />
          </div>
          <div className="director-shots">
            {treatment.shotBible.map((shot) => <article key={shot.id} className={shot.reserveForSignatureMoment ? "director-shot is-signature" : "director-shot"}>
              <span>{shot.id}</span><div><h4>{shot.title}</h4><p>{shot.purpose}</p><dl><dt>Subject</dt><dd>{shot.subject}</dd><dt>Frame</dt><dd>{shot.framing}</dd><dt>Lens</dt><dd>{shot.lensCharacter}</dd><dt>Move</dt><dd>{shot.movement}</dd></dl></div>
            </article>)}
          </div>
        </div>}

        {active === "assets" && <div className="director-panel">
          <div className="director-section-heading"><span>04</span><div><h3>Production allocation</h3><p>Spend ambition where memory is created.</p></div></div>
          <div className="director-budget">
            {Object.entries(treatment.budgetAllocation).map(([key, value]) => <div key={key}><span>{key}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}
          </div>
          <div className="director-assets">
            {treatment.assets.map((asset) => <article key={asset.id}><div><strong>{asset.label}</strong><span>{asset.quality}</span></div><p>{asset.role}</p><footer><b>{asset.productionDecision}</b><span>creative value {asset.creativeValue}/10</span></footer></article>)}
          </div>
        </div>}

        {active === "critique" && <div className="director-panel">
          <div className="director-section-heading"><span>05</span><div><h3>Director critique</h3><p>The treatment is not finished because it exists. It must survive criticism.</p></div></div>
          <div className="director-critique-score"><strong>{treatment.critique.overall}</strong><span>/ 10</span><p>creative readiness</p></div>
          <div className="director-dimensions">
            {Object.entries(treatment.critique).filter(([, value]) => typeof value === "number" && value !== treatment.critique.overall).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}
          </div>
          <CritiqueList title="Blockers" items={treatment.critique.blockers} severity="blocker" />
          <CritiqueList title="Warnings" items={treatment.critique.warnings} severity="warning" />
          <CritiqueList title="Final cut" items={treatment.critique.cuts} severity="cut" />
          <CritiqueList title="Director directives" items={treatment.critique.directives} severity="directive" />
          <div className="director-memory-test"><span>PORTFOLIO / MEMORY TEST</span><h4>{treatment.memoryStatement}</h4><p>If this sentence is not convincing at final cut, the project is not creatively finished.</p></div>
        </div>}
      </div>
    </section>
  );
}

function Bible({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return <article className={danger ? "director-bible is-danger" : "director-bible"}><span>{title}</span>{items.map((item) => <p key={item}>{item}</p>)}</article>;
}

function CritiqueList({ title, items, severity }: { title: string; items: string[]; severity: string }) {
  return <section className={`director-critique-list is-${severity}`}><h4>{title}</h4>{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p>None.</p>}</section>;
}
