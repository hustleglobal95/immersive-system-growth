"use client";

import { evaluateDiscoverability, type DiscoverabilityConfig } from "@/src/platform/discoverability";
import type { StudioProject } from "@/src/platform/studioSchema";
import type { ExperienceConfig } from "@/src/types/experience";
import type { Dispatch, SetStateAction } from "react";

export function DiscoverabilityPanel({
  project,
  setProject,
  experience,
}:{
  project:StudioProject;
  setProject:Dispatch<SetStateAction<StudioProject>>;
  experience:ExperienceConfig;
}) {
  const config=project.discoverability;
  const report=evaluateDiscoverability({discoverability:config,experience});
  const setConfig=(change:(current:DiscoverabilityConfig)=>DiscoverabilityConfig)=>{
    setProject((current)=>({...current,discoverability:change(current.discoverability)}));
  };
  const setList=(key:"searchIntents"|"authorityTopics"|"publicPaths"|"privatePaths",raw:string)=>{
    const values=raw.split("\n").map((value)=>value.trim()).filter(Boolean);
    setConfig((current)=>({...current,[key]:values}));
  };

  return <div className="studio-grid">
    <section className="studio-card studio-card--wide">
      <div className="studio-card__head">
        <div><span>SEARCH + AI HEALTH</span><h2>Discoverability contract</h2></div>
        <output data-status={report.status}>{report.score}/100 · {report.status}</output>
      </div>
      <p className="studio-muted">Forge optimizes crawlability, entity clarity, retrieval and citation eligibility. It does not promise a universal “LLM rank.”</p>
      <div className="studio-stats">
        <div><dt>Semantic scene coverage</dt><dd>{report.metrics.semanticSceneCoverage}%</dd></div>
        <div><dt>Search intents</dt><dd>{report.metrics.searchIntentCount}</dd></div>
        <div><dt>Authority topics</dt><dd>{report.metrics.authorityTopicCount}</dd></div>
        <div><dt>Public routes</dt><dd>{report.metrics.publicPathCount}</dd></div>
      </div>
      {report.issues.length ? <div className="asset-intelligence__findings">
        {report.issues.map((issue)=><article key={issue.id} data-severity={issue.severity}>
          <strong>{issue.title}</strong><small>{issue.detail}</small><p>{issue.recommendedAction}</p>
        </article>)}
      </div> : <p className="studio-message" role="status">Search and AI discoverability contract is release-ready.</p>}
    </section>

    <section className="studio-card">
      <div className="studio-card__head"><div><span>SEARCH IDENTITY</span><h2>Canonical metadata</h2></div></div>
      <label>Site / brand name<input aria-label="Discoverability site name" value={config.siteName} maxLength={120} onChange={(event)=>setConfig((current)=>({...current,siteName:event.target.value}))}/></label>
      <label>Canonical production origin<input aria-label="Canonical production origin" value={config.canonicalBaseUrl} placeholder="https://example.com" onChange={(event)=>setConfig((current)=>({...current,canonicalBaseUrl:event.target.value.trim()}))}/></label>
      <label>Default search title<input aria-label="Default search title" value={config.defaultTitle} maxLength={80} onChange={(event)=>setConfig((current)=>({...current,defaultTitle:event.target.value}))}/></label>
      <label>Default description<textarea aria-label="Default search description" rows={4} value={config.defaultDescription} maxLength={220} onChange={(event)=>setConfig((current)=>({...current,defaultDescription:event.target.value}))}/></label>
    </section>

    <section className="studio-card">
      <div className="studio-card__head"><div><span>ENTITY GRAPH</span><h2>Primary entity</h2></div></div>
      <label>Entity type<select aria-label="Primary entity type" value={config.primaryEntity.type} onChange={(event)=>setConfig((current)=>({...current,primaryEntity:{...current.primaryEntity,type:event.target.value as DiscoverabilityConfig["primaryEntity"]["type"]}}))}>
        {["Organization","LocalBusiness","ProfessionalService","Product","Service","Person","SoftwareApplication"].map((value)=><option key={value}>{value}</option>)}
      </select></label>
      <label>Entity name<input aria-label="Primary entity name" value={config.primaryEntity.name} maxLength={160} onChange={(event)=>setConfig((current)=>({...current,primaryEntity:{...current.primaryEntity,name:event.target.value}}))}/></label>
      <label>Entity description<textarea aria-label="Primary entity description" rows={5} value={config.primaryEntity.description} maxLength={500} onChange={(event)=>setConfig((current)=>({...current,primaryEntity:{...current.primaryEntity,description:event.target.value}}))}/></label>
      <label>Entity URL<input aria-label="Primary entity URL" value={config.primaryEntity.url} placeholder="https://example.com/about" onChange={(event)=>setConfig((current)=>({...current,primaryEntity:{...current.primaryEntity,url:event.target.value.trim()}}))}/></label>
      <label>Areas served<textarea aria-label="Areas served" rows={4} value={config.primaryEntity.areaServed.join("\n")} placeholder={"Tampa\nSt. Petersburg"} onChange={(event)=>setConfig((current)=>({...current,primaryEntity:{...current.primaryEntity,areaServed:event.target.value.split("\n").map((value)=>value.trim()).filter(Boolean)}}))}/></label>
    </section>

    <section className="studio-card">
      <div className="studio-card__head"><div><span>CONTENT AUTHORITY</span><h2>Intent and expertise</h2></div></div>
      <label>High-value search intents<textarea aria-label="Search intents" rows={7} value={config.searchIntents.join("\n")} placeholder={"luxury architect Tampa\nwaterfront residential architect"} onChange={(event)=>setList("searchIntents",event.target.value)}/></label>
      <label>Authority topics<textarea aria-label="Authority topics" rows={7} value={config.authorityTopics.join("\n")} placeholder={"hospitality interiors\nmaterial specification\nconstruction oversight"} onChange={(event)=>setList("authorityTopics",event.target.value)}/></label>
    </section>

    <section className="studio-card">
      <div className="studio-card__head"><div><span>CRAWL CONTRACT</span><h2>Public and private routes</h2></div></div>
      <label>Public routes<textarea aria-label="Public crawl routes" rows={7} value={config.publicPaths.join("\n")} onChange={(event)=>setList("publicPaths",event.target.value)}/></label>
      <label>Private/internal routes<textarea aria-label="Private crawl routes" rows={7} value={config.privatePaths.join("\n")} onChange={(event)=>setList("privatePaths",event.target.value)}/></label>
    </section>

    <section className="studio-card">
      <div className="studio-card__head"><div><span>AI DISCOVERY POLICY</span><h2>Retrieval access</h2></div></div>
      <label className="studio-check"><input aria-label="Allow AI search crawlers" type="checkbox" checked={config.ai.allowSearchCrawlers} onChange={(event)=>setConfig((current)=>({...current,ai:{...current.ai,allowSearchCrawlers:event.target.checked}}))}/> Allow supported AI search crawlers</label>
      <label className="studio-check"><input aria-label="Allow AI training crawlers" type="checkbox" checked={config.ai.allowTrainingCrawlers} onChange={(event)=>setConfig((current)=>({...current,ai:{...current.ai,allowTrainingCrawlers:event.target.checked}}))}/> Allow AI training crawlers</label>
      <label className="studio-check"><input aria-label="Publish llms txt" type="checkbox" checked={config.ai.publishLlmsTxt} onChange={(event)=>setConfig((current)=>({...current,ai:{...current.ai,publishLlmsTxt:event.target.checked}}))}/> Publish llms.txt context file</label>
      <p className="studio-muted">Search access and training access are independent. Forge defaults to search discovery on and training discovery off for new client projects.</p>
    </section>
  </div>;
}
