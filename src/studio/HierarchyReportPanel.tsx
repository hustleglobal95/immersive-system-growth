import type { HierarchyReport } from "@/src/platform/hierarchyEngine";

export function HierarchyReportPanel({ report }: { report: HierarchyReport }) {
  return <section className="creative-agent__hierarchy">
    <header className="creative-agent__hierarchy-head">
      <div><span>HIERARCHY ENGINE</span><h3>Importance propagates downward.</h3></div>
      <div className={report.ready ? "is-ready" : "is-blocked"}><strong>{report.overallScore}/10</strong><span>{report.ready ? "READY" : "HELD"}</span></div>
    </header>

    <div className="creative-agent__hierarchy-contract">
      <article><span>PRIMARY OBJECTIVE</span><p>{report.primaryObjective}</p></article>
      <article><span>PRIMARY MEMORY</span><p>{report.primaryMemory}</p></article>
      <article><span>PRIMARY ACTION</span><p>{report.primaryAction}</p></article>
      <article><span>PROJECT TYPE</span><p>{report.projectType}</p></article>
    </div>

    <div className="creative-agent__hierarchy-layers">
      {report.layers.map((layer) => <article key={layer.id} data-status={layer.status}>
        <div><span>{layer.label}</span><strong>{layer.score}/10</strong></div>
        <p>{layer.rule}</p>
        <small>{layer.decision}</small>
        {layer.diagnostics.slice(0, 2).map((item) => <em key={`${item.message}-${item.sceneIndex ?? "global"}`}>{item.severity.toUpperCase()} · {item.message}</em>)}
      </article>)}
    </div>

    <div className="creative-agent__hierarchy-scenes">
      <header><span>SCENE PRIORITY MAP</span><strong>{report.narrativeArc.join(" → ")}</strong></header>
      <div>
        {report.scenePriorities.map((scene) => <article key={scene.sceneId} data-role={scene.role}>
          <span>{String(scene.sceneIndex + 1).padStart(2, "0")} · {scene.role.toUpperCase()}</span>
          <strong>{scene.label}</strong>
          <small>{scene.narrativeBeat}</small>
          <dl>
            <div><dt>Production</dt><dd>{scene.productionWeight}</dd></div>
            <div><dt>Visual</dt><dd>{scene.visualIntensity}</dd></div>
            <div><dt>Motion</dt><dd>{scene.motionIntensity}</dd></div>
            <div><dt>Info</dt><dd>{scene.informationDensity}</dd></div>
          </dl>
          <p>{scene.directive}</p>
        </article>)}
      </div>
    </div>

    {report.diagnostics.length > 0 && <div className="creative-agent__hierarchy-diagnostics">
      <span>HIERARCHY PRESSURE TEST</span>
      {report.diagnostics.map((item) => <article key={`${item.layer}-${item.message}-${item.sceneIndex ?? "global"}`} data-severity={item.severity}>
        <strong>{item.layer.replace("-", " / ").toUpperCase()}</strong>
        <p>{item.message}</p>
        <small>{item.recommendation}</small>
      </article>)}
    </div>}
  </section>;
}
