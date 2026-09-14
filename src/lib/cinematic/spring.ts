import type { SpringConfig } from "@/src/lib/cinematic/schema";

export interface SpringState { value: number; velocity: number }

export function stepSpring(state: SpringState, target: number, deltaSeconds: number, config: SpringConfig): SpringState {
  let value = state.value;
  let velocity = state.velocity;
  let remaining = Math.max(0, deltaSeconds);
  const maxStep = Math.max(1 / 240, config.maxStep);
  while (remaining > 0) {
    const step = Math.min(maxStep, remaining);
    const displacement = value - target;
    const acceleration = (-config.stiffness * displacement - config.damping * velocity) / config.mass;
    velocity += acceleration * step;
    value += velocity * step;
    remaining -= step;
  }
  if (Math.abs(target - value) <= config.precision && Math.abs(velocity) <= config.precision) return { value: target, velocity: 0 };
  return { value, velocity };
}

export class SpringValue {
  private state: SpringState;
  constructor(value = 0) { this.state = { value, velocity: 0 }; }
  get value() { return this.state.value; }
  get velocity() { return this.state.velocity; }
  snap(value: number) { this.state = { value, velocity: 0 }; }
  step(target: number, deltaSeconds: number, config: SpringConfig) {
    this.state = stepSpring(this.state, target, deltaSeconds, config);
    return this.state.value;
  }
}
