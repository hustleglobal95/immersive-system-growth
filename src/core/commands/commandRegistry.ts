import type { ForgeCommand } from "@/src/core/commands/command";

export type CommandFactory<TState> = (input: unknown) => ForgeCommand<TState, unknown, unknown>;

export class CommandRegistry<TState> {
  private readonly factories = new Map<string, CommandFactory<TState>>();

  register(type: string, factory: CommandFactory<TState>) {
    if (!type.trim()) throw new Error("Command type cannot be empty.");
    if (this.factories.has(type)) throw new Error(`Command ${type} is already registered.`);
    this.factories.set(type, factory);
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

  list() {
    return [...this.factories.keys()].sort();
  }
}
