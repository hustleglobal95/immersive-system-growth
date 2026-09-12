import { sampleExperience } from "@/src/lib/sampleExperience";
import type { ExperienceConfig, Vec3 } from "@/src/types/experience";

export interface CameraDiagnostic {
  level: "error" | "warning";
  sceneId: string;
  viewport: "desktop" | "mobile";
  message: string;
}

export function auditCameraMotion(config: ExperienceConfig, samplesPerScene = 56): CameraDiagnostic[] {
  const diagnostics: CameraDiagnostic[] = [];
  const sampleCount = Math.max(12, Math.min(240, Math.round(samplesPerScene)));
  for (const [viewport, aspect] of [["desktop", 16 / 9], ["mobile", 9 / 16]] as const) {
    for (const scene of config.scenes) {
      const states = Array.from({ length: sampleCount + 1 }, (_, index) => {
        const local = index / sampleCount;
        const raw = scene.range[0] + (scene.range[1] - scene.range[0]) * local;
        const progress = index === sampleCount && scene.range[1] < 1 ? scene.range[1] - 1e-9 : raw;
        return sampleExperience(progress, false, config, aspect).camera;
      });
      const stepDistances: number[] = [];
      let maxViewTurn = 0;
      let maxFovStep = 0;
      for (let index = 0; index < states.length; index += 1) {
        const state = states[index];
        if (![...state.position, ...state.target, state.fov].every(Number.isFinite)) {
          diagnostics.push({ level: "error", sceneId: scene.id, viewport, message: `Non-finite camera state at sample ${index}/${sampleCount}.` });
          break;
        }
        const focusDistance = distance(state.position, state.target);
        if (focusDistance < 0.02) {
          diagnostics.push({ level: "error", sceneId: scene.id, viewport, message: `Camera nearly intersects its look-at target (${focusDistance.toFixed(4)} world units).` });
          break;
        }
        if (index === 0) continue;
        stepDistances.push(distance(states[index - 1].position, state.position));
        maxViewTurn = Math.max(maxViewTurn, angleBetween(viewDirection(states[index - 1].position, states[index - 1].target), viewDirection(state.position, state.target)));
        maxFovStep = Math.max(maxFovStep, Math.abs(states[index - 1].fov - state.fov));
      }
      const moving = stepDistances.filter((value) => value > 0.00001).sort((a, b) => a - b);
      if (moving.length >= 8) {
        const median = moving[Math.floor(moving.length / 2)];
        const high = moving[Math.min(moving.length - 1, Math.floor(moving.length * 0.95))];
        if (median > 0.00001 && high / median > 5.5) {
          diagnostics.push({ level: "warning", sceneId: scene.id, viewport, message: `Camera travel has a ${(high / median).toFixed(1)}× p95/median speed spike. Consider retiming or an arc-length path.` });
        }
      }
      if (maxViewTurn > 14) {
        diagnostics.push({ level: "warning", sceneId: scene.id, viewport, message: `View direction changes by up to ${maxViewTurn.toFixed(1)}° between adjacent audit samples.` });
      }
      if (maxFovStep > 5) {
        diagnostics.push({ level: "warning", sceneId: scene.id, viewport, message: `Lens changes by up to ${maxFovStep.toFixed(1)}° between adjacent audit samples.` });
      }
    }
  }
  return diagnostics;
}

function viewDirection(position: Vec3, target: Vec3): Vec3 {
  const vector: Vec3 = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
  const length = Math.hypot(...vector);
  return length > 0.000001 ? [vector[0] / length, vector[1] / length, vector[2] / length] : [0, 0, -1];
}

function angleBetween(a: Vec3, b: Vec3) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * 180 / Math.PI;
}

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
