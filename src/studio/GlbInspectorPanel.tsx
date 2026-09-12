"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { ExperienceConfig } from "@/src/types/experience";
import { inspectGlb, type GlbInspection } from "@/src/platform/glbInspector";

export function GlbInspectorPanel({
  experience,
  setExperience,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
}) {
  const [report, setReport] = useState<GlbInspection | null>(null);
  const [selected, setSelected] = useState<string[]>(experience.productRig?.nodes ?? []);
  const [modelPath, setModelPath] = useState(experience.heroModel);
  const [error, setError] = useState("");

  const inspect = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = inspectGlb(await file.arrayBuffer());
      setReport(result);
      setSelected(result.suggestedRigNodes);
      setError("");
    } catch (reason) {
      setReport(null);
      setError(reason instanceof Error ? reason.message : "The model could not be inspected");
    }
  };

  const toggle = (name: string) =>
    setSelected((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );

  const apply = () => {
    if (!selected.length || !modelPath.startsWith("/")) return;
    setExperience((current) => ({
      ...current,
      heroModel: modelPath,
      productRig: {
        nodes: selected,
        tracks: selected.map((node) => ({
          node,
          property: "position" as const,
          mode: "offset" as const,
          keyframes: [
            { at: 0, value: [0, 0, 0] as [number, number, number] },
            { at: 1, value: [0, 0, 0] as [number, number, number] },
          ],
        })),
      },
    }));
  };

  const mappingFor = (name: string) => report?.suggestedMappings.find((mapping) => mapping.node === name);

  return (
    <div className="studio-grid">
      <section className="studio-card">
        <div className="studio-card__head">
          <div><span>LOCAL INSPECTION</span><h2>GLB node mapper</h2></div>
          <output>{report ? `${report.complexity} / ${formatBytes(report.bytes)}` : "No model"}</output>
        </div>
        <p className="studio-muted">Models are inspected inside your browser. The file is not uploaded.</p>
        <label className="studio-drop">
          <strong>Select a binary glTF model</strong>
          <span>GLB 2.0, named mesh nodes recommended</span>
          <input type="file" accept=".glb,model/gltf-binary" onChange={(event) => void inspect(event.target.files?.[0])} />
        </label>
        {error && <p className="studio-error" role="alert">{error}</p>}
        {report && (
          <dl className="studio-stats">
            <div><dt>Nodes</dt><dd>{report.nodes.length}</dd></div>
            <div><dt>Meshes</dt><dd>{report.meshes.length}</dd></div>
            <div><dt>Materials</dt><dd>{report.materials.length}</dd></div>
            <div><dt>Animations</dt><dd>{report.animations.length}</dd></div>
            <div><dt>Triangles</dt><dd>{formatCount(report.totals.triangles)}</dd></div>
            <div><dt>Vertices</dt><dd>{formatCount(report.totals.vertices)}</dd></div>
            <div><dt>Textures</dt><dd>{report.textures}</dd></div>
            <div><dt>Skins</dt><dd>{report.skins}</dd></div>
          </dl>
        )}
        {report && <div className="model-diagnostics" aria-label="Model optimization guidance">
          <h3>Production guidance</h3>
          {report.recommendations.map((recommendation) => <p key={recommendation}>{recommendation}</p>)}
        </div>}
      </section>

      <section className="studio-card">
        <div className="studio-card__head">
          <div><span>PRODUCT RIG</span><h2>Named component mapping</h2></div>
          <output>{selected.length} mapped</output>
        </div>
        <label>
          Public model path
          <input value={modelPath} onChange={(event) => setModelPath(event.target.value)} placeholder="/models/client/product.glb" />
        </label>
        {report && <div className="node-actions">
          <button type="button" onClick={() => setSelected(report.suggestedRigNodes)}>Select recommended</button>
          <button type="button" onClick={() => setSelected([])}>Clear mapping</button>
        </div>}
        <div className="node-list" aria-label="Model nodes">
          {(report?.nodes.filter((node) => node.mesh !== null) ?? []).map((node) => (
            <label key={node.index}>
              <input type="checkbox" checked={selected.includes(node.name)} onChange={() => toggle(node.name)} />
              <span>
                <strong>{node.name}</strong>
                <small>{mappingFor(node.name)?.role ?? "unclassified"} / {Math.round((mappingFor(node.name)?.confidence ?? 0) * 100)}% / {formatCount(report?.meshes[node.mesh ?? -1]?.triangles ?? 0)} tris</small>
                <small title={node.path}>{node.path}</small>
              </span>
            </label>
          ))}
          {!report && <p className="studio-muted">Inspect a model to map its components.</p>}
        </div>
        {report?.warnings.map((warning) => <p className="studio-warning" key={warning}>{warning}</p>)}
        <button className="studio-primary" type="button" disabled={!selected.length || !modelPath.startsWith("/")} onClick={apply}>
          Create deterministic rig tracks
        </button>
      </section>
    </div>
  );
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? Math.round(bytes / 1024) + " KB"
    : (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}
