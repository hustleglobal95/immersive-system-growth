/** Diagnostic output is not scene input: observing a frame must not request one. */
export interface DemandFrameState {
  progress: number;
  velocity: number;
  direction: number;
  runtimeProgress: number | null;
  runtimeCamera: unknown;
  cameraPreview: unknown;
  pointer: unknown;
  orbit: unknown;
  quality: string;
  reducedMotion: boolean;
  freeCamera: boolean;
  guides: boolean;
  debug: boolean;
  selectedHotspot: string | null;
  retryGeneration: number;
  visualSystems: unknown;
}
const inputs = [
  'progress', 'velocity', 'direction', 'runtimeProgress', 'runtimeCamera',
  'cameraPreview', 'pointer', 'orbit', 'quality', 'reducedMotion', 'freeCamera',
  'guides', 'debug', 'selectedHotspot', 'retryGeneration', 'visualSystems',
] as const satisfies readonly (keyof DemandFrameState)[];

export function needsDemandFrame(next: DemandFrameState, previous: DemandFrameState): boolean {
  return inputs.some(key => !Object.is(next[key], previous[key]));
}
