# Forge Full-System Execution Governance

## Purpose

Forge is a production operating system, not a library of optional tricks. This policy makes full-system Forge execution the default for substantial creative website work and turns the phrase **USE FORGE** into an auditable execution directive.

The goal is to remove dependence on conversational memory. An operator, agent, or future session must not need the user to restate which Forge systems exist or remind the agent to use Director, references, originality controls, capability routing, signature-slice gating, mobile translation, performance doctrine, or verification.

## Mandatory interpretation

For this repository:

- **USE FORGE** means use the current checked-in Forge system, not imitate its style.
- A substantial build, redesign, major immersive chapter, or reference-driven implementation is treated the same way even when the user does not literally type **USE FORGE**.
- Full-system execution does **not** mean activating every visual effect. It means the entire Forge decision pipeline is available and the Capability Router selects only the systems justified by the brief.
- A planning-only answer must never be represented as repository execution.

## Required full-build pipeline

Before production code changes for substantial creative work:

1. establish operational readiness;
2. compile the Forge Build Packet;
3. run Director Intelligence;
4. retrieve and apply evidence-weighted reference intelligence;
5. lock the Creative State Graph;
6. clear the production originality / anti-repeat gate;
7. route implementation ownership through the Capability Router;
8. establish the Signature Slice Gate;
9. compile task-scoped Context Capsules for relevant specialist domains;
10. define the functional, visual, mobile, performance, accessibility and reverse-traversal verification plan.

The machine-readable source of truth is `config/forge-execution-policy.json`.

## Evidence model

Run:

```bash
npm run forge:preflight -- --name="<project>" --prompt="<user request>"
```

The preflight:

- runs strict local Forge readiness;
- refuses retroactive attestation when governed creative paths are already dirty;
- hashes the exact experience, asset-manifest, interaction-graph and cinematic-system baseline used for planning;
- compiles the Build Packet through the real Director/Creative pipeline;
- compiles Context Capsules for every policy-required domain;
- fails closed if the originality gate or any upstream Forge contract fails;
- stores full artifacts under `.forge/execution/`, which is gitignored;
- writes a public-safe execution record under `forge-intelligence/execution-records/`.

The committed execution record intentionally contains **no raw client prompt**. It stores a SHA-256 prompt fingerprint, policy fingerprint, repository base commit, stage evidence and hashes of the locally retained artifacts.

This preserves an audit trail without leaking client strategy in a public repository.

## Change control

Creative production paths are governed by `scripts/forge-execution-audit.mjs`.

On pull requests, if governed creative paths change, CI requires a changed Forge execution record that:

- was generated from the current policy version;
- has a valid self-hash;
- records all mandatory stages as passed;
- covers every mandatory Context Capsule domain;
- was generated from a repository commit on the current branch lineage before the governed changes;
- has not been edited into an internally inconsistent state.

No execution record means the governed creative change fails CI.

## Separation of duties

The pipeline separates four concerns:

- **Director / Creative State Graph:** owns strategic creative truth.
- **Capability Router / Context Capsules:** owns mutation authority.
- **Implementation workers:** execute bounded changes only.
- **Visual/human review:** owns final creative approval when no calibrated comparative judge is available.

A green build does not self-certify art direction.

## Fail-closed rules

The workflow must stop rather than silently degrade when:

- Forge readiness fails;
- Build Packet generation fails;
- the originality gate blocks production;
- a required Context Capsule cannot be compiled;
- a governed creative PR lacks an execution record;
- the Signature Slice Gate is blocked;
- comparative visual approval is required but no calibrated judge or human approval exists.

## Confidentiality

Full Build Packets and Context Capsules may contain client-specific strategy. They remain in ignored local evidence storage by default.

Only the minimal audit record is intended for version control.

Never place credentials, private customer data, unpublished commercial terms, or secrets into an execution record.

## Operator rule

If a user gives a substantial Forge website task, the agent should begin with the full-system pipeline automatically.

The user should not need to say:

- use the reference corpus;
- use Director;
- check prior projects;
- use Type Vault;
- use the camera system;
- use mobile overrides;
- use the Loop Engine;
- use performance doctrine;
- use the signature-slice gate.

Forge is responsible for deciding which of those systems are relevant.

## Verification

Repository governance is checked by:

```bash
npm run forge:execution:audit
npm run agentic:consistency:audit
npm test
```

Pull-request change enforcement runs:

```bash
npm run forge:execution:audit -- --changed
```

The canonical release gate remains:

```bash
npm run verify
```
