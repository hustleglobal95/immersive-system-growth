"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loopDefinitions } from "@/src/platform/loops/loopRegistry";
import { capabilityById } from "@/src/platform/control-plane/capabilityRegistry";
import type { ForgeProposal } from "@/src/platform/control-plane/proposal";
import type { VerifiedLoopCandidate } from "@/src/platform/control-plane/deepCandidate";
import { projectStateFingerprint, type ControlPlaneProjectState } from "@/src/platform/control-plane/projectState";

type VaultSummary={ id:string; updatedAt:string; versionCount:number; status:"active"|"archived" };

export function LoopEnginePanel({
  projectId,
  projectName,
  onClose,
  onOpenVault,
  initialLoopId,
  proposal,
  onCandidateReady,
  workingBundle,
}:{
  projectId:string;
  projectName:string;
  onClose:()=>void;
  onOpenVault:()=>void;
  initialLoopId?:string;
  proposal?:ForgeProposal|null;
  onCandidateReady?:(candidate:VerifiedLoopCandidate)=>void;
  workingBundle:ControlPlaneProjectState;
}) {
  const initialId=loopDefinitions.find((item)=>item.id===initialLoopId)?.id ?? loopDefinitions[0]?.id ?? "visual-polish";
  const [selectedId,setSelectedId]=useState(initialId);
  const [vaultProject,setVaultProject]=useState<VaultSummary|null>(null);
  const [vaultSnapshot,setVaultSnapshot]=useState<ControlPlaneProjectState|null|undefined>(undefined);
  const [vaultConfigured,setVaultConfigured]=useState<boolean|null>(null);
  const [criticConnected,setCriticConnected]=useState<boolean|null>(null);
  const [message,setMessage]=useState("");
  const [loadingResult,setLoadingResult]=useState(false);
  const dialogRef=useRef<HTMLElement>(null);
  const selected=useMemo(()=>loopDefinitions.find((item)=>item.id===selectedId) ?? loopDefinitions[0],[selectedId]);

  useEffect(()=>{ dialogRef.current?.focus(); },[]);
  useEffect(()=>{
    const next=loopDefinitions.find((item)=>item.id===initialLoopId)?.id;
    if(next) setSelectedId(next);
  },[initialLoopId]);
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
  useEffect(()=>{
    let cancelled=false;
    if(!vaultProject) {
      queueMicrotask(()=>{ if(!cancelled) setVaultSnapshot(null); });
      return ()=>{ cancelled=true; };
    }
    setVaultSnapshot(undefined);
    void fetch(`/api/studio/vault/projects/${encodeURIComponent(projectId)}`,{cache:"no-store"})
      .then(async(response)=>{
        const body=await response.json() as {ok?:boolean;snapshot?:ControlPlaneProjectState;error?:string};
        if(!response.ok || !body.ok || !body.snapshot) throw new Error(body.error ?? "Vault checkpoint could not be read.");
        if(!cancelled) setVaultSnapshot({
          experience:body.snapshot.experience,
          assetManifest:body.snapshot.assetManifest,
          interactionGraph:body.snapshot.interactionGraph,
        });
      })
      .catch(()=>{ if(!cancelled) setVaultSnapshot(null); });
    return ()=>{ cancelled=true; };
  },[projectId,vaultProject]);

  if(!selected) return null;
  const proposalCapability=proposal ? capabilityById(proposal.capabilityId) : null;
  const workingFingerprint=projectStateFingerprint(workingBundle);
  const proposalBound=Boolean(
    proposal
    && proposal.baselineFingerprint
    && proposalCapability?.dispatch.type==="loop"
    && proposalCapability.dispatch.loop===selected.id
  );
  const proposalBaselineMatches=!proposalBound || proposal?.baselineFingerprint===workingFingerprint;
  const vaultFingerprint=vaultSnapshot ? projectStateFingerprint(vaultSnapshot) : null;
  const vaultMatchesWorking=Boolean(vaultFingerprint && vaultFingerprint===workingFingerprint);
  const proposalContext=proposalBound && proposal
    ? [proposal.intent.raw,`Selected target: ${proposal.selectionKey}.`,proposal.explanation].join(" ")
    : "";
  const command=`npm run loop:run -- --loop ${selected.id} --project ${projectId}`
    +(proposalBound && proposal?.baselineFingerprint
      ? ` --proposal-id ${shellQuote(proposal.id)} --selection-key ${shellQuote(proposal.selectionKey)} --baseline-fingerprint ${shellQuote(proposal.baselineFingerprint)} --context ${shellQuote(proposalContext)}`
      : "");
  const sourceReady=!proposalBound || (proposalBaselineMatches && vaultMatchesWorking);
  const ready=selected.executable && vaultConfigured===true && vaultProject?.status==="active" && criticConnected===true && sourceReady;
  const runLabel=proposalBound && !proposalBaselineMatches ? "Proposal is stale — direct again"
    : proposalBound && vaultProject && vaultSnapshot===undefined ? "Checking current checkpoint…"
      : proposalBound && vaultProject && !vaultMatchesWorking ? "Save current checkpoint first"
        : criticConnected===false ? "Connect visual critic"
          : vaultProject?.status==="archived" ? "Unarchive project first"
            : !vaultProject ? "Save checkpoint first"
              : ready ? "Copy run command" : "Checking readiness…";

  const copy=async()=>{
    try {
      await navigator.clipboard.writeText(command);
      setMessage("Run command copied.");
    } catch {
      setMessage(command);
    }
  };

  const loadVerifiedCandidate=async()=>{
    setLoadingResult(true);
    setMessage("Checking local Loop evidence…");
    try {
      if(!proposalBound || !proposal) throw new Error("Start this verification from a Control Plane proposal so evidence can be bound to the selected target.");
      const response=await fetch(`/api/studio/loops/results?project=${encodeURIComponent(projectId)}&loop=${encodeURIComponent(selected.id)}&proposal=${encodeURIComponent(proposal.id)}`,{cache:"no-store"});
      const body=await response.json() as {ok?:boolean;found?:boolean;candidate?:VerifiedLoopCandidate;error?:string};
      if(!response.ok || !body.ok) throw new Error(body.error ?? "Could not read Loop evidence.");
      if(!body.found || !body.candidate) {
        setMessage("No verified winning candidate has been produced for this project and Loop yet.");
        return;
      }
      onCandidateReady?.(body.candidate);
      setMessage(`Loaded verified candidate from ${body.candidate.runId}.`);
      onClose();
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Could not load Loop evidence.");
    } finally {
      setLoadingResult(false);
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

          {proposalBound && proposal && proposal.executionClass==="deep" && <section className="production-loop-intent">
            <span>CONTROL PLANE PROPOSAL</span>
            <strong>{proposal.intent.raw}</strong>
            <p>{proposal.explanation}</p>
          </section>}
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
              <span className="production-loop-subkicker">ALLOWED REPAIRS</span>
              <div className="production-loop-tags">{selected.allowedRepairCommands.map((item)=><i key={item}>{item.replace("scene.","").replace("motion.","").replace("camera.","")}</i>)}</div>
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
              <strong>{proposalBound && !proposalBaselineMatches ? "Working draft changed after this proposal was prepared" : proposalBound && vaultProject && !vaultMatchesWorking ? "Current Vault checkpoint does not match this working draft" : criticConnected===false ? "Visual critic connection is required" : vaultProject?.status==="archived" ? "Project is archived in Vault" : vaultProject ? `Vault checkpoint · ${vaultProject.versionCount} version${vaultProject.versionCount===1?"":"s"}` : vaultConfigured===false ? "Project Vault is not configured" : "Save this project to Vault first"}</strong>
              <p>{proposalBound && !proposalBaselineMatches ? "Dismiss and direct the intent again from the current working state." : proposalBound && vaultProject && !vaultMatchesWorking ? "Save the current working project to Vault before running this proposal so the Loop and Current preview share the same incumbent." : "The runner takes a durable Project Vault snapshot as the incumbent, writes all evidence under test-results/forge-loops, and returns a human-review artifact only if a candidate proves improvement."}</p>
            </div>
            <div className="production-loop-command"><code>{command}</code><button type="button" disabled={!ready} onClick={()=>void copy()}>{runLabel}</button></div>
            <div className="production-loop-result-actions">
              <button type="button" disabled={!ready || loadingResult || !proposalBound} onClick={()=>void loadVerifiedCandidate()}>{loadingResult ? "Checking evidence…" : proposalBound ? "Load verified candidate" : "Start from a proposal to compare"}</button>
              <small>{proposalBound ? "After the bound Loop finishes, load its exact winning bundle into the same Current / Candidate review surface used by fast actions. This does not promote Vault or production state." : "Generic Loop runs remain available for expert evidence work, but Studio only attaches a winner to Current / Candidate when the run is bound to the active proposal and selected target."}</small>
            </div>
            {!vaultProject && <button type="button" className="production-loop-vault" onClick={onOpenVault}>Open Project Vault</button>
          </section> : <section className="production-loop-planned"><strong>Repair worker intentionally not enabled yet.</strong><p>The loop contract, budgets, memory, stop policy and verification requirements are defined. Forge will not expose this loop as executable until its repair worker can produce bounded changes and pass the same evidence gates.</p></section>}

          {message && <p className="production-loop-message" role="status">{message}</p>}
        </main>
      </div>
    </section>
  </div>;
}


function shellQuote(value:string) {
  return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}
