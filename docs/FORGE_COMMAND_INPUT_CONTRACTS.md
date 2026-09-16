# Forge Command Input Contracts

Every AI-visible Forge command publishes a machine-readable input contract through the command catalog.

```bash
npm run forge:catalog -- --agent-only
```

The catalog now answers three questions before an agent generates a mutation:

1. **May I execute this command?** — approval / impact / agent visibility.
2. **What exactly does it accept?** — required fields, types, enums and bounds.
3. **What does it mean?** — command and field descriptions.

## Contract format

Forge uses a deliberately small JSON-safe schema subset instead of requiring an agent to understand TypeScript internals.

Supported field types:

```text
string
number
integer
boolean
enum
object
```

A command schema declares:

```text
type: object
properties
required
allowAdditionalProperties
```

Field contracts may additionally declare:

```text
minLength / maxLength
pattern
minimum / maximum
enum values
description
```

## Validation order

Registered command input is validated by `CommandRegistry` before the domain/platform command factory receives it.

Invalid input becomes a normal Forge command validation failure. It therefore uses the same atomic execution path as all other failures:

- no project mutation;
- no revision increment;
- no undo entry;
- no command journal entry;
- structured error code + path.

Example errors:

```text
command.input.required
command.input.unknownField
command.input.string
command.input.number
command.input.integer
command.input.minimum
command.input.maximum
command.input.minLength
command.input.maxLength
command.input.pattern
command.input.enum
command.input.object
```

## Unknown fields

Command objects reject unknown fields by default.

This protects against prompt drift and typos such as:

```json
{
  "sceneId": "arrival",
  "toIndx": 4
}
```

Forge rejects `toIndx`; it does not silently ignore it and then invent a default destination.

## Catalog synchronization

Motion and camera enum contracts are generated directly from the actual Forge catalogs:

- `motionArchetypeCatalog`
- `cameraChoreographyCatalog`

When a registered archetype is added to those catalogs, the machine-readable command contract automatically exposes it.

## Audit rule

`npm run command:catalog:audit` is part of `npm run check` and requires every `agentVisible` command to publish an input schema.

The audit also confirms:

- every required field exists in `properties`;
- enums contain at least one legal value;
- string/number/integer fields include agent-facing descriptions;
- command safety classification remains valid.

## Agent flow

A production agent should:

1. inspect `forge:catalog -- --agent-only`;
2. choose command types from that catalog;
3. construct inputs strictly from each command's `inputSchema`;
4. dry-run significant transactions;
5. correct structured input/schema errors rather than guessing/coercing values;
6. obtain approval when the command policy requires it;
7. commit against the expected revision;
8. retain receipt + journal evidence.

The catalog is the supported machine interface. Agents should not infer command arguments by scraping source files or by copying stale examples from prompts.
