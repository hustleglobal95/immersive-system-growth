# Forge Agent Command Safety Policy

Forge commands are self-describing. Every registered command declares its purpose, impact, reversibility, AI visibility and approval requirement.

This policy separates two concerns:

1. **what Forge can do**;
2. **what an autonomous/headless actor may commit without human approval**.

The goal is to let AI move quickly on reversible creative direction while making destructive changes explicit, reviewable and auditable.

## Command metadata

Each command declares:

```text
type
label
description
category
impact
approval
reversible
agentVisible
```

### Impact

- `local` — primarily changes one scene/system target.
- `project` — changes project-wide structure or ordering.
- `destructive` — removes or replaces authored project state.
- `external` — would affect an external system or irreversible delivery boundary.

### Approval level

- `auto` — headless AI/CLI may commit without separate approval.
- `review` — headless commit requires an explicit approval record.
- `required` — headless commit requires an explicit approval record and should be treated as a deliberate destructive/critical operation.

`review` and `required` currently enforce the same engine gate. The distinction is retained in metadata so Studio and future agent supervisors can present different UX/severity.

## Conservative defaults

A newly registered command without explicit metadata becomes:

```text
category: unclassified
impact: project
approval: required
reversible: false
agentVisible: false
```

`npm run command:catalog:audit` fails when a production Experience command remains unclassified.

This prevents new capabilities from silently becoming autonomous AI actions.

## Current Experience command policy

### Autonomous

The following operations are classified as reversible creative/structural work and may be committed by AI without separate approval:

- `scene.add`
- `scene.rename`
- `scene.move`
- `scene.duplicate`
- `motion.applyArchetype`
- `camera.applyChoreography`

### Approval-gated

The following require explicit approval for AI/CLI commits:

- `scene.delete` — required
- `motion.resetScene` — review
- `experience.replace` — required

The policy is enforced before command execution, so a mixed transaction containing one unapproved protected command fails atomically. Earlier safe commands in the same transaction do not partially commit.

## Dry-run rule

Protected commands may be dry-run without approval.

This is intentional. An agent should be able to:

1. propose the destructive operation;
2. dry-run it;
3. show projected state/fingerprint/affected entities;
4. request human approval;
5. commit the exact command against the expected revision.

Dry-run never advances revision, history or journal state.

## Human Studio behavior

Explicit human Studio interactions are not blocked by the headless approval gate.

The approval policy targets headless sources such as:

- `ai`
- `cli`
- custom automation sources

A human clicking Delete in Studio is already an explicit direct action. Studio may add its own confirmation UX for destructive operations, but ForgeEngine does not require a separate headless approval record for `source: "studio"`.

## Approval record

A protected headless commit uses:

```ts
approval: {
  by: "Approver name",
  commandTypes: ["scene.delete"],
  reason: "Remove redundant transition chapter"
}
```

The approval must list every protected command type in the transaction.

Approved command types are normalized/deduplicated before being written into:

- the mutation receipt;
- the Forge command journal.

The journal also timestamps the approval when the engine commits it.

## CLI

Inspect the current catalog:

```bash
npm run forge:catalog
```

Only AI-visible commands:

```bash
npm run forge:catalog -- --agent-only
```

Dry-run a protected command without approval:

```bash
npm run forge:command -- \
  --commands .forge/delete-scene.json \
  --source ai \
  --actor production-agent \
  --dry-run
```

Commit after approval:

```bash
npm run forge:command -- \
  --commands .forge/delete-scene.json \
  --source ai \
  --actor production-agent \
  --expected-revision 14 \
  --approve scene.delete \
  --approved-by Kevin \
  --approval-reason "Remove redundant scene"
```

## Catalog audit rules

`command:catalog:audit` fails when:

- a command is unclassified;
- a command has no description;
- a destructive/external command is `auto`;
- an agent-visible `auto` command is not reversible.

The audit is part of `npm run check`.

## Agent operating rules

An autonomous agent should:

1. inspect `forge:catalog` before planning commands;
2. use only `agentVisible` commands;
3. group reversible related changes into one transaction;
4. use dry-run before significant structural changes;
5. never fabricate an approval record;
6. request approval only for the exact protected command types it intends to commit;
7. retain the receipt and journal after approval-gated execution;
8. re-read and reconcile state after revision conflicts rather than blindly retrying.

The command policy is a control plane around Forge's capabilities, not a substitute for schema validation, invariants, performance gates or visual QA. Those layers continue to apply after policy authorization.
