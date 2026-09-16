export type RuntimeHealthStatus = "healthy" | "degraded" | "failed" | "unavailable";
export type RuntimeSubsystem = "runtime" | "rendering" | "camera" | "motion" | "assets" | "media" | "interactions" | "webgl";

export interface RuntimeHealthEntry {
  subsystem: RuntimeSubsystem;
  status: RuntimeHealthStatus;
  message?: string;
  updatedAt: number;
  metrics?: Record<string, number | string | boolean>;
}

export interface RuntimeHealthSnapshot {
  status: RuntimeHealthStatus;
  entries: Record<RuntimeSubsystem, RuntimeHealthEntry>;
  errors: Array<{ subsystem: RuntimeSubsystem; message: string; at: number }>;
}

const severity: Record<RuntimeHealthStatus, number> = {
  healthy: 0,
  unavailable: 1,
  degraded: 2,
  failed: 3,
};

const subsystems: RuntimeSubsystem[] = ["runtime", "rendering", "camera", "motion", "assets", "media", "interactions", "webgl"];

function initialEntry(subsystem: RuntimeSubsystem): RuntimeHealthEntry {
  return { subsystem, status: subsystem === "webgl" ? "unavailable" : "healthy", updatedAt: Date.now() };
}

export class RuntimeHealthRegistry {
  private readonly entries = new Map<RuntimeSubsystem, RuntimeHealthEntry>(subsystems.map((id) => [id, initialEntry(id)]));
  private readonly errors: RuntimeHealthSnapshot["errors"] = [];
  private readonly listeners = new Set<(snapshot: RuntimeHealthSnapshot) => void>();

  report(subsystem: RuntimeSubsystem, status: RuntimeHealthStatus, message?: string, metrics?: RuntimeHealthEntry["metrics"]) {
    this.entries.set(subsystem, { subsystem, status, message, metrics, updatedAt: Date.now() });
    if (status === "failed" || status === "degraded") {
      this.errors.push({ subsystem, message: message ?? status, at: Date.now() });
      if (this.errors.length > 50) this.errors.splice(0, this.errors.length - 50);
    }
    this.publish();
  }

  metric(subsystem: RuntimeSubsystem, metrics: RuntimeHealthEntry["metrics"]) {
    const current = this.entries.get(subsystem) ?? initialEntry(subsystem);
    this.entries.set(subsystem, { ...current, metrics: { ...current.metrics, ...metrics }, updatedAt: Date.now() });
    this.publish();
  }

  snapshot(): RuntimeHealthSnapshot {
    const entries = Object.fromEntries(subsystems.map((id) => [id, this.entries.get(id) ?? initialEntry(id)])) as RuntimeHealthSnapshot["entries"];
    const status = subsystems.reduce<RuntimeHealthStatus>((worst, id) => severity[entries[id].status] > severity[worst] ? entries[id].status : worst, "healthy");
    return { status, entries, errors: [...this.errors] };
  }

  subscribe(listener: (snapshot: RuntimeHealthSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  reset() {
    for (const subsystem of subsystems) this.entries.set(subsystem, initialEntry(subsystem));
    this.errors.length = 0;
    this.publish();
  }

  private publish() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

export const runtimeHealth = new RuntimeHealthRegistry();
