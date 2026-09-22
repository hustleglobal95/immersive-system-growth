"use client";

import { useState, type ReactNode } from "react";
import type { DirectorBrief } from "@/src/platform/directorSchema";
import type { DirectorHumanApprovals, DirectorHumanGateId } from "@/src/platform/director-intelligence/humanGates";
import { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";
import { useCreativeIntelligenceContext } from "@/src/studio/useCreativeIntelligenceContext";

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

type IntelligenceTab = "verdict" | "dna" | "art" | "disciplines" | "mutations" | "hierarchy" | "council" | "memory" | "originality" | "stress" | "production" | "decisions";

export function DirectorIntelligenceWorkbench() {
  const [brief, setBrief] = useState<DirectorBrief>(starterBrief);
  const [approvals, setApprovals] = useState<DirectorHumanApprovals>({});
  const [finalCutRequested, setFinalCutRequested] = useState(false);
  const [result, setResult] = useState(() => runDirectorIntelligence({ brief: starterBrief }));
  const [tab, setTab] = useState<IntelligenceTab>("verdict");
  const creativeContext=useCreativeIntelligenceContext(brief.projectName);
  const report = result.report;
  const selected = report.treatment.territories.find((item) => item.id === report.treatment.selectedTerritoryId)!;

  const run = (nextApprovals = approvals, nextFinalCut = finalCutRequested) => setResult(runDirectorIntelligence({
    brief,
    approvals:nextApprovals,
    finalCutRequested:nextFinalCut,
    ...(creativeContext.tasteLayers ? {tasteLayers:creativeContext.tasteLayers}:{}),
    ...(creativeContext.memory?.nodes.length ? {memory:creativeContext.memory}:{}),
    ...(creativeContext.portfolio?.length ? {portfolio:creativeContext.portfolio}:{}),
  }));
  const approveGate = (id: DirectorHumanGateId) => {
    const next: DirectorHumanApprovals = { ...approvals };
    let nextFinalCut = finalCutRequested;
    if (id === "brand-truth") next.brandTruthConfirmed = true;
    if (id === "territory-lock") next.lockedTerritoryId = report.treatment.selectedTerritoryId;
    if (id === "asset-spend") next.assetSpendApproved = true;
    if (id === "decision-reversal") next.approvedDecisionReversals = report.decisions.decisions.filter((decision) => decision.status === "locked" && decision.supersedes).map((decision) => decision.id);
    if (id === "final-cut") { next.finalCutApproved = true; nextFinalCut = true; }
    setApprovals(next);
    setFinalCutRequested(nextFinalCut);
    run(next, nextFinalCut);
  };

  return <section className="director-intelligence">
    <aside className="director-intelligence__brief">
      <p className="director-kicker">DIRECTOR INTELLIGENCE V2</p>
      <h1>Creative review board</h1>
      <p className="director-muted">The system is rewarded for rejecting weak direction, not for always producing an answer.</p>
      <small className="director-intelligence__memory-status">{creativeContext.loading ? "Loading studio creative memory + portfolio…" : creativeContext.error ? "Creative memory/portfolio unavailable · Signature/Flagship implementation must remain held" : `${creativeContext.counts?.priorProjects ?? 0} prior project${(creativeContext.counts?.priorProjects ?? 0)===1?"":"s"} · ${creativeContext.counts?.portfolioFingerprints ?? 0} portfolio fingerprint${(creativeContext.counts?.portfolioFingerprints ?? 0)===1?"":"s"} · ${creativeContext.counts?.tasteLayers ?? 0} taste layer${(creativeContext.counts?.tasteLayers ?? 0)===1?"":"s"} · applied on next intelligence run`}</small>
      <label>Project<input value={brief.projectName} onChange={(e) => setBrief({ ...brief, projectName: e.target.value })} /></label>
      <div className="director-field-row"><label>Type<select value={brief.projectType} onChange={(e) => setBrief({ ...brief, projectType: e.target.value as DirectorBrief["projectType"] })}>{["brand","product","property","hospitality","portfolio","saas","commerce","campaign","automotive","fashion"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Tier<select value={brief.tier} onChange={(e) => setBrief({ ...brief, tier: e.target.value as DirectorBrief["tier"] })}>{["cinematic","immersive","signature","flagship"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <label>Audience<textarea value={brief.audience} onChange={(e) => setBrief({ ...brief, audience: e.target.value })} /></label>
      <label>Objective<textarea value={brief.objective} onChange={(e) => setBrief({ ...brief, objective: e.target.value })} /></label>
      <label>Brand truth<textarea value={brief.brandTruth} onChange={(e) => setBrief({ ...brief, brandTruth: e.target.value })} /></label>
      <label>Differentiators<textarea value={brief.differentiators.join("\n")} onChange={(e) => setBrief({ ...brief, differentiators: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></label>
      <button className="director-generate" onClick={() => run()}>Run planning intelligence</button>
      <div className="director-intelligence__status"><span>Planning</span><strong>{report.planningDisposition}</strong><span>Judgment</span><strong>{report.verdict}</strong><span>Hierarchy</span><strong>{report.hierarchy.overallScore}/10</strong><span>Creative ceiling proxy</span><strong>{result.creativeCeiling.current} → {result.creativeCeiling.projected}</strong><span>Evidence coverage</span><strong>{Math.round(report.evidence.coverage * 100)}%</strong><span>Production</span><strong>{result.productionPlan.readiness.readyForProduction ? "AUTHORIZED" : "HELD"}</strong></div>
    </aside>

    <div className="director-intelligence__stage">
      <header className="director-intelligence__hero"><div><span className="director-kicker">SELECTED DIRECTION</span><h2>{selected.name}</h2><p>{report.treatment.thesis}</p></div><div className={`director-intelligence__verdict is-${report.verdict.toLowerCase().replaceAll(" ", "-")}`}><span>RENDERED CREATIVE JUDGMENT</span><strong>{report.verdict}</strong><small>Planning {report.planningDisposition} · {report.judgment.status === "verified" ? `${Math.round((report.judgment.confidence ?? 0) * 100)}% calibrated preference confidence` : "no calibrated rendered judgment supplied"}</small></div></header>
      <nav className="director-tabs">{(["verdict","dna","art","disciplines","mutations","hierarchy","council","memory","originality","stress","production","decisions"] as const).map((item) => <button key={item} className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === "verdict" && <Panel title="Planning proxies & judgment evidence"><MetricGrid items={[["Planning proxy · concept", report.selectedEvaluation.scores.conceptualClarity],["Planning proxy · brand",report.selectedEvaluation.scores.brandAdherence],["Planning proxy · distinctiveness",report.selectedEvaluation.scores.distinctiveness],["Planning proxy · portfolio novelty",report.selectedEvaluation.scores.portfolioNovelty],["Planning proxy · feasibility",report.selectedEvaluation.scores.productionFeasibility],["Planning proxy · mobile",report.selectedEvaluation.scores.mobileIntegrity]]} /><List title="Rendered judgment" items={report.judgment.reasons} /><List title="Judgment blockers" items={report.judgment.blockers.length ? report.judgment.blockers : [report.judgment.status === "verified" ? "No rendered judgment blocker." : "No verdict can be issued until rendered evidence is reviewed."]} />
        <List title="Planning / judgment blockers" items={report.blockers} /><List title="Unknowns" items={report.evidence.unknowns} /><List title="Unsupported hypotheses" items={report.evidence.unsupportedClaims} />
        <section className="director-intelligence__gates"><h4>Human authority gates</h4>{result.humanGates.gates.map((gate) => <article key={gate.id}><div><strong>{gate.label}</strong><span>{gate.required ? gate.satisfied ? "APPROVED" : "REQUIRED" : "NOT REQUIRED"}</span></div><p>{gate.reason}</p>{gate.required && !gate.satisfied && <button onClick={() => approveGate(gate.id)}>Approve deliberately</button>}</article>)}</section>
      </Panel>}

      {tab === "dna" && <Panel title="Creative DNA">
        <div className="director-intelligence__north-star"><span>NORTH STAR</span><strong>{result.creativeDNA.northStar}</strong><p>{result.creativeDNA.contradiction}</p><small>Memory promise: {result.creativeDNA.memoryPromise}</small></div>
        <div className="director-intelligence__dna-grid">
          <DNAGroup title="Composition" values={result.creativeDNA.composition} />
          <DNAGroup title="Typography" values={result.creativeDNA.typography} />
          <DNAGroup title="Color" values={result.creativeDNA.color} />
          <DNAGroup title="Image" values={result.creativeDNA.image} />
          <DNAGroup title="3D / Material" values={result.creativeDNA.threeD} />
          <DNAGroup title="Motion" values={result.creativeDNA.motion} />
          <DNAGroup title="Lighting" values={result.creativeDNA.lighting} />
          <DNAGroup title="Interaction" values={result.creativeDNA.interaction} />
          <DNAGroup title="Sound" values={result.creativeDNA.sound} />
        </div>
        <List title="Anti-patterns" items={result.creativeDNA.antiPatterns} />
        <List title="Cross-domain precedent transfers" items={result.creativeDNA.precedentTransfers.length ? result.creativeDNA.precedentTransfers : ["No cross-domain transfer selected."]} />
      </Panel>}

      {tab === "art" && <Panel title="Art Director">
        <div className="director-intelligence__north-star"><span>VISUAL RULE</span><strong>{result.artDirection.visualRule}</strong><p>{result.artDirection.hierarchyRule}</p></div>
        <div className="director-intelligence__art-grid">
          <List title="Typography system" items={result.artDirection.typeSystem} />
          <List title="Color system" items={result.artDirection.colorSystem} />
          <List title="Image system" items={result.artDirection.imageSystem} />
          <List title="Material system" items={result.artDirection.materialSystem} />
          <List title="Lighting system" items={result.artDirection.lightingSystem} />
          <List title="Motion system" items={result.artDirection.motionSystem} />
        </div>
        <div className="director-intelligence__scene-frames">{result.artDirection.sceneFrames.map((frame)=><article key={frame.beatId}><div><span>{frame.label}</span><strong>{frame.intensity}/10</strong></div><p>{frame.dominant}</p><small>{frame.composition}</small><small>{frame.colorLightBehavior}</small><small>{frame.motionBehavior}</small></article>)}</div>
        <List title="Reject" items={result.artDirection.reject} />
      </Panel>}

      {tab === "disciplines" && <Panel title="Specialist Creative Directors">
        <div className="director-intelligence__discipline-grid">{Object.values(result.disciplineDirections).map((direction)=><article key={direction.id}><span>{direction.id.toUpperCase()}</span><h4>{direction.premise}</h4><ul>{direction.rules.slice(0,5).map((rule)=><li key={rule}>{rule}</li>)}</ul><small>AVOID</small>{direction.avoid.slice(0,2).map((rule)=><p key={rule}>{rule}</p>)}</article>)}</div>
      </Panel>}

      {tab === "mutations" && <Panel title="Creative Mutation Engine">
        <p className="director-muted">Forge deliberately challenges the first strong idea before production. A mutation may change the mechanism, but it must preserve brand truth, memory and conversion intent.</p>
        <div className="director-intelligence__mutation-grid">{result.creativeMutations.map((mutation)=><article key={mutation.id}><div><span>{mutation.score}/10</span><small>RISK {mutation.productionRisk}/10</small></div><h4>{mutation.title}</h4><p>{mutation.question}</p><strong>{mutation.systems.join(" · ")}</strong></article>)}</div>
      </Panel>}

      {tab === "hierarchy" && <Panel title="Hierarchy Engine"><MetricGrid items={[["Overall", report.hierarchy.overallScore], ...report.hierarchy.levels.map((level) => [level.label, level.score] as [string, number])]} />
        <List title="Recommended narrative" items={[report.hierarchy.recommendedNarrative.join(" → ")]} />
        <div className="director-intelligence__cards">{report.hierarchy.levels.map((level) => <article key={level.id}><span>{level.status.toUpperCase()} · {level.score}/10</span><h4>{level.label}</h4><p>{level.principle}</p><small>Dominant: {level.dominant}</small>{level.issues.map((item) => <small key={item.id}>{item.severity.toUpperCase()}: {item.message}</small>)}</article>)}</div>
        <List title="Hierarchy blockers" items={report.hierarchy.blockers.length ? report.hierarchy.blockers : ["No hierarchy blocker prevents planning advancement."]} />
        <List title="Hierarchy warnings" items={report.hierarchy.warnings.length ? report.hierarchy.warnings : ["No material hierarchy warning."]} />
        <List title="Attention budget" items={report.hierarchy.attentionRules.map((rule) => `${rule.owner}: ${rule.whenActive} Reduce ${rule.reduce.join(", ")}. ${rule.reason}`)} />
        <List title="Cross-system directives" items={report.hierarchy.directives} />
      </Panel>}

      {tab === "council" && <Panel title="Planning lenses"><div className="director-intelligence__council">{report.selectedEvaluation.critiques.map((critique) => <article key={critique.role}><div><strong>{critique.role}</strong><span>{critique.recommendation}</span></div><p>{critique.concerns[0] ?? critique.strengths[0] ?? "No material concern."}</p><small>{critique.basis} · evidence coverage {Math.round(critique.evidenceCoverage*100)}%</small>{critique.blockers.map((blocker) => <small key={blocker}>{blocker}</small>)}</article>)}</div><List title="Preserved disagreement" items={report.selectedEvaluation.disagreements} /></Panel>}

      {tab === "memory" && <Panel title="Precedent, portfolio & taste memory"><div className="director-intelligence__cards">{report.precedents.map((item) => <article key={item.precedent.id}><span>{item.precedent.mediums.join(" · ")}</span><h4>{item.precedent.title}</h4><p>{item.precedent.transferableLessons[0]}</p><small>Transfer score {Math.round(item.score * 100)}%</small></article>)}</div><List title={`Portfolio originality gate — ${result.originalityGate.passed ? "CLEAR" : "HELD"}`} items={result.originalityGate.blockers.length ? result.originalityGate.blockers : report.collisions.length ? report.collisions.slice(0,5).map((item) => `${item.projectId}: ${item.dimensions.overall}% — ${item.verdict} — ${item.reason}`) : ["No material portfolio collision detected."]} /><List title={`Creative-memory repetition — ${result.creativeMemory.verdict}`} items={result.creativeMemory.antiRepeat.length ? result.creativeMemory.antiRepeat : ["No material house-style repetition detected in supplied creative memory."]} /><List title="Layered taste" items={[result.tasteModel.rule,...result.tasteModel.contributions.map((item)=>`${item.layer}: weight ${item.weight.toFixed(2)} · confidence ${Math.round(item.confidence*100)}%`),`Selected territory influence ${result.tasteCalibration.adjustment.toFixed(2)} (capped ±0.50).`]} /></Panel>}

      {tab === "originality" && <Panel title="Originality, visual distance & cliché intelligence"><MetricGrid items={Object.entries(report.originality).filter(([,v]) => typeof v === "number") as Array<[string,number]>} /><div className="director-intelligence__language-grid">{result.visualLanguages.map((language)=><article key={language.territoryId}><span>{language.modeLabel}</span><h4>{language.territoryName}</h4><p>{language.premise}</p><small>{language.graphicDevices.join(" · ")}</small></article>)}</div><List title={`Territory distance — minimum ${result.visualLanguageDivergence.minimumDistance}% / required ${result.visualLanguageDivergence.threshold}%`} items={result.visualLanguageDivergence.matrix.map((item)=>`${item.a} ↔ ${item.b}: ${item.overall}%`)} /><List title={`Category cliché scan — density ${report.cliches.density}/10`} items={report.cliches.detected.length ? report.cliches.detected : ["No material category cliché detected by the current catalog."]} /><List title="Novelty sources" items={report.originality.sources} /></Panel>}

      {tab === "stress" && <Panel title="Concept stress lab"><div className="director-intelligence__stress">{report.stress.results.map((item) => <article key={item.id} className={`is-${item.status.toLowerCase().replaceAll(" ", "-")}`}><div><strong>{item.label}</strong><span>{item.status}</span></div><p>{item.reason}</p>{item.mitigation && <small>{item.mitigation}</small>}</article>)}</div></Panel>}

      {tab === "production" && <Panel title="Creative ceiling & production leverage"><div className="director-intelligence__ceiling"><strong>{result.creativeCeiling.current}</strong><span>creative ceiling</span><b>→ {result.creativeCeiling.projected}</b></div><MetricGrid items={Object.entries(result.creativeCeiling.dimensions) as Array<[string,number]>} /><List title="Creative bottlenecks" items={result.creativeCeiling.bottlenecks.map((item)=>`${item.dimension} ${item.score}/10 — ${item.reason}`)} /><List title="Highest-leverage creative upgrades" items={result.creativeCeiling.highestLeverage.map((item)=>`+${item.gain} ${item.dimension}: ${item.action}`)} /><div className="director-intelligence__leverage">{report.leverage.slice(0,8).map((item) => <article key={item.id}><div><strong>{item.label}</strong><span>{item.leverage}/10</span></div><p>{item.reason}</p><small>{item.recommendation} · est. ${item.estimatedCost}</small></article>)}</div><List title="Asset blockers" items={report.assetGap.blockers.length ? report.assetGap.blockers : ["No critical missing hero/signature asset."]} /><button className="director-generate" onClick={() => { setFinalCutRequested(true); const next = { ...approvals }; run(next, true); }}>Request final-cut review</button></Panel>}

      {tab === "decisions" && <Panel title="Creative decision ledger"><div className="director-intelligence__decisions">{report.decisions.decisions.map((decision) => <article key={decision.id}><div><span>{decision.id}</span><strong>{decision.status}</strong></div><h4>{decision.decision}</h4><ol>{decision.whyLadder.map((why) => <li key={why}>{why}</li>)}</ol></article>)}</div><List title="Client-defense questions" items={report.defense.likelyQuestions.map((item) => `${item.question} — ${item.answer}`)} /></Panel>}
    </div>
  </section>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="director-panel"><div className="director-section-heading"><span>V2</span><div><h3>{title}</h3><p>Deterministic planning first; rendered judgment only with evidence.</p></div></div>{children}</section>; }
function MetricGrid({ items }: { items: Array<[string, number]> }) { return <div className="director-dimensions">{items.map(([key,value]) => <div key={key}><span>{key}</span><strong>{Number(value).toFixed(1)}</strong></div>)}</div>; }
function List({ title, items }: { title: string; items: string[] }) { return <section className="director-critique-list"><h4>{title}</h4>{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p>None.</p>}</section>; }


function DNAGroup({title,values}:{title:string;values:object}) {
  return <article><span>{title.toUpperCase()}</span>{Object.entries(values).map(([key,value])=><div key={key}><small>{key}</small><p>{String(value)}</p></div>)}</article>;
}
