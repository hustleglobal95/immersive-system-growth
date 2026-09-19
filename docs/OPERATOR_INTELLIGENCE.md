# Forge Operator Intelligence

Forge Operator Intelligence is the project-wide orchestration layer above the PRO+ Control Plane.

It does not replace Director, Creative Intelligence, the Sequencer, Interaction Graph, Asset Intelligence, Loop Engine, Project Health or Project Vault. It turns those systems into a smaller number of operator decisions.

## Target operating model

```text
Mission
  outcome + constraints + ambition
    ↓
Plan Graph
  direction → construction → translation → polish → approval
    ↓
Outcome Engine
  highest-leverage project outcome
    ↓
Autonomy policy
  execute / prepare review / stop for human
    ↓
Existing Forge Proposal + verification machinery
    ↓
Continuous Critic
  evidence → bottleneck → bounded repair
```

The operator should increasingly decide **taste and authority**, not subsystem routing.

## Mission Contract

`src/platform/control-plane/mission.ts`

A Mission compiles one outcome statement into:

- project type and ambition tier;
- audience, objective, primary action and brand truth;
- project-specific differentiators and constraints;
- one protected signature-moment hypothesis;
- operating principles;
- three explicit human gates: creative world, signature moment and final approval.

Mission inference reuses Prompt Intelligence rather than creating another project classifier.

## Plan Graph

`src/platform/control-plane/planGraph.ts`

The Plan Graph converts Mission + Project Health into ordered operations with:

- stage;
- dependencies;
- target selection;
- owning capability;
- autonomy class;
- readiness state;
- perceptual leverage.

The graph references registered Control Plane capabilities. It does not invent a second execution API.

## Outcome Engine V2

`src/platform/control-plane/outcomeEngine.ts`

The original Next Best Action remains useful for the current selection. Outcome Engine V2 operates one level higher and ranks the next **project-wide outcome** using Mission, Plan Graph and Project Health.

This lets Forge prioritize direction, blocking production gaps and high-leverage project work instead of merely filling the nearest missing property.

## Guide / Copilot / Autopilot

`src/platform/control-plane/autopilot.ts`

- **Guide** recommends and leaves execution to the operator.
- **Copilot** may execute bounded reversible capabilities.
- **Autopilot** may execute bounded reversible work and prepare preview-required candidates, but cannot accept them or cross approval-required/human gates.

Autopilot is intentionally not permission to mutate authoritative production state. Existing Proposal, Loop, Vault and release boundaries remain authoritative.

## Continuous Critic

`src/platform/control-plane/continuousCritic.ts`

The critic continuously converts available evidence into repair priorities. Project Health is always available. Visual Director/Loop evidence can be injected as visual evidence without pretending Forge observed pixels when it did not.

This preserves evidence honesty while making the architecture ready for render → observe → repair loops.

## Studio rule

Operator Intelligence must not add a fourth permanent Studio destination.

Mission Control belongs on **Build** and routes through the existing Control Plane. Advanced remains Sequencer / Interactions / Asset tools / Telemetry.

## Product invariant

A new Forge capability is not successful because another control exists. It is successful when Mission Control can use it without increasing the operator's decision burden.
