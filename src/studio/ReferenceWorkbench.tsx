"use client";

import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { StudioProject } from "@/src/platform/studioSchema";
import {
  importStudioReferenceAnalysis,
  referenceDirectionSummary,
  studioReferenceFromCorpus,
  studioReferenceFromUrl,
  type StudioReference,
  type StudioReferenceSystems,
} from "@/src/platform/studioReference";
import { immersiveReferenceCorpus } from "@/src/platform/director-intelligence/referenceCorpus";

const systemFields: Array<{ key:keyof StudioReferenceSystems; label:string; hint:string }> = [
  { key:"composition",label:"Composition",hint:"Hierarchy, framing, negative space, density and section geometry." },
  { key:"typography",label:"Typography",hint:"Scale, behavior, hierarchy, transitions and relationship to the subject." },
  { key:"motion",label:"Motion",hint:"Scroll choreography, camera pacing, sequencing and restraint." },
  { key:"interaction",label:"Interaction",hint:"Pointer, touch, drag, state changes, navigation and feedback." },
  { key:"threeD",label:"3D / WebGL",hint:"Persistent subjects, depth, material, lighting, scene responsibility." },
  { key:"transitions",label:"Transitions",hint:"What remains continuous between chapters and what is allowed to change." },
  { key:"mobile",label:"Mobile",hint:"How the same idea translates when space and input change." },
  { key:"performance",label:"Performance",hint:"Prewarm, asset delivery, adaptive fidelity and runtime risks." },
];

export function ReferenceWorkbench({ project, setProject }:{
  project:StudioProject;
  setProject:Dispatch<SetStateAction<StudioProject>>;
}) {
  const [selectedId,setSelectedId]=useState(project.references[0]?.id ?? "");
  const [url,setUrl]=useState("");
  const [label,setLabel]=useState("");
  const [query,setQuery]=useState("");
  const [message,setMessage]=useState("");
  const importRef=useRef<HTMLInputElement>(null);

  const references=project.references;
  const selected=references.find((item)=>item.id===selectedId) ?? references[0] ?? null;
  const active=references.filter((item)=>item.enabled && referenceDirectionSummary(item).ready);
  const needsEvidence=references.filter((item)=>item.enabled && !referenceDirectionSummary(item).ready);

  const corpusResults=useMemo(()=>{
    const value=query.trim().toLowerCase();
    if(!value) return immersiveReferenceCorpus
      .filter((item)=>item.evidenceStrength>=0.9)
      .slice(0,10);
    return immersiveReferenceCorpus
      .map((item)=>{
        const haystack=[item.title,item.industry,item.source,...item.observedTraits,...item.transferableLessons,...item.constructionPatternIds].join(" ").toLowerCase();
        const score=value.split(/\s+/).filter(Boolean).reduce((sum,token)=>sum+(haystack.includes(token)?1:0),0);
        return {item,score};
      })
      .filter((entry)=>entry.score>0)
      .sort((a,b)=>b.score-a.score || b.item.evidenceStrength-a.item.evidenceStrength)
      .slice(0,12)
      .map((entry)=>entry.item);
  },[query]);

  const replaceReferences=(next:StudioReference[])=>{
    setProject((current)=>({...current,references:next.slice(0,20)}));
  };
  const addReference=(reference:StudioReference)=>{
    if(references.length>=20) {
      setMessage("Forge supports up to 20 project references. Remove one before adding another.");
      return;
    }
    const unique=withUniqueId(reference,references);
    replaceReferences([...references,unique]);
    setSelectedId(unique.id);
    setMessage(referenceDirectionSummary(unique).ready
      ? `${unique.label} added and active for AI Build + Director.`
      : `${unique.label} saved. Add evidence or transfer rules before it can steer the build.`);
  };
  const updateSelected=(patch:Partial<StudioReference>)=>{
    if(!selected) return;
    replaceReferences(references.map((item)=>item.id===selected.id ? {...item,...patch} : item));
  };
  const updateSystem=(key:keyof StudioReferenceSystems,value:string)=>{
    if(!selected) return;
    updateSelected({systems:{...selected.systems,[key]:value}});
  };
  const removeSelected=()=>{
    if(!selected) return;
    const next=references.filter((item)=>item.id!==selected.id);
    replaceReferences(next);
    setSelectedId(next[0]?.id ?? "");
    setMessage(`${selected.label} removed from this project.`);
  };
  const addUrl=()=>{
    try {
      const reference=studioReferenceFromUrl(url.trim(),label.trim());
      addReference(reference);
      setUrl("");
      setLabel("");
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Reference URL is invalid.");
    }
  };
  const importAnalysis=async(file?:File)=>{
    if(!file) return;
    try {
      const parsed=JSON.parse(await file.text());
      const reference=importStudioReferenceAnalysis(parsed);
      addReference(reference);
      setMessage(`${reference.label} imported from structured reference analysis and activated.`);
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Reference analysis import failed.");
    } finally {
      if(importRef.current) importRef.current.value="";
    }
  };

  return <div className="reference-workbench">
    <aside className="reference-workbench__rail">
      <header>
        <span>PROJECT REFERENCES</span>
        <strong>{active.length} active · {needsEvidence.length} needs evidence</strong>
      </header>
      <div className="reference-workbench__add">
        <input aria-label="Reference URL" type="url" value={url} onChange={(event)=>setUrl(event.target.value)} placeholder="https://reference-site.com" />
        <input aria-label="Reference label" value={label} onChange={(event)=>setLabel(event.target.value)} placeholder="Optional label" />
        <button type="button" className="primary" disabled={!url.trim()} onClick={addUrl}>＋ Add website</button>
        <button type="button" onClick={()=>importRef.current?.click()}>Import analysis JSON</button>
        <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event)=>void importAnalysis(event.target.files?.[0])} />
      </div>
      <div className="reference-workbench__list">
        {references.length ? references.map((reference)=>{
          const summary=referenceDirectionSummary(reference);
          return <button key={reference.id} type="button" data-selected={selected?.id===reference.id} onClick={()=>setSelectedId(reference.id)}>
            <div><strong>{reference.label}</strong><span data-ready={summary.ready}>{summary.ready ? "BUILD READY" : "NEEDS DIRECTION"}</span></div>
            <small>{host(reference.url)}</small>
            <i>{summary.transfers} transfers · {summary.systems} systems · {summary.evidence} evidence</i>
          </button>;
        }) : <p className="reference-workbench__empty">No project references yet. Add a URL, import a verified analysis, or pull from Forge&apos;s research corpus.</p>}
      </div>
      <section className="reference-workbench__status">
        <span>DOWNSTREAM</span>
        <p><strong>{active.length}</strong> evidence-directed reference{active.length===1?"":"s"} automatically feed AI Build and Director.</p>
        <a href="/director/intelligence">Open Director Intelligence →</a>
      </section>
    </aside>

    <main className="reference-workbench__main">
      {message && <button type="button" className="reference-workbench__message" onClick={()=>setMessage("")}>{message}<span>×</span></button>}
      {selected ? <ReferenceEditor key={selected.id} reference={selected} onChange={updateSelected} onSystem={updateSystem} onRemove={removeSelected} /> : <ReferenceEmpty />}
    </main>

    <aside className="reference-workbench__corpus">
      <header><span>FORGE REFERENCE CORPUS</span><strong>{immersiveReferenceCorpus.length} researched references</strong></header>
      <input aria-label="Search reference corpus" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search product, camera, typography, WebGL…" />
      <div className="reference-workbench__corpus-list">
        {corpusResults.map((item)=>{
          const already=references.some((reference)=>reference.url===item.source);
          return <article key={item.id}>
            <div><span>{item.industry}</span><b>{Math.round(item.evidenceStrength*100)}% evidence</b></div>
            <h3>{item.title}</h3>
            <p>{item.transferableLessons[0] ?? item.observedTraits[0]}</p>
            <small>{item.constructionPatternIds.slice(0,3).join(" · ")}</small>
            <footer><a href={item.source} target="_blank" rel="noreferrer">View source ↗</a><button type="button" disabled={already} onClick={()=>addReference(studioReferenceFromCorpus(item))}>{already?"Added":"Use reference"}</button></footer>
          </article>;
        })}
      </div>
    </aside>
  </div>;
}

function ReferenceEditor({reference,onChange,onSystem,onRemove}:{
  reference:StudioReference;
  onChange:(patch:Partial<StudioReference>)=>void;
  onSystem:(key:keyof StudioReferenceSystems,value:string)=>void;
  onRemove:()=>void;
}) {
  const summary=referenceDirectionSummary(reference);
  const [screenshots,setScreenshots]=useState<File[]>([]);
  const [analyzing,setAnalyzing]=useState(false);
  const [analysisMessage,setAnalysisMessage]=useState("");
  const screenshotRef=useRef<HTMLInputElement>(null);

  const chooseScreenshots=(files:FileList|null)=>{
    const next=Array.from(files ?? []).slice(0,4);
    const invalid=next.find((file)=>!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>12_000_000);
    if(invalid) {
      setScreenshots([]);
      setAnalysisMessage("Use up to four PNG, JPEG or WebP screenshots, each 12 MB or smaller. Forge compresses them before analysis.");
      if(screenshotRef.current) screenshotRef.current.value="";
      return;
    }
    setScreenshots(next);
    setAnalysisMessage(next.length ? `${next.length} screenshot${next.length===1?"":"s"} ready for deconstruction.` : "");
  };

  const analyzeScreenshots=async()=>{
    if(!screenshots.length || analyzing) return;
    setAnalyzing(true);
    setAnalysisMessage("");
    try {
      const encoded=await Promise.all(screenshots.map(async(file)=>({
        name:file.name,
        dataUrl:await fileToReferenceDataUrl(file),
      })));
      const response=await fetch("/api/studio/references/analyze",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({reference,screenshots:encoded}),
      });
      const body=await response.json() as {ok:boolean;reference?:StudioReference;error?:string};
      if(!response.ok || !body.ok || !body.reference) throw new Error(body.error || "Reference screenshot analysis failed.");
      onChange(body.reference);
      setAnalysisMessage("Screenshot deconstruction applied. Review the evidence, transfer rules and Forge implementation map before building.");
    } catch(error) {
      setAnalysisMessage(error instanceof Error ? error.message : "Reference screenshot analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  return <div className="reference-editor">
    <header className="reference-editor__head">
      <div>
        <span>REFERENCE DECONSTRUCTION</span>
        <h2>{reference.label}</h2>
        <a href={reference.url} target="_blank" rel="noreferrer">{reference.url} ↗</a>
      </div>
      <div className="reference-editor__head-actions">
        <label><input type="checkbox" checked={reference.enabled} onChange={(event)=>onChange({enabled:event.target.checked})} /> Use in project</label>
        <button type="button" onClick={onRemove}>Remove</button>
      </div>
    </header>

    <section className="reference-editor__readiness" data-ready={summary.ready}>
      <div><span>{summary.ready ? "REFERENCE ACTIVE" : "REFERENCE NOT DIRECTING YET"}</span><strong>{summary.ready ? "Forge will use these constraints in AI Build + Director." : "A URL alone is not visual evidence. Add screenshots, observed facts, transfer rules, or import an analysis."}</strong></div>
      <div><b>{Math.round(reference.evidenceStrength*100)}%</b><small>evidence confidence</small></div>
    </section>

    <section className="reference-editor__analyzer">
      <div className="reference-editor__analyzer-copy">
        <span>VISUAL EVIDENCE ANALYZER</span>
        <strong>Give Forge the pixels, not permission to guess from a URL.</strong>
        <p>Attach desktop, mobile, and key interaction-state screenshots. Forge deconstructs only what is visible, then writes observed evidence, transferable construction rules, no-copy boundaries, and system mappings.</p>
      </div>
      <div className="reference-editor__analyzer-controls">
        <label className="reference-editor__drop">
          <input ref={screenshotRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event)=>chooseScreenshots(event.target.files)} />
          <span>{screenshots.length ? `${screenshots.length} screenshot${screenshots.length===1?"":"s"} selected` : "Choose screenshots"}</span>
          <small>PNG / JPEG / WebP · up to 4 · Forge compresses before analysis</small>
        </label>
        {screenshots.length>0 && <div className="reference-editor__file-list">{screenshots.map((file)=><span key={file.name+file.size}>{file.name}</span>)}</div>}
        <button type="button" className="primary" disabled={!screenshots.length || analyzing} onClick={()=>void analyzeScreenshots()}>{analyzing ? "Analyzing visual evidence…" : "Analyze screenshots"}</button>
        {analysisMessage && <p role="status">{analysisMessage}</p>}
      </div>
    </section>

    <div className="reference-editor__source-grid">
      <label>Name<input maxLength={180} value={reference.label} onChange={(event)=>{ if(event.target.value.trim()) onChange({label:event.target.value}); }} /></label>
      <label>Source URL<input type="url" value={reference.url} readOnly /></label>
    </div>

    <div className="reference-editor__principles">
      <TextList label="Observed evidence" hint="What was actually visible or behaviorally verified. No guesses about implementation." values={reference.evidence} onChange={(values)=>onChange({evidence:values})} />
      <TextList label="Transfer / take" hint="Causal principles Forge is allowed to transfer into this project." values={reference.take} onChange={(values)=>onChange({take:values})} />
      <TextList label="Do not copy" hint="Brand-owned, composition-specific or signature elements Forge must keep distant from." values={reference.doNotCopy} onChange={(values)=>onChange({doNotCopy:values})} />
    </div>

    <section className="reference-editor__systems">
      <header><span>FORGE IMPLEMENTATION MAP</span><strong>Translate the reference into build-system constraints.</strong></header>
      <div>{systemFields.map((field)=><label key={field.key}><span>{field.label}</span><small>{field.hint}</small><textarea maxLength={900} value={reference.systems[field.key]} onChange={(event)=>onSystem(field.key,event.target.value)} rows={4} /></label>)}</div>
    </section>
  </div>;
}

function TextList({label,hint,values,onChange}:{label:string;hint:string;values:string[];onChange:(values:string[])=>void}) {
  return <label className="reference-editor__list"><span>{label}</span><small>{hint}</small><textarea rows={7} value={values.join("\n")} onChange={(event)=>onChange(lines(event.target.value))} placeholder="One observation or rule per line" /></label>;
}

function ReferenceEmpty() {
  return <section className="reference-workbench__blank">
    <span>REFERENCE INTELLIGENCE</span>
    <h2>References should change the build, not decorate the brief.</h2>
    <p>Add a website from the left, import Forge reference-analysis JSON, or choose an evidence-backed reference from the corpus. Forge will separate observed behavior from transferable principles and explicit no-copy constraints.</p>
    <div><strong>REFERENCE</strong><i>→</i><strong>DECONSTRUCT</strong><i>→</i><strong>MAP TO FORGE</strong><i>→</i><strong>AI BUILD + DIRECTOR</strong></div>
  </section>;
}

function lines(value:string) {
  return value.split("\n").map((item)=>item.trim().slice(0,400)).filter(Boolean).slice(0,32);
}
function host(value:string) {
  try { return new URL(value).hostname.replace(/^www\./,""); } catch { return value; }
}
function withUniqueId(reference:StudioReference,references:StudioReference[]) {
  const used=new Set(references.map((item)=>item.id));
  if(!used.has(reference.id)) return reference;
  let index=2;
  while(used.has(`${reference.id}-${index}`)) index+=1;
  return {...reference,id:`${reference.id}-${index}`};
}

async function fileToReferenceDataUrl(file:File) {
  const bitmap=await createImageBitmap(file);
  try {
    const maxWidth=1440;
    const maxHeight=2200;
    const scale=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
    let width=Math.max(1,Math.round(bitmap.width*scale));
    let height=Math.max(1,Math.round(bitmap.height*scale));
    let quality=.82;
    for(let attempt=0;attempt<6;attempt+=1) {
      const canvas=document.createElement("canvas");
      canvas.width=width;
      canvas.height=height;
      const context=canvas.getContext("2d");
      if(!context) throw new Error("Screenshot compression is unavailable in this browser.");
      context.drawImage(bitmap,0,0,width,height);
      const dataUrl=canvas.toDataURL("image/webp",quality);
      if(dataUrl.length<=850_000) return dataUrl;
      quality=Math.max(.5,quality-.1);
      width=Math.max(720,Math.round(width*.88));
      height=Math.max(900,Math.round(height*.88));
    }
    throw new Error("Screenshot remains too large after compression. Crop it to the relevant website state and try again.");
  } finally {
    bitmap.close();
  }
}
