"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { GlbInspectorPanel } from "@/src/studio/GlbInspectorPanel";
import { TimelineEditor } from "@/src/studio/TimelineEditor";
import { IntegrationsPanel, ProjectPanel, PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const tabs = ["project", "timeline", "model", "integrations", "publish", "telemetry"] as const;
type Tab = (typeof tabs)[number];

export function StudioWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject);
  const [tab, setTab] = useState<Tab>("project");
  const [activeScene, setActiveScene] = useState(0);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const importExperience = async (file: File | undefined) => {
    if (!file) return;
    try {
      draft.setExperience(parseExperience(JSON.parse(await file.text())));
      setActiveScene(0);
      setNotice("Experience imported and validated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The experience file is invalid.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <Link href="/" className="studio-brand">FORGE</Link>
          <span>IMMERSIVE PRODUCTION STUDIO</span>
        </div>
        <div className="studio-header__status" data-valid={!draft.validation.length}>
          <i />
          {draft.validation.length ? "Draft needs attention" : "Production schema valid"}
        </div>
        <div className="studio-actions">
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importExperience(event.target.files?.[0])} />
          <button type="button" onClick={() => importRef.current?.click()}>Import</button>
          <button type="button" onClick={() => downloadJson("experience.json", draft.experience)}>Export experience</button>
          <button type="button" onClick={() => downloadJson("studio-project.json", draft.project)}>Export project</button>
        </div>
      </header>

      <nav className="studio-tabs" aria-label="Studio areas">
        {tabs.map((item) => (
          <button key={item} type="button" aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </nav>

      <div className="studio-title">
        <div><span>{draft.project.id}</span><h1>{titleFor(tab)}</h1></div>
        <div>
          <button type="button" onClick={draft.reset}>Reset draft</button>
          <small>Changes save locally until exported.</small>
        </div>
      </div>

      {draft.validation.length > 0 && (
        <div className="studio-validation" role="alert">
          <strong>Validation</strong>
          {draft.validation.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      )}
      {notice && <p className="studio-message" role="status">{notice}</p>}

      {tab === "project" && <ProjectPanel {...draft} />}
      {tab === "timeline" && <TimelineEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "model" && <GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "integrations" && <IntegrationsPanel project={draft.project} setProject={draft.setProject} />}
      {tab === "publish" && <PublishPanel project={draft.project} setProject={draft.setProject} />}
      {tab === "telemetry" && <TelemetryPanel project={draft.project} setProject={draft.setProject} />}

      <footer className="studio-footer">
        <span>Forge Studio v2</span>
        <span>One canvas / one timeline / validated output</span>
      </footer>
    </main>
  );
}

function titleFor(tab: Tab) {
  return {
    project: "Project control",
    timeline: "Visual timeline",
    model: "Model inspection",
    integrations: "Content connections",
    publish: "Release pipeline",
    telemetry: "Device performance",
  }[tab];
}
