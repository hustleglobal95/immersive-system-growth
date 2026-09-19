"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loopDefinitions } from "@/src/platform/loops/loopRegistry";

type VaultSummary={ id:string; updatedAt:string; versionCount:number; status:"active"|"archived" };

export function LoopEnginePanel({
  projectId,
  projectName,
  onClose,
  onOpenVault,
}:{
  projectId:string;
  projectName:string;
  onClose:()=>void;
  onOpenVault:()=>void;
}) {
  const [selectedId,setSelectedId]=useState(loopDefinitions[0]?.id ?? "visual-polish");
  const [vaultProject,setVaultProject]=useState<VaultSummary|null>(null);
  const [vaultConfigured,setVaultConfigured]=useState<boolean|null>(null);
  const [criticConnected,setCriticConnected]=useState<boolean|null>(null);
  const [message,setMessage]=useState("");
  const dialogRef=useRef<HTMLElement>(null);
  const selected=useMemo(()=>loopDefinitions.find((item)=>item.id===selectedId) ?? loopDefinitions[0],[selectedId]);

  useEffect(()=>{ dialogRef.current?.focus(); },[]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{ if(event.key==="Escape") onClose(); };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[onClose]);
  useEffect(()=>{
    let cancelled=false;
    void Promise.all([
      fetch("/api/studio/vault/projects",{cache:"no-store"}).then((response)=>response.json()),
      fetch("/api/studio/loops/status",{cache:"no-store"}).then((response)=>response.json()),
    ]).then(([vault,status]:[
      { ok?:boolean;configuration?:{ configured?:boolean };projects?:VaultSummary[] },
      { ok?:boolean;visualCriticConnected?:boolean }
    ])=>{
      if(cancelled) return;
      setVaultConfigured(Boolean(vault.configuration?.configured));
      setVaultProject((vault.projects ?? []).find((project)=>project.id===projectId) ?? null);
      setCriticConnected(Boolean(status.visualCriticConnected));
    }).catch(()=>{ if(!cancelled) { setVaultConfigured(false); setCriticConnected(false); } });
    return ()=>{ cancelled=true; };
  },[projectId]);

  if(!selected) return null;
  const command=`npm run loop:run -- --loop ${selected.id} --project ${projectId}`;
  const ready=selected.executable && vaultConfigured===true && Boolean(vaultProject) && criticConnected===true;

  const copy=async()=>{
    try {
      await navigator.clipboard.writeText(command);
      setMessage("Run command copied.");
    } catch {
      setMessage(command);
    }
  };

  return <div className="production-modal-backdrop production-loop-backdrop" role="presentation" onMouseDown={(event)=>{ if(event.currentTarget===event.target) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} className="production-loop-panel" role="dialog" aria-modal="true" aria-labelledby="forge-loop-title">
      <header>
        <div><span>FORGE / LOOP ENGINE</span><h2 id="forge-loop-title">Closed-loop improvement with proof.</h2><p>{projectName}</p></div>
        <button type="button" aria-label="Close Loop Engine" onClick={onClose}>×</button>
      </header>

      <div className="production-loop-layout">
        <aside>
          <span className="production-loop-kicker">LOOPS</span>
          {loopDefinitions.map((loop)=><button key={loop.id} type="button" data-selected={loop.id===selected.id} onClick={()=>setSelectedId(loop.id)}>
            <strong>{loop.label}</strong>
            <span>{loop.executable ? "Executable" : "Contract ready"}</span>
          </button>)}
        </aside>

        <main>
          <section className="production-loop-hero">
            <div><span>{selected.executable ? "EXECUTABLE LOOP" : "CONTROL CONTRACT"}</span><h3>{selected.label}</h3><p>{selected.description}</p></div>
            <output data-ready={ready}>{ready ? "READY" : selected.executable ? "SETUP" : "PLANNED"}</output>
          </section>

          <section className="production-loop-objective">
            <span>OBJECTIVE</span>
            <p>{selected.objective}</p>
          </section>

          <div className="production-loop-grid">
            <section>
              <span>BOUNDS</span>
              <dl>
                <div><dt>Cycles</dt><dd>{selected.budgets.maxCycles}</dd></div>
                <div><dt>Candidates / cycle</dt><dd>{selected.budgets.maxCandidatesPerCycle}</dd></div>
                <div><dt>Candidate attempts</dt><dd>{selected.budgets.maxCandidateAttempts}</dd></div>
                <div><dt>No-progress stop</dt><dd>{selected.budgets.noProgressLimit}</dd></div>
                <div><dt>Preference agreement</dt><dd>{Math.round(selected.acceptance.minPreferenceAgreement*100)}%</dd></div>
              </dl>
            </section>
            <section>
              <span>VERIFIERS</span>
              <div className="production-loop-tags">{selected.verifiers.map((item)=><i key={item}>{item}</i>)}</div>
            </section>
          </div>

          <section className="production-loop-strategies">
            <span>CANDIDATE TOURNAMENT</span>
            {selected.strategies.map((strategy,index)=><article key={strategy.id}><small>{String(index+1).padStart(2,"0")}</small><div><strong>{strategy.label}</strong><p>{strategy.instruction}</p></div></article>)}
          </section>

          <section className="production-loop-safety">
            <span>STOP / ESCALATE POLICY</span>
            <p>Forge stops on saturation, cycle/time/attempt budget exhaustion, repeated repair without progress, or accepted-state oscillation. Production is never overwritten by the loop.</p>
            <ul>{selected.humanGates.map((gate)=><li key={gate}>{gate}</li>)}</ul>
          </section>

          {selected.executable ? <section className="production-loop-run">
            <div>
              <span>PROJECT SOURCE</span>
              <strong>{!criticConnected ? "Visual critic connection is required" : vaultProject ? `Vault checkpoint · ${vaultProject.versionCount} version${vaultProject.versionCount===1?"":"s"}` : vaultConfigured===false ? "Project Vault is not configured" : "Save this project to Vault first"}</strong>
              <p>The runner takes a durable Project Vault snapshot as the incumbent, writes all evidence under <code>test-results/forge-loops</code>, and returns a human-review artifact only if a candidate proves improvement.</p>
            </div>
            <div className="production-loop-command"><code>{command}</code><button type="button" disabled={!ready} onClick={()=>void copy()}>{ready ? "Copy run command" : "Save checkpoint first"}</button></div>
            {!vaultProject && <button type="button" className="production-loop-vault" onClick={onOpenVault}>Open Project Vault</button>}
          </section> : <section className="production-loop-planned"><strong>Repair worker intentionally not enabled yet.</strong><p>The loop contract, budgets, memory, stop policy and verification requirements are defined. Forge will not expose this loop as executable until its repair worker can produce bounded changes and pass the same evidence gates.</p></section>}

          {message && <p className="production-loop-message" role="status">{message}</p>}
        </main>
      </div>
    </section>
  </div>;
}
