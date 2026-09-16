export interface VersionedProject {
  schemaVersion: number;
  [key: string]: unknown;
}

export type Migration<T extends VersionedProject = VersionedProject> = (input: T) => T;

export class MigrationRegistry<T extends VersionedProject = VersionedProject> {
  private readonly steps = new Map<number, Migration<T>>();

  constructor(readonly currentVersion: number) {
    if (!Number.isInteger(currentVersion) || currentVersion < 1) throw new Error("Current schema version must be a positive integer.");
  }

  register(fromVersion: number, migration: Migration<T>) {
    if (fromVersion < 1 || fromVersion >= this.currentVersion)
      throw new Error(`Migration source version ${fromVersion} must be between 1 and ${this.currentVersion - 1}.`);
    if (this.steps.has(fromVersion)) throw new Error(`Migration from version ${fromVersion} is already registered.`);
    this.steps.set(fromVersion, migration);
    return this;
  }

  migrate(input: T) {
    const original = structuredClone(input);
    if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1)
      throw new Error("Project schemaVersion must be a positive integer.");
    if (input.schemaVersion > this.currentVersion)
      throw new Error(`Project schema ${input.schemaVersion} is newer than supported schema ${this.currentVersion}.`);

    let value = structuredClone(input);
    const applied: number[] = [];
    try {
      while (value.schemaVersion < this.currentVersion) {
        const from = value.schemaVersion;
        const migration = this.steps.get(from);
        if (!migration) throw new Error(`Missing migration from schema version ${from}.`);
        const next = migration(structuredClone(value));
        if (next.schemaVersion !== from + 1)
          throw new Error(`Migration from ${from} must produce schemaVersion ${from + 1}, received ${next.schemaVersion}.`);
        value = next;
        applied.push(from);
      }
      return { project: value, applied };
    } catch (error) {
      return { project: original, applied: [], error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
