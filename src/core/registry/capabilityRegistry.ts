export interface ForgeCapability {
  id: string;
  version: number;
  commands?: readonly string[];
  validators?: readonly string[];
  runtimeSystems?: readonly string[];
  studioAdapters?: readonly string[];
  metadata?: Record<string, unknown>;
}

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, ForgeCapability>();

  register(capability: ForgeCapability) {
    if (!capability.id.trim()) throw new Error("Capability id cannot be empty.");
    if (!Number.isInteger(capability.version) || capability.version < 1)
      throw new Error(`Capability ${capability.id} must have a positive integer version.`);
    const current = this.capabilities.get(capability.id);
    if (current && current.version > capability.version)
      throw new Error(`Cannot register older ${capability.id} capability version ${capability.version}; current is ${current.version}.`);
    this.capabilities.set(capability.id, Object.freeze({ ...capability }));
    return capability;
  }

  get(id: string) {
    return this.capabilities.get(id);
  }

  has(id: string) {
    return this.capabilities.has(id);
  }

  list() {
    return [...this.capabilities.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  clear() {
    this.capabilities.clear();
  }
}
