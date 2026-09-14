export type TickerCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

class ForgeTicker {
  private callbacks = new Set<TickerCallback>();
  private frame = 0;
  private previous = 0;
  private elapsed = 0;

  subscribe(callback: TickerCallback) {
    this.callbacks.add(callback);
    this.ensureRunning();
    return () => {
      this.callbacks.delete(callback);
      if (!this.callbacks.size) this.stop();
    };
  }

  private ensureRunning() {
    if (typeof window === "undefined" || this.frame) return;
    this.previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.1, Math.max(0, (now - this.previous) / 1000));
      this.previous = now;
      this.elapsed += delta;
      for (const callback of this.callbacks) callback(delta, this.elapsed);
      this.frame = this.callbacks.size ? requestAnimationFrame(tick) : 0;
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stop() {
    if (this.frame && typeof window !== "undefined") cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}

export const forgeTicker = new ForgeTicker();
