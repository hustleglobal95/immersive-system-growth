export interface ForgeEvent<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload;
  at: number;
  transactionId?: string;
}

export type ForgeEventHandler<TEvent extends ForgeEvent = ForgeEvent> = (event: TEvent) => void;

export class ForgeEventBus {
  private readonly listeners = new Map<string, Set<ForgeEventHandler>>();
  private readonly all = new Set<ForgeEventHandler>();

  on<TEvent extends ForgeEvent>(type: TEvent["type"], handler: ForgeEventHandler<TEvent>) {
    const listeners = this.listeners.get(type) ?? new Set<ForgeEventHandler>();
    listeners.add(handler as ForgeEventHandler);
    this.listeners.set(type, listeners);
    return () => listeners.delete(handler as ForgeEventHandler);
  }

  onAny(handler: ForgeEventHandler) {
    this.all.add(handler);
    return () => this.all.delete(handler);
  }

  emit<TEvent extends ForgeEvent>(event: TEvent) {
    for (const handler of this.listeners.get(event.type) ?? []) handler(event);
    for (const handler of this.all) handler(event);
  }

  clear() {
    this.listeners.clear();
    this.all.clear();
  }
}

export function forgeEvent<TType extends string, TPayload>(type: TType, payload: TPayload, transactionId?: string): ForgeEvent<TType, TPayload> {
  return { type, payload, at: Date.now(), transactionId };
}
