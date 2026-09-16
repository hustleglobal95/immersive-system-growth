# Forge Revisioned Command Protocol

ForgeEngine mutations are revisioned, fingerprinted and journaled so Studio, CLI tools and AI agents can share one auditable mutation protocol.

## Guarantees

Every committed command transaction:

- validates command input and project invariants before commit;
- commits atomically or leaves the project unchanged;
- advances the engine revision exactly once;
- records deterministic before/after state fingerprints;
- returns a mutation receipt;
- records affected IDs and emitted event types;
- writes a replayable journal entry;
- can be protected by `expectedRevision` optimistic concurrency.

Dry-runs project the resulting state/fingerprint without advancing revision, history or journal state.

## Optimistic concurrency

Callers should read the current revision, then submit it with the intended mutation:

```ts
const snapshot = engine.snapshot();
const result = engine.transactionRegistered(commands, {
  expectedRevision: snapshot.revision,
  source: "ai",
  actor: "creative-director-agent",
});
```

If another mutation commits first, Forge rejects the stale write with:

```text
engine.revision.conflict
```

No partial state change or journal entry is produced.

## Mutation receipt

Successful and rejected mutations return a receipt containing:

- revision before/after;
- fingerprint before/after;
- transaction ID;
- actor/source metadata;
- affected entity IDs;
- emitted event types;
- errors when rejected;
- dry-run status.

Receipts are intended for agent logs, Studio diagnostics, build evidence and automation reports.

## State fingerprints

`stateFingerprint()` canonicalizes object keys before hashing, so semantically identical JSON-like state produces the same fingerprint regardless of property insertion order.

The fingerprint is an integrity/change-detection value, not a cryptographic signature.

## Journal

`engine.getJournal()` returns ordered mutation entries. Transaction entries preserve the registered command type/input records needed for deterministic replay. Undo, redo, state replacement and checkpoint restore entries preserve the resulting snapshot because those operations are state-control actions rather than normal domain commands.

A journal entry contains:

```text
sequence
operation
revisionBefore
revisionAfter
fingerprintBefore
fingerprintAfter
transactionId
actor/source
commands or snapshot
events
createdAt
```

## Replay

Use `replayForgeJournal()` or:

```bash
npm run forge:replay -- \
  --input config/experience.json \
  --journal .forge/run-journal.json
```

Replay fails closed when:

- revision ordering is broken;
- the starting state fingerprint does not match;
- a command is unavailable;
- command/invariant validation fails;
- the replayed output fingerprint differs from the recorded fingerprint.

## Checkpoints

Create a checkpoint before a large autonomous operation:

```ts
const checkpoint = engine.createCheckpoint("Before architectural rebuild");
```

A checkpoint contains the full state, revision and fingerprint. Checkpoint integrity is verified before restore.

A checkpoint can also be used as the base for a later journal window. This prevents a long-running project from requiring its complete lifetime command history for every replay.

CLI example:

```bash
npm run forge:command -- \
  --checkpoint .forge/checkpoint-r20.json \
  --commands .forge/commands.json \
  --expected-revision 20 \
  --actor claude-production-agent \
  --source ai \
  --output .forge/experience-r21.json \
  --journal-output .forge/journal-r20-r21.json \
  --checkpoint-output .forge/checkpoint-r21.json
```

Then verify independently:

```bash
npm run forge:replay -- \
  --checkpoint .forge/checkpoint-r20.json \
  --journal .forge/journal-r20-r21.json
```

## AI operating rule

For substantial autonomous changes:

1. acquire current state + revision;
2. create/retain a checkpoint;
3. dry-run the intended transaction;
4. inspect validation/errors and projected fingerprint;
5. commit with `expectedRevision`;
6. retain the mutation receipt and journal;
7. replay the journal as an independent integrity check before publish or handoff.

AI must never respond to `engine.revision.conflict` by blindly retrying against a newer revision. It must re-read the current project, reconcile the newer state, regenerate the intended command transaction, and then submit against the new revision.
