"use client";

import type { ForgeProposal } from "@/src/platform/control-plane/proposal";

export function ControlPlaneReview({
  proposal,
  hasCandidate,
  previewMode,
  onPreviewMode,
  onAccept,
  onReject,
  onContinue,
  canRevert=false,
  onRevert,
}:{
  proposal:ForgeProposal|null;
  hasCandidate:boolean;
  previewMode:"current"|"candidate";
  onPreviewMode:(mode:"current"|"candidate")=>void;
  onAccept:()=>void;
  onReject:()=>void;
  onContinue?:()=>void;
  canRevert?:boolean;
  onRevert?:()=>void;
}) {
  if(!proposal) return null;
  const ready=proposal.state==="ready";
  const candidateReview=hasCandidate && ready;
  const verificationPending=proposal.executionClass==="deep" && proposal.state==="verifying" && !hasCandidate;
  const accepted=proposal.state==="accepted";

  return <section className="production-proposal-review" aria-label="Forge proposal review" data-risk={proposal.riskClass}>
    <header>
      <div>
        <span>FORGE PROPOSAL</span>
        <strong>{proposal.intent.raw}</strong>
        <p>{proposal.explanation}</p>
      </div>
      <output>{proposal.riskClass.replaceAll("-"," ")}</output>
    </header>

    {candidateReview && <div className="production-proposal-toggle" role="group" aria-label="Proposal preview version">
      <button type="button" aria-pressed={previewMode==="current"} onClick={()=>onPreviewMode("current")}>Current</button>
      <button type="button" aria-pressed={previewMode==="candidate"} onClick={()=>onPreviewMode("candidate")}>Candidate</button>
    </div>}

    {proposal.changes.length>0 && <div className="production-proposal-changes">
      {proposal.changes.map((change)=><article key={change.path}>
        <span>{change.path}</span>
        <strong>{change.before} <i>→</i> {change.after}</strong>
        <p>{change.summary}</p>
      </article>)}
    </div>}

    <div className="production-proposal-verification">
      {proposal.verification.required.length
        ? proposal.verification.required.map((verifier)=>{
            const result=proposal.verification.results.find((item)=>item.verifier===verifier);
            return <span key={verifier} data-status={result?.status ?? "pending"}>{verifier} · {result?.status ?? "pending"}</span>;
          })
        : <span data-status="not-applicable">No verification gate required</span>}
    </div>

    <footer>
      {candidateReview ? <>
        <button type="button" onClick={onReject}>Reject</button>
        <button type="button" className="primary" onClick={onAccept}>Accept candidate</button>
      </> : accepted && canRevert && onRevert ? <>
        <button type="button" onClick={onReject}>Close</button>
        <button type="button" className="primary" onClick={onRevert}>Revert accepted change</button>
      </> : verificationPending && onContinue ? <>
        <button type="button" onClick={onReject}>Dismiss</button>
        <button type="button" className="primary" onClick={onContinue}>Open verification</button>
      </> : <button type="button" onClick={onReject}>Dismiss</button>}
    </footer>
  </section>;
}
