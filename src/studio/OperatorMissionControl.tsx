"use client";

import { useMemo, useState } from "react";
import { createAutopilotSession, decideAutopilot, type OperatorMode } from "@/src/platform/control-plane/autopilot";
import { critiqueContinuously } from "@/src/platform/control-plane/continuousCritic";
import type { MissionContract } from "@/src/platform/control-plane/mission";
import type { MissionPlanGraph, MissionPlanStep } from "@/src/platform/control-plane/planGraph";
import { recommendProjectOutcomes } from "@/src/platform/control-plane/outcomeEngine";
import type { ProjectHealthReport } from "@/src/platform/control-plane/projectHealth";

export function OperatorMissionControl({
  mission,
  plan,
  health,
  onExecuteStep,
  onApproveDecision,
  onEditMission,
}:{
  mission:MissionContract;
  plan:MissionPlanGraph;
  health:ProjectHealthReport;
  onExecuteStep:(step:MissionPlanStep,mode:OperatorMode)=>void;
  onApproveDecision:(id:string)=>void;
  onEditMission:()=>void;
}) {
  const [mode,setMode]=useState<OperatorMode>("copilot");
  const outcomes=useMemo(()=>recommendProjectOutcomes({mission,plan,health,limit:3}),[health,mission,plan]);
  const session=useMemo(()=>createAutopilotSession(plan,mode),[mode,plan]);
  const critic=useMemo(()=>critiqueContinuously({mission,health,plan}),[health,mission,plan]);
  const primary=outcomes[0] ?? null;
  const disposition=primary ? decideAutopilot(primary.step,mode) : null;
  const executable=Boolean(primary && disposition && disposition.disposition!=="blocked");

  return <section className="operator-mission" aria-labelledby="operator-mission-title">
    <header className="operator-mission__head">
      <div>
        <span>FORGE / MISSION CONTROL</span>
        <h2 id="operator-mission-title">{mission.objective}</h2>
        <p>{mission.statement}</p>
      </div>
      <button type="button" onClick={onEditMission}>Edit mission</button>
    </header>

    <div className="operator-mission__mode" aria-label="Operator mode">
      {(["guide","copilot","autopilot"] as const).map((value)=><button
        type="button"
        key={value}
        aria-pressed={mode===value}
        className={mode===value ? "is-active" : undefined}
        onClick={()=>setMode(value)}
      >{value}</button>)}
    </div>

    <div className="operator-mission__summary">
      <article><span>PROJECT TYPE</span><strong>{mission.projectType}</strong><small>{mission.tier}</small></article>
      <article><span>PLAN</span><strong>{plan.steps.length} operations</strong><small>{plan.ready.length} ready now</small></article>
      <article><span>AUTONOMY</span><strong>{session.executable} autonomous</strong><small>{session.reviewRequired} review · {session.humanRequired} human</small></article>
      <article><span>CRITIC</span><strong>{critic.status}</strong><small>{critic.findings.length} evidence finding{critic.findings.length===1?"":"s"}</small></article>
    </div>

    <div className="operator-mission__primary">
      <div>
        <span>{primary ? `NEXT OUTCOME · ${primary.urgency.toUpperCase()}` : "MISSION STATE"}</span>
        <strong>{primary?.label ?? "No ready mission operation."}</strong>
        <p>{primary?.reason ?? "Resolve blocked dependencies or move to final review."}</p>
        {disposition && <small>{disposition.reason}</small>}
      </div>
      <div className="operator-mission__primary-actions">
        <button
          type="button"
          className="primary"
          disabled={!executable}
          onClick={()=>primary && onExecuteStep(primary.step,mode)}
        >{primary ? actionLabel(disposition?.disposition) : "Mission clear"}</button>
        {primary?.step.autonomy==="human" && <button type="button" onClick={()=>onApproveDecision(primary.step.id)}>Approve decision</button>}
      </div>
    </div>

    <div className="operator-mission__footer">
      <div><span>SIGNATURE MOMENT</span><p>{mission.signatureMoment}</p></div>
      {critic.topRepair && <div><span>CRITIC PRIORITY</span><p>{critic.topRepair.title} — {critic.topRepair.detail}</p></div>}
    </div>
  </section>;
}

function actionLabel(disposition:ReturnType<typeof decideAutopilot>["disposition"]|undefined) {
  if(disposition==="execute") return "Execute safely";
  if(disposition==="prepare-review") return "Prepare candidate";
  if(disposition==="human-gate") return "Make decision";
  if(disposition==="recommend") return "Open recommended action";
  return "Blocked";
}
