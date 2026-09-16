"use client";

import { useState } from "react";
import type { DirectorBrief } from "@/src/platform/directorSchema";
import { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";

const starterBrief: DirectorBrief = {
  projectName: "Aster House",
  projectType: "property",
  tier: "signature",
  client: "Aster Development",
  audience: "Affluent design-conscious buyers comparing premium urban residences who value privacy, architecture and credible proof.",
  objective: "Create emotional preference for the property and convert qualified interest into private inquiries.",
  primaryAction: "Request availability",
  brandTruth: "Quiet architectural confidence, elevated living and a strong relationship to the city skyline.",
  differentiators: ["Distinctive architecture", "Panoramic views", "Private hospitality-level service"],
  constraints: ["Avoid generic luxury gold", "Mobile must preserve the core idea", "Use supplied architectural assets first"],
  existingAssets: [
    { id: "tower-glb", label: "Tower master GLB", type: "model", notes: "Hero-quality architectural model" },
    { id: "drone", label: "4K city drone footage", type: "video", notes: "Strong establishing material" },
    { id: "mark", label: "Aster horizon mark", type: "brand", notes: "Recognizable horizontal brand device used in sales material" },
  ],
  references: [{ label: "Architectural film", lesson: "Use patient threshold movement and stable horizon; do not copy grading or composition." }],
};

type IntelligenceTab = "verdict" | "council" | "memory" | "originality" | "stress" | "production" | "decisions";

export function DirectorIntelligenceWorkbench() {
  const [brief, setBrief] = useState<DirectorBrief>(starterBrief);
  const [result, setResult] = useState(() => runDirectorIntelligence({ brief: starterBrief }));
  const [tab, setTab] = useState<IntelligenceTab>("verdict");
  const report = result.report;
  const selected = report.treatment.territories.find((item) => item.id === report.treatment.selectedTerritoryId)!;

  const run = () => setResult(runDirectorIntelligence({ brief }));

  return <section className="director-intelligence">
    <aside className="director-intelligence__brief">
      <p className="director-kicker">DIRECTOR INTELLIGENCE V2</p>
      <h1>Creative review board</h1>
      <p className="director-muted">The system is rewarded for rejecting weak direction, not for always producing an answer.</p>
      <label>Project<input value={brief.projectName} onChange={(e) => setBrief({ ...brief, projectName: e.target.value })} /></label>
      <div className="director-field-row"><label>Type<select value={brief.projectType} onChange={(e) => setBrief({ ...brief, projectType: e.target.value as DirectorBrief["projectType"] })}>{["brand","product","property","hospitality","portfolio","saas","commerce","campaign","automotive","fashion"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Tier<select value={brief.tier} onChange={(e) => setBrief({ ...brief, tier: e.target.value as DirectorBrief["tier"] })}>{["cinematic","immersive","signature","flagship"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <label>Audience<textarea value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} /></label>
      <label>Objective<textarea value={brief.objective} onChange={(e) => setBrief({ ...brief, objective: e.target.value })} /></label>
      <label>Brand truth<textarea value={brief.brandTruth} onChange={(e) => setBrief({ ...brief, brandTruth: e.target.value })} /></label>
      <label>Differentiators<textarea value={brief.differentiators.join("\n")} onChange={(e) => setBrief({ ...brief, differentiators: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></label>
      <button className="director-generate" onClick={run}>Run full intelligence</button>
      <div className="director-intelligence__status"><span>Verdict</span><strong>{report.verdict}</strong><span>Ceiling</span><strong>{report.ceiling.current} → {report.ceiling.projected}</strong><span>Stress</span><strong>{report.stress.resilienceScore}/10</strong><span>Evidence</span><strong>{Math.round(report.evidence.confidence * 100)}%</strong></div>
    </aside>

    <div className="director-intelligence__stage">
      <header className="director-intelligence__hero"><div><span className="director-kicker">SELECTED DIRECTION</span><h2>{selected.name}</h2><p>{report.treatment.thesis}</p></div><div className={`director-intelligence__verdict is-${report.verdict.toLowerCase().replaceAll(" ", "-")}`}><span>DIRECTOR VERDICT</span><strong>{report.verdict}</strong><small>{report.blockers.length} blocker{report.blockers.length === 1 ? "" : "s"}</small></div></header>
      <nav className="director-tabs">{(["verdict","council","memory","originality","stress","production","decisions"] as const).map((item) => <button key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === "verdict" && <Panel title="Verdict & evidence"><MetricGrid items={[["Concept", report.selectedEvaluation.scores.conceptualClarity],["Brand",report.selectedEvaluation.scores.brandAdherence],["Distinctive",report.selectedEvaluation.scores.distinctiveness],["Portfolio novelty",report.selectedEvaluation.scores.portfolioNovelty],["Feasibility",report.selectedEvaluation.scores.productionFeasibility],["Mobile",report.selectedEvaluation.scores.mobileIntegrity]]} />
        <List title="Blockers" items={report.blockers} /><List title="Unknowns" items={report.evidence.unknowns} /><List title="Unsupported hypotheses" items={report.evidence.unsupportedClaims} /></Panel>}

      {tab === "council" && <Panel title="Director Council"><div className="director-intelligence__council">{report.selectedEvaluation.critiques.map((critique) => <article key={critique.role}><div><strong>{critique.role}</strong><span>{critique.recommendation}</span></div><p>{critique.concerns[0] ?? critique.strengths[0] ?? "No material concern."}</p>{critique.blockers.map((blocker) => <small key={blocker}>{blocker}</small>)}</article>)}</div><List title="Preserved disagreement" items={report.selectedEvaluation.disagreements} /></Panel>}

      {tab === "memory" && <Panel title="Precedent & portfolio memory"><div className="director-intelligence__cards">{report.precedents.map((item) => <article key={item.precedent.id}><span>{item.precedent.mediums.join(" · ")}</span><h4>{item.precedent.title}</h4><p>{item.precedent.transferableLessons[0]}</p><small>Transfer score {Math.round(item.score * 100)}%</small></article>)}</div><List title="Portfolio collisions" items={report.collisions.length ? report.collisions.slice(0,5).map((c) => `${c.projectId}: ${c.dimensions.overall}% — ${c.verdict} — ${c.reason}`) : ["No prior portfolio fingerprints supplied for this session."]} /></Panel>}

      {tab === "originality" && <Panel title="Originality & cliché intelligence"><MetricGrid items={Object.entries(report.originality).filter(([,v]) => typeof v === "number") as Array<[string,number]>} /><List title={`Category cliché scan — density ${report.cliches.density}/10`} items={report.cliches.detected.length ? report.cliches.detected : ["No material category cliché detected by the current catalog."]} /><List title="Novelty sources" items={report.originality.sources} /></Panel>}

      {tab === "stress" && <Panel title="Concept stress lab"><div className="director-intelligence__stress">{report.stress.results.map((item) => <article key={item.id} className={`is-${item.status.toLowerCase().replaceAll(" ", "-")}`}><div><strong>{item.label}</strong><span>{item.status}</span></div><p>{item.reason}</p>{item.mitigation && <small>{item.mitigation}</small>}</article>)}</div></Panel>}

      {tab === "production" && <Panel title="Creative ceiling & production leverage"><div className="director-intelligence__ceiling"><strong>{report.ceiling.current}</strong><span>current ceiling</span><b>→ {report.ceiling.projected}</b></div><List title="Highest-leverage upgrades" items={report.ceiling.highestLeverageUpgrades} /><div className="director-intelligence__leverage">{report.leverage.slice(0,8).map((item) => <article key={item.id}><div><strong>{item.label}</strong><span>{item.leverage}/10</span></div><p>{item.reason}</p><small>{item.recommendation} · est. ${item.estimatedCost}</small></article>)}</div><List title="Asset blockers" items={report.assetGap.blockers.length ? report.assetGap.blockers : ["No critical missing hero/signature asset."]} /></Panel>}

      {tab === "decisions" && <Panel title="Creative decision ledger"><div className="director-intelligence__decisions">{report.decisions.decisions.map((decision) => <article key={decision.id}><div><span>{decision.id}</span><strong>{decision.status}</strong></div><h4>{decision.decision}</h4><ol>{decision.whyLadder.map((why) => <li key={why}>{why}</li>)}</ol></article>)}</div><List title="Client-defense questions" items={report.defense.likelyQuestions.map((item) => `${item.question} — ${item.answer}`)} /></Panel>}
    </div>
  </section>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="director-panel"><div className="director-section-heading"><span>V2</span><div><h3>{title}</h3><p>Judgment before production.</p></div></div>{children}</section>; }
function MetricGrid({ items }: { items: Array<[string, number]> }) { return <div className="director-dimensions">{items.map(([key,value]) => <div key={key}><span>{key}</span><strong>{Number(value).toFixed(1)}</strong></div>)}</div>; }
function List({ title, items }: { title: string; items: string[] }) { return <section className="director-critique-list"><h4>{title}</h4>{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p>None.</p>}</section>; }
