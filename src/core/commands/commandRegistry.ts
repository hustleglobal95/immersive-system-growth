import type { CommandContext, CommandError, CommandResult, ForgeCommand } from "@/src/core/commands/command";
import { commandFailure } from "@/src/core/commands/command";
import type { ForgeCommandDescriptor, ForgeCommandDescriptorInput } from "@/src/core/commands/commandDescriptor";
import { conservativeCommandDescriptor } from "@/src/core/commands/commandDescriptor";
import { validateCommandInput } from "@/src/core/commands/inputSchema";

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
    const descriptor = this.descriptors.get(type);
    if (!factory || !descriptor) throw new Error(`Unknown Forge command: ${type}`);
    if (!descriptor.inputSchema) return factory(input);

    const validation = validateCommandInput(descriptor.inputSchema, input);
    if (!validation.ok) {
      return new InvalidInputCommand<TState>(type, input, validation.issues);
    }
    return factory(validation.value);
  }

  validateInput(type: string, input: unknown) {
    const descriptor = this.descriptors.get(type);
    if (!descriptor) throw new Error(`Unknown Forge command: ${type}`);
    return validateCommandInput(descriptor.inputSchema, input);
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

class InvalidInputCommand<TState> implements ForgeCommand<TState, unknown, never> {
  readonly input: unknown;
  private readonly errors: CommandError[];

  constructor(readonly type: string, input: unknown, issues: Array<{ code: string; message: string; path: string }>) {
    this.input = structuredClone(input);
    this.errors = issues.map((issue) => ({ ...issue }));
  }

  validate(_context: CommandContext<TState>) {
    return structuredClone(this.errors);
  }

  execute({ state }: CommandContext<TState>): CommandResult<TState, never> {
    const first = this.errors[0] ?? { code: "command.input.invalid", message: "Command input is invalid." };
    return commandFailure(state, first.code, first.message, { issues: this.errors });
  }
}
