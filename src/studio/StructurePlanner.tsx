"use client";

import { useMemo, useState } from "react";
import {
  auditStructure,
  createStructurePlan,
  structureArchetypeCatalog,
  structureTierCatalog,
  type SiteArchetypeId,
  type StructureTier,
} from "@/src/platform/siteStructure";

export function StructurePlanner() {
  const [archetype, setArchetype] = useState<SiteArchetypeId>("brand-flagship");
  const [tier, setTier] = useState<StructureTier>("immersive");
  const plan = useMemo(() => createStructurePlan(archetype, tier), [archetype, tier]);
  const audit = useMemo(() => auditStructure(plan), [plan]);

  return (
    <section className="structure-planner studio-card" aria-labelledby="structure-planner-title">
      <div className="studio-card__head">
        <div><span>STRUCTURE ENGINE</span><h2 id="structure-planner-title">Website architecture planner</h2></div>
        <output>{audit.score}/100 structure</output>
      </div>

      <div className="structure-planner__controls">
        <label>Project type<select value={archetype} onChange={(event) => setArchetype(event.target.value as SiteArchetypeId)}>{structureArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Tier<select value={tier} onChange={(event) => setTier(event.target.value as StructureTier)}>{structureTierCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>

      <div className="structure-planner__summary">
        <div><span>STRUCTURE</span><strong>{plan.name}</strong><p>{plan.description}</p></div>
        <dl>
          <div><dt>Navigation</dt><dd>{plan.navigation}</dd></div>
          <div><dt>Pages</dt><dd>{plan.pages.length}</dd></div>
          <div><dt>Sections</dt><dd>{plan.sections.length}</dd></div>
          <div><dt>Scene target</dt><dd>{plan.targetSceneRange[0]}–{plan.targetSceneRange[1]}</dd></div>
        </dl>
      </div>

      <div className="structure-planner__pages" aria-label="Recommended site map">
        {plan.pages.map((page) => <article key={page.id} data-primary={page.primary || undefined}><span>{page.primary ? "PRIMARY" : "PAGE"}</span><strong>{page.label}</strong><p>{page.purpose}</p></article>)}
      </div>

      <div className="structure-planner__sequence" aria-label="Recommended page sequence">
        {plan.sections.map((item, index) => <article key={item.id} data-energy={item.energy}>
          <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.role}</small><h3>{item.label}</h3></div><b>{item.energy}</b></header>
          <p>{item.purpose}</p>
          <dl>
            <div><dt>User asks</dt><dd>{item.userQuestion}</dd></div>
            <div><dt>Evidence</dt><dd>{item.evidence.join(" · ")}</dd></div>
            <div><dt>Media</dt><dd>{item.preferredMedia.join(" · ")}</dd></div>
            <div><dt>Motion</dt><dd>{item.motion.join(" · ")}</dd></div>
          </dl>
          <footer><span>{item.density} density</span><span>conversion {item.conversionWeight}/3</span>{item.optional && <span>optional</span>}</footer>
        </article>)}
      </div>

      <div className="structure-planner__audit">
        <div><span>AUDIT</span><strong>{audit.issues.length ? `${audit.issues.length} structural notes` : "Structure passes baseline rules"}</strong></div>
        {audit.issues.length ? <ul>{audit.issues.map((issue, index) => <li key={`${issue.level}-${index}`} data-level={issue.level}><b>{issue.level}</b><span>{issue.message}</span></li>)}</ul> : <p>No sequencing, proof or conversion-order problems detected by the baseline audit.</p>}
      </div>

      <details className="structure-planner__rules"><summary>Structural rules</summary><ol>{plan.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol></details>
    </section>
  );
}
