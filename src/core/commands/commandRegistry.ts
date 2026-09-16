import type { ForgeCommand } from "@/src/core/commands/command";
import type { ForgeCommandDescriptor, ForgeCommandDescriptorInput } from "@/src/core/commands/commandDescriptor";
import { conservativeCommandDescriptor } from "@/src/core/commands/commandDescriptor";

export type CommandFactory<TState> = (input: unknown) => ForgeCommand<TState, unknown, unknown>;

export class CommandRegistry<TState> {
  private readonly factories = new Map<string, CommandFactory<TState>>();
  private readonly descriptors = new Map<string, ForgeCommandDescriptor>();

  register(type: string, factory: CommandFactory<TState>, descriptor?: ForgeCommandDescriptorInput) {
    if (!type.trim()) throw new Error("Command type cannot be empty.");
    if (this.factories.has(type)) throw new Error(`Command ${type} is already registered.`);
    this.factories.set(type, factory);
    this.descriptors.set(type, descriptor ? { type, ...descriptor } : conservativeCommandDescriptor(type));
    return this;
  }

  has(type: string) {
    return this.factories.has(type);
  }

  create(type: string, input: unknown) {
    const factory = this.factories.get(type);
    if (!factory) throw new Error(`Unknown Forge command: ${type}`);
    return factory(input);
  }

  describe(type: string): ForgeCommandDescriptor {
    const descriptor = this.descriptors.get(type);
    if (!descriptor) throw new Error(`Unknown Forge command: ${type}`);
    return structuredClone(descriptor);
  }

  catalog(options: { agentVisibleOnly?: boolean } = {}) {
    return [...this.descriptors.values()]
      .filter((descriptor) => !options.agentVisibleOnly || descriptor.agentVisible)
      .sort((left, right) => left.type.localeCompare(right.type))
      .map((descriptor) => structuredClone(descriptor));
  }

  list() {
    return [...this.factories.keys()].sort();
  }
}
